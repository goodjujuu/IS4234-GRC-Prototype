const { createHash } = require('crypto');

// Tamper-evident, append-only change log. Each entry's hash covers its own content
// plus the previous entry's hash, so editing or deleting any past entry breaks every
// link after it. CommonJS so prisma/seed.js writes the same chain as the app.

function entryHash({ seq, prevHash, event, change, changedBy, signedOffBy, createdAt }) {
  const payload = [seq, prevHash || 'GENESIS', event, change, changedBy, signedOffBy || '', new Date(createdAt).toISOString()].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

async function appendLogEntry(prisma, { event, change, changedBy, signedOffBy = null, createdAt }) {
  const last = await prisma.configChangeLog.findFirst({ orderBy: { seq: 'desc' } });
  const seq = last ? last.seq + 1 : 1;
  const prevHash = last ? last.hash : null;
  const hash = entryHash({ seq, prevHash, event, change, changedBy, signedOffBy, createdAt });
  return prisma.configChangeLog.create({ data: { seq, event, change, changedBy, signedOffBy, prevHash, hash, createdAt } });
}

// Recompute every hash and check every link. Returns the entries with per-entry
// results and the first broken entry's position, if any.
async function verifyChain(prisma) {
  const entries = await prisma.configChangeLog.findMany({ orderBy: { seq: 'asc' } });
  let previousHash = null;
  let firstBroken = null;
  const checked = entries.map((e, i) => {
    const linkOk = (e.prevHash || null) === previousHash && e.seq === i + 1;
    const hashOk = e.hash === entryHash(e);
    if ((!linkOk || !hashOk) && firstBroken === null) firstBroken = e.seq;
    previousHash = e.hash;
    return { ...e, linkOk, hashOk };
  });
  return { intact: firstBroken === null, firstBroken, entries: checked };
}

module.exports = { entryHash, appendLogEntry, verifyChain };
