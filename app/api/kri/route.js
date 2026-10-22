import { NextResponse } from 'next/server';
import { getKriSummary } from '@/lib/kri';

export const dynamic = 'force-dynamic';

// Board Risk & Audit Committee conduct KRI dashboard — M7's primary output.
export async function GET() {
  const summary = await getKriSummary();
  return NextResponse.json(summary);
}
