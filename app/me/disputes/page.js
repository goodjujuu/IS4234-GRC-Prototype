import Link from 'next/link';
import { ActionForm } from '@/components/actions';
import { FlagReason } from '@/components/FlagReason';
import Icon from '@/components/Icon';
import { FLAG_RULES, caseIndicators } from '@/components/MyConduct';
import { Badge, Card, EmptyState, PageHeader, RiskBadge, TableWrap, cx, tdClass, thClass } from '@/components/ui';
import { getNow, loadConfig } from '@/lib/engine';
import { OUTCOMES, formatDate, formatDateTime, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getEmployeeRecord } from '@/lib/record';
import { METRICS } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const DISPUTE_TONE = { OPEN: 'amber', UPHELD: 'green', REJECTED: 'neutral' };
const DISPUTE_TEXT = { OPEN: 'With your reviewer', UPHELD: 'Upheld', REJECTED: 'Rejected' };

function Steps({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map(([title, text], i) => (
        <li key={title} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{i + 1}</span>
          <div>
            <p className="text-[13px] font-semibold text-slate-800">{title}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FlagCase({ c, now, thresholds, metricLabel }) {
  const ev = c.evidence;
  const rule = FLAG_RULES[c.riskLevel];
  const levelText = c.riskLevel === 'HIGH' ? 'High' : 'Medium';
  const closed = c.status === 'CLOSED';
  const hasOpenDispute = c.disputes.some((d) => d.status === 'OPEN');
  const appealed = c.disputes.some((d) => d.type === 'APPEAL');
  const canDispute = !closed && !hasOpenDispute;
  const canAppeal = closed && c.outcome !== 'CLEARED' && !appealed;
  const behind = caseIndicators(ev).map(({ metric }) => metric);
  const metricOptions = (behind.length ? behind : METRICS).map((m) => ({ value: m.key, label: m.label }));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-slate-900">Flag {c.ref}</p>
          <RiskBadge level={c.riskLevel} />
          <Badge tone={closed ? 'neutral' : 'blue'}>{closed ? `Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}` : 'Under review'}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-[13px] sm:grid-cols-4">
          {[
            ['Raised', formatDate(ev?.asOf || c.openedAt)],
            ['Score at the time', ev ? `${ev.score} of 100` : 'Not recorded'],
            ['Reviewer', c.assignee || 'Being assigned'],
            [closed ? 'Decided' : 'Decision due', closed ? formatDate(c.closedAt) : formatDateTime(c.deadlineAt), !closed && timeLeft(c.deadlineAt, now)],
          ].map(([k, v, note]) => (
            <div key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{v}</dd>
              {note && <dd className="text-xs text-slate-500">{note}</dd>}
            </div>
          ))}
        </dl>

        <p className="mt-5 text-sm font-semibold text-slate-900">Why you were flagged</p>
        <p className="mb-3 mt-0.5 text-[13px] leading-relaxed text-slate-600">
          Your score reached {ev?.score}, above the {levelText} threshold of {c.riskLevel === 'HIGH' ? thresholds.high : thresholds.medium}. These indicators were above your peers and added the most points.
          {rule && ` A ${levelText} flag goes to ${rule.reviewer}, which has ${rule.deadline} to decide.`}
        </p>
        <FlagReason flag={c} />
        {c.closeReason && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-700">
            <span className="font-semibold">Reviewer&rsquo;s decision.</span> {c.closeReason}
          </div>
        )}

        {c.disputes.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-900">My disputes and appeals</p>
            <div className="mt-2 space-y-2">
              {c.disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-800">{d.type === 'APPEAL' ? 'Appeal' : `Dispute, ${metricLabel[d.metricKey] || 'whole flag'}`}</span>
                    <Badge tone={DISPUTE_TONE[d.status]}>{d.type === 'APPEAL' && d.status === 'OPEN' ? 'With the audit committee' : DISPUTE_TEXT[d.status]}</Badge>
                    <span className="text-xs text-slate-500">{formatDateTime(d.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-600">{d.statement}</p>
                  {d.evidence && <p className="mt-1 text-[13px] text-slate-500">Evidence: {d.evidence}</p>}
                  {d.decisionNote && <p className="mt-1 text-[13px] text-slate-600">Decision by {d.decidedBy}: {d.decisionNote}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        {canDispute && (
          <>
            <p className="text-base font-semibold text-slate-900">Dispute this flag</p>
            <p className="mb-4 mt-0.5 text-[13px] text-slate-500">Tell your reviewer if there is a reason the numbers look this way.</p>
            <ActionForm
              url="/api/disputes"
              extra={{ caseId: c.id }}
              submitLabel="Submit dispute"
              fields={[
                { name: 'metricKey', label: 'Which indicator?', type: 'select', options: metricOptions },
                { name: 'statement', label: 'What should the reviewer know?', type: 'textarea', required: true, placeholder: 'For example, these customers asked for the accounts at a branch event.' },
                { name: 'evidence', label: 'Supporting evidence (optional)', type: 'text', placeholder: 'For example, signed forms or appointment notes.' },
              ]}
            />
          </>
        )}
        {canAppeal && (
          <>
            <p className="text-base font-semibold text-slate-900">Appeal the outcome</p>
            <p className="mb-4 mt-0.5 text-[13px] text-slate-500">The audit committee reviews appeals independently of your branch.</p>
            <ActionForm
              url="/api/appeals"
              extra={{ caseId: c.id }}
              submitLabel="Submit appeal"
              fields={[
                { name: 'statement', label: 'Why do you disagree?', type: 'textarea', required: true },
                { name: 'evidence', label: 'Supporting evidence (optional)', type: 'text' },
              ]}
            />
          </>
        )}
        {!canDispute && !canAppeal && (
          <div className="flex items-start gap-2 text-[13px] text-slate-600">
            <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            {hasOpenDispute ? 'Your dispute is with your reviewer, who must consider it before deciding.' : appealed ? 'Your appeal is with the audit committee.' : 'This flag was cleared. No action is needed.'}
          </div>
        )}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">What happens next</p>
          <Steps steps={[
            ['You dispute', 'Choose the indicator and explain the context, with evidence if you have it.'],
            ['Your reviewer decides', 'They must consider your dispute, then clear the flag, arrange coaching or refer it for investigation.'],
            ['You can appeal', 'If you disagree with the outcome, appeal to the audit committee.'],
          ]} />
        </div>
      </Card>
    </div>
  );
}

export default async function MyDisputes() {
  const user = await requireUser(['EMPLOYEE']);
  const [record, cases, now, config] = await Promise.all([
    getEmployeeRecord(user.employeeId),
    prisma.case.findMany({ where: { employeeId: user.employeeId, kind: 'EMPLOYEE_FLAG' }, include: { disputes: { orderBy: { createdAt: 'desc' } } }, orderBy: { openedAt: 'desc' } }),
    getNow(prisma),
    loadConfig(prisma),
  ]);
  const thresholds = { medium: config.level_medium, high: config.level_high };
  const metricLabel = Object.fromEntries(METRICS.map((m) => [m.key, m.label]));
  const accounts = record.flaggedAccounts;

  return (
    <div className="space-y-8">
      <PageHeader
        level="employee"
        eyebrow="My conduct record"
        title="Disputes and appeals"
        description="Review why you were flagged, dispute a flag with your reviewer, or appeal a decided outcome to the audit committee."
      />

      {cases.length === 0 ? (
        <Card><EmptyState icon="checkCircle" title="Nothing to dispute">You have no flags on your record. You are flagged only if your score reaches {thresholds.medium}.</EmptyState></Card>
      ) : cases.map((c) => <FlagCase key={c.id} c={c} now={now} thresholds={thresholds} metricLabel={metricLabel} />)}

      {cases.length > 0 && accounts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-900">Accounts behind my flags</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">The accounts with the most warning signs, to help you prepare a dispute. Customers appear only as references.</p>
          <Card className="mt-3">
            <TableWrap>
              <table className="w-full min-w-[520px] border-collapse">
                <thead><tr><th className={thClass}>Account</th><th className={thClass}>Product</th><th className={thClass}>Opened</th><th className={thClass}>Warning signs</th></tr></thead>
                <tbody>
                  {accounts.slice(0, 8).map((a) => (
                    <tr key={a.ref}>
                      <td className={cx(tdClass, 'whitespace-nowrap font-medium tabular-nums')}>{a.ref}</td>
                      <td className={tdClass}>{a.product}</td>
                      <td className={cx(tdClass, 'whitespace-nowrap')}>{formatDate(a.openedAt)}</td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-1">{a.reasons.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <p className="mt-3 text-xs text-slate-500">
              Showing {Math.min(8, accounts.length)} of {accounts.length}. Every account is listed in <Link href="/me/data" className="font-medium text-indigo-700 hover:underline">My personal data</Link>.
            </p>
          </Card>
        </section>
      )}

      {cases.some((c) => c.status !== 'CLOSED') && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-[13px] text-slate-700">
          <Icon name="megaphone" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>
            <span className="font-semibold">Under pressure to hit targets?</span> You can report it without giving your name through the{' '}
            <Link href="/speak-up" className="font-medium text-indigo-700 hover:underline">protected speak-up channel</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
