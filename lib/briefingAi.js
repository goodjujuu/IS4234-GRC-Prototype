import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You write the cause summary in a bank conduct risk team's morning briefing, as a draft a reviewer confirms or corrects.
You receive synthetic monitoring facts as JSON. Write at most three plain-language sentences for a busy reviewer: what changed, the most likely cause, and what a human should check.
Use only the facts given and do not invent numbers. Do not use colons or semicolons.`;

// Returns the model's summary, or null when no key is configured or the call fails, so
// the page can fall back to the labelled simulated summary. Only aggregate facts are
// sent, never employee names.
export async function aiSummary(facts) {
  if (!process.env.ANTHROPIC_API_KEY) return { text: null, reason: 'No ANTHROPIC_API_KEY is configured.' };
  const aggregate = {
    newHighCount: facts.newHigh.length,
    newMediumCount: facts.newMedium.length,
    overdueReviews: facts.overdue.length,
    thresholdChangeAttempts: facts.thresholdAttempts.length,
    risingBranches: facts.rising.map(({ code, index, previous, level, previousLevel }) => ({ branch: code, pressureIndex: index, previousPressureIndex: previous, level, previousLevel })),
    cause: facts.cause,
    pressureFlagged: facts.pressureFlagged.map(({ code, index }) => ({ branch: code, index })),
  };
  try {
    const client = new Anthropic({ timeout: 25000, maxRetries: 0 });
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(aggregate) }],
    });
    if (response.stop_reason === 'refusal') return { text: null, reason: 'The model declined this request.' };
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return text ? { text } : { text: null, reason: 'The model returned no text.' };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { text: null, reason: 'The API key was rejected.' };
    if (error instanceof Anthropic.RateLimitError) return { text: null, reason: 'The model is rate limited.' };
    if (error instanceof Anthropic.APIError) return { text: null, reason: `The model call failed (${error.status ?? 'connection error'}).` };
    throw error;
  }
}
