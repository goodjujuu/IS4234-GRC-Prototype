import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

export async function POST() {
  const { user, error } = await apiUser();
  if (error) return error;
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
