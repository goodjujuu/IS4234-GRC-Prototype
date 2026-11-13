import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { HOME_BY_ROLE, startSession } from '@/lib/session';

export async function POST(request) {
  const { email, password } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: String(email || '').trim().toLowerCase() } });
  if (!user || !Object.hasOwn(HOME_BY_ROLE, user.role) || !verifyPassword(String(password || ''), user.passwordHash)) {
    return NextResponse.json({ error: 'That email and password do not match a demo account.' }, { status: 401 });
  }
  await startSession(user.id);
  return NextResponse.json({ redirect: HOME_BY_ROLE[user.role] });
}
