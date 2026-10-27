import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DEMO ONLY — simulates someone with database access quietly editing a past
// control-log entry (bypassing the app and its sign-off). The hash chain
// should catch it on the next verification.
export async function POST() {
  const entries = await prisma.configChangeLog.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  if (entries.length === 0) return NextResponse.json({ error: 'The log is empty.' }, { status: 409 });

  const target = entries.length > 1 ? entries[entries.length - 2] : entries[0];
  const edited = /\d+%/.test(target.change)
    ? target.change.replace(/(\d+)%(?!.*\d+%)/, (_, n) => `${Number(n) + 30}%`)
    : `${target.change} (amended)`;

  const updated = await prisma.configChangeLog.update({ where: { id: target.id }, data: { change: edited } });
  return NextResponse.json({ before: target.change, after: updated.change, seq: entries.indexOf(target) + 1 });
}
