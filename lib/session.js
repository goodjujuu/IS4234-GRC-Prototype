import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Demo-grade role-based access: a signed cookie naming the user. Server-side checks
// live here so a page or route cannot be reached by hiding a link alone.
const COOKIE = 'cg_session';
const SECRET = process.env.SESSION_SECRET || 'conductguard-demo-secret';

function sign(userId) {
  return createHmac('sha256', SECRET).update(userId).digest('hex');
}

export async function startSession(userId) {
  const store = await cookies();
  store.set(COOKIE, `${userId}.${sign(userId)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
}

export async function endSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getUser() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, signature] = raw.split('.');
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(signature || '');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { employee: true, branch: true } });
}

export const HOME_BY_ROLE = {
  EMPLOYEE: '/me',
  TEAM_LEAD: '/team',
  CONDUCT_RISK: '/briefing',
  CHIEF_RISK_OFFICER: '/thresholds',
  INTERNAL_AUDIT: '/watchers',
  AUDIT_COMMITTEE: '/committee',
};

export const ADMIN_ROLES = ['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE'];

// For pages: sends anyone without access away instead of showing the page.
export async function requireUser(roles) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (roles && !roles.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}

// For API routes: returns { user } or { error } with the matching status.
export async function apiUser(roles) {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) return { error: NextResponse.json({ error: 'Your role cannot do this.' }, { status: 403 }) };
  return { user };
}
