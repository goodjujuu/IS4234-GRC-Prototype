import { NextResponse } from 'next/server';
import { checkUnexpectedChanges, getNow } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Compare live settings with the fixed baseline and alert internal audit to differences.
export async function POST() {
  const { error } = await apiUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const now = await getNow(prisma);
  const unexpected = await checkUnexpectedChanges(prisma, now);
  if (unexpected.length) {
    return NextResponse.json({ error: `${unexpected.length} setting(s) differ from the fixed baseline. Internal audit has been alerted.` }, { status: 409 });
  }
  return NextResponse.json({ message: 'All clear. Every setting matches the fixed baseline.' });
}
