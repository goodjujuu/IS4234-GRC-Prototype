import { NextResponse } from 'next/server';
import { canActOnCase } from '@/lib/access';
import { loadConfig, notifyUser, raiseWatcherAlert, tick } from '@/lib/engine';
import { OUTCOMES, outcomesFor } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Case actions. Routing rules are enforced here, and every change appends a CaseEvent.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await apiUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const { action, note = '', assignee, outcome, reason = '' } = await request.json();

  const c = await prisma.case.findUnique({ where: { id }, include: { disputes: true } });
  if (!c) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  if (!canActOnCase(user, c)) {
    return NextResponse.json({ error: c.status === 'CLOSED' ? 'This case is closed.' : 'This case is routed to another reviewer, so you cannot act on it.' }, { status: 403 });
  }

  const now = await tick(prisma);
  const firstActionAt = c.firstActionAt || now;
  const event = (name, text, extra) => ({ create: [{ action: name, actor: user.name, note: text, timestamp: now, ...extra }] });

  if (action === 'assign') {
    const name = String(assignee || user.name).trim();
    await prisma.case.update({ where: { id }, data: { assignee: name, firstActionAt, events: event('ASSIGNED', `Assigned to ${name}.`) } });
    return NextResponse.json({ message: `Assigned to ${name}.` });
  }

  if (action === 'start') {
    await prisma.case.update({ where: { id }, data: { status: 'IN_REVIEW', assignee: c.assignee || user.name, firstActionAt, events: event('REVIEW_STARTED', note || 'Review started.') } });
    return NextResponse.json({ message: 'Review started.' });
  }

  if (action === 'note') {
    if (note.trim().length < 3) return NextResponse.json({ error: 'Write a note first.' }, { status: 400 });
    await prisma.case.update({ where: { id }, data: { firstActionAt, events: event('NOTE', note.trim()) } });
    return NextResponse.json({ message: 'Note added to the audit trail.' });
  }

  if (action === 'close') {
    if (!outcomesFor(c.kind).some((o) => o.value === outcome)) return NextResponse.json({ error: 'Choose an outcome that applies to this type of case.' }, { status: 400 });
    if (reason.trim().length < 10) return NextResponse.json({ error: 'Give a reason of at least 10 characters. A case cannot be closed without one.' }, { status: 400 });
    if (c.disputes.some((d) => d.type === 'DISPUTE' && d.status === 'OPEN')) {
      return NextResponse.json({ error: 'You must consider the employee\'s dispute and decide it before closing this case.' }, { status: 409 });
    }
    await prisma.case.update({
      where: { id },
      data: {
        status: 'CLOSED', outcome, closeReason: reason.trim(), assignee: c.assignee || user.name, firstActionAt, closedAt: now,
        events: event('CLOSED', `${OUTCOMES[outcome]}. ${reason.trim()}`),
      },
    });

    // Warning sign: one reviewer clearing many cases in an hour may not be really checking.
    const config = await loadConfig(prisma);
    const recent = await prisma.caseEvent.count({ where: { action: 'CLOSED', actor: user.name, timestamp: { gt: new Date(now.getTime() - 3600000), lte: now } } });
    let alerted = false;
    if (recent >= config.fast_review_count) {
      const title = `Unusually fast reviews by ${user.name}`;
      if (!(await prisma.watcherAlert.findFirst({ where: { type: 'FAST_REVIEWS', title, createdAt: { gt: new Date(now.getTime() - 3600000) } } }))) {
        alerted = true;
        await raiseWatcherAlert(prisma, {
          type: 'FAST_REVIEWS',
          severity: 'MEDIUM',
          title,
          detail: `${user.name} closed ${recent} cases within one hour. Flags may be being dismissed without real checks.`,
          createdAt: now,
        });
      }
    }
    if (c.employeeId) {
      const subject = await prisma.user.findFirst({ where: { employeeId: c.employeeId, role: 'EMPLOYEE' } });
      if (subject) await notifyUser(prisma, subject.id, { title: `${c.ref} was closed`, body: `Outcome: ${OUTCOMES[outcome]}. ${reason.trim()} If you disagree, you can appeal to the audit committee.`, link: '/me/disputes', createdAt: now });
    }
    return NextResponse.json({ message: alerted ? 'Case closed. That is an unusually fast pace of reviews, so internal audit was alerted.' : outcome === 'TARGET_REVIEW' ? 'Case closed. The target has been sent for adjustment.' : 'Case closed.' });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
