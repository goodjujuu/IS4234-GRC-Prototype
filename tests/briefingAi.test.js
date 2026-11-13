const { test } = require('node:test');
const assert = require('node:assert/strict');
const { aiSummary } = require('../lib/briefingAi');

const facts = {
  newHigh: [{ name: 'PRIVATE_EMPLOYEE' }], newMedium: [], overdue: [{ title: 'PRIVATE_CASE' }],
  rising: [{ code: 12, index: 74, previous: 60, level: 'HIGH', previousLevel: 'MEDIUM', manager: 'PRIVATE_MANAGER' }],
  cause: { branch: 'Branch 12', unusedBefore: 0.1, unusedAfter: 0.2, targetFrom: 5, targetTo: 12, pctMissing: 0.8, employee: 'PRIVATE_CAUSE' },
  pressureFlagged: [{ code: 12, index: 74, manager: 'PRIVATE_MANAGER' }],
};

function setup(t) {
  const before = { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL };
  process.env.GEMINI_API_KEY = 'test-google-key';
  delete process.env.GEMINI_MODEL;
  t.after(() => {
    if (before.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = before.key;
    if (before.model === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = before.model;
  });
}
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('missing or blank key skips the network', async (t) => {
  setup(t);
  const mock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request'); });
  for (const key of ['', '   ']) {
    process.env.GEMINI_API_KEY = key;
    const result = await aiSummary(facts);
    assert.equal(result.text, null); assert.match(result.reason, /not configured/);
  }
  assert.equal(mock.mock.calls.length, 0);
});

test('sends aggregate facts only and keeps credentials out of the URL and body', async (t) => {
  setup(t);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'test-google-key');
    assert.equal(options.cache, 'no-store'); assert.ok(options.signal);
    assert.doesNotMatch(url + options.body, /test-google-key|PRIVATE_/);
    const body = JSON.parse(options.body);
    const aggregate = JSON.parse(body.contents[0].parts[0].text);
    assert.equal(aggregate.newHighCount, 1); assert.equal(aggregate.overdueReviews, 1);
    assert.deepEqual(aggregate.pressureFlagged, [{ branch: 12, index: 74 }]);
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'low');
    return response({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'Internal reasoning' }, { text: 'Branch 12 needs review.' }] } }] });
  });
  assert.deepEqual(await aiSummary(facts), { text: 'Branch 12 needs review.', model: 'gemini-3.6-flash' });
});

test('supports an explicit model and trims configuration', async (t) => {
  setup(t); process.env.GEMINI_API_KEY = ' test-google-key '; process.env.GEMINI_MODEL = ' gemini-2.5-flash ';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /gemini-2\.5-flash:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'test-google-key');
    assert.equal(JSON.parse(options.body).generationConfig.thinkingConfig.thinkingBudget, 0);
    return response({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Summary.' }] } }] });
  });
  assert.equal((await aiSummary(facts)).model, 'gemini-2.5-flash');
});

test('invalid model configuration never sends credentials to another path', async (t) => {
  setup(t); process.env.GEMINI_MODEL = '../other?key=unsafe';
  const mock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request'); });
  assert.match((await aiSummary(facts)).reason, /model name is invalid/);
  assert.equal(mock.mock.calls.length, 0);
});

for (const [status, details, expected] of [
  [400, [{ reason: 'API_KEY_INVALID' }], /credentials/],
  [403, [], /denied access/], [404, [], /model is unavailable/],
  [429, [], /quota or rate limit/], [402, [], /billing/],
  [400, [], /rejected the request/], [503, [], /temporarily unavailable/],
]) {
  test(`handles HTTP ${status} without exposing raw provider errors`, async (t) => {
    setup(t);
    t.mock.method(globalThis, 'fetch', async () => response({ error: { message: 'PRIVATE_PROVIDER_ERROR', details } }, status));
    const result = await aiSummary(facts);
    assert.equal(result.text, null); assert.match(result.reason, expected);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PROVIDER_ERROR|test-google-key/);
  });
}

for (const [name, body, expected] of [
  ['blocked prompt', { promptFeedback: { blockReason: 'SAFETY' } }, /declined/],
  ['blocked response', { candidates: [{ finishReason: 'SAFETY' }] }, /declined/],
  ['truncated response', { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Incomplete' }] } }] }, /output limit/],
  ['empty response', { candidates: [] }, /no summary text/],
]) {
  test(`falls back for ${name}`, async (t) => {
    setup(t); t.mock.method(globalThis, 'fetch', async () => response(body));
    const result = await aiSummary(facts); assert.equal(result.text, null); assert.match(result.reason, expected);
  });
}

test('falls back for invalid JSON', async (t) => {
  setup(t); t.mock.method(globalThis, 'fetch', async () => new Response('not JSON'));
  assert.match((await aiSummary(facts)).reason, /unreadable response/);
});

for (const name of ['TimeoutError', 'TypeError']) {
  test(`handles ${name} without leaking exception details`, async (t) => {
    setup(t); t.mock.method(globalThis, 'fetch', async () => { const error = new Error('PRIVATE_NETWORK_ERROR'); error.name = name; throw error; });
    const result = await aiSummary(facts);
    assert.match(result.reason, name === 'TimeoutError' ? /timed out/ : /Could not reach/);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_NETWORK_ERROR/);
  });
}
