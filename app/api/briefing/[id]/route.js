import { NextResponse } from 'next/server';
import { tick } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Human in the loop: a reviewer must confirm or correct the AI draft before anyone acts on it.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await apiUser(['CONDUCT_RISK']);
  if (error) return error;
  const { action, summary = '' } = await request.json();
  if (!['confirm', 'correct'].includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  if (action === 'correct' && summary.trim().length < 10) return NextResponse.json({ error: 'Write the corrected summary.' }, { status: 400 });
  const briefing = await prisma.briefing.findUnique({ where: { id } });
  if (!briefing) return NextResponse.json({ error: 'Briefing not found.' }, { status: 404 });
  if (briefing.status !== 'PENDING') return NextResponse.json({ error: 'This draft has already been reviewed.' }, { status: 409 });
  const now = await tick(prisma);
  const corrected = action === 'correct';
  await prisma.briefing.update({
    where: { id },
    data: { status: corrected ? 'CORRECTED' : 'CONFIRMED', summary: corrected ? summary.trim() : briefing.summary, confirmedBy: user.name, confirmedAt: now },
  });
  return NextResponse.json({ message: corrected ? 'Correction saved. It replaces the draft, which is kept for the record.' : 'Draft confirmed. It can now inform action.' });
}
