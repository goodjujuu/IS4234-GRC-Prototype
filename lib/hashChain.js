import { createHash } from 'crypto';

// M7 — Tamper-evident, append-only control log.
// Each entry's hash covers its own content plus the previous entry's hash, so
// editing or deleting any past entry breaks every link after it.

export function entryHash({ prevHash, change, changedBy, signedOffBy, createdAt }) {
  const payload = [prevHash || 'GENESIS', change, changedBy, signedOffBy, new Date(createdAt).toISOString()].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

const CHAIN_ORDER = [{ createdAt: 'asc' }, { id: 'asc' }];

export async function appendLogEntry(prisma, { change, changedBy, signedOffBy }) {
  const last = await prisma.configChangeLog.findFirst({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  const createdAt = new Date();
  const prevHash = last ? last.hash : null;
  const hash = entryHash({ prevHash, change, changedBy, signedOffBy, createdAt });
  return prisma.configChangeLog.create({ data: { change, changedBy, signedOffBy, prevHash, hash, createdAt } });
}

// Recompute every hash and check every link. Returns the entries in order with
// per-entry results, and the first broken entry (1-based), if any.
export async function verifyChain(prisma) {
  const entries = await prisma.configChangeLog.findMany({ orderBy: CHAIN_ORDER });
  let previousHash = null;
  let firstBroken = null;
  const checked = entries.map((e, i) => {
    const linkOk = (e.prevHash || null) === previousHash;
    const hashOk = e.hash === entryHash(e);
    if ((!linkOk || !hashOk) && firstBroken === null) firstBroken = i + 1;
    previousHash = e.hash;
    return { ...e, seq: i + 1, linkOk, hashOk };
  });
  return { intact: firstBroken === null, firstBroken, entries: checked };
}
