import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyChain } from '@/lib/hashChain';

// M7 — recompute the whole hash chain. A broken chain raises a HIGH alert,
// which M6 routes straight to the Chief Risk Officer.
export async function POST() {
  const result = await verifyChain(prisma);
  let alert = null;
  if (!result.intact) {
    const existing = await prisma.conductAlert.findFirst({
      where: { type: 'LOG_TAMPERING_DETECTED', status: { in: ['OPEN', 'ESCALATED'] } },
    });
    if (!existing) {
      alert = await prisma.conductAlert.create({
        data: {
          type: 'LOG_TAMPERING_DETECTED',
          severity: 'HIGH',
          source: 'M7',
          description: `Control log entry #${result.firstBroken} no longer matches its hash: it was changed outside the approved process. Every later entry is now unverifiable.`,
          status: 'OPEN',
        },
      });
    }
  }
  return NextResponse.json({ ...result, alert });
}
