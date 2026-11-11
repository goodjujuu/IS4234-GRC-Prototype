import Link from 'next/link';
import { CaseTimeline } from '@/components/CaseRows';
import { Badge, Callout, Card, CardHeader, EmptyState, PageHeader, RiskBadge, StatCard } from '@/components/ui';
import { CASE_KINDS, CHANGE_TONE, TIER_LABELS, deadlineText, formatDateTime, formatHours, formatMonth, isOverdue, percent } from '@/lib/format';
import { getCommitteeSummary } from '@/lib/kri';
import { requireUser } from '@/lib/session';

export default async function CommitteePage() {
  await requireUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const s = await getCommitteeSummary();
  const e = s.effectiveness;
  const thisMonth = s.months[s.months.length - 1];
  const totalDismissals = s.months.reduce((n, m) => n + m.total, 0);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Audit committee, ${formatMonth(s.now)}`}
        title="Monthly summary"
        description="This month's escalated cases, branch pressure, dismissals, complaints, speak-up reports and threshold changes, each linked to its record."
        actions={
          <>
            <a href="/api/export/audit" className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white hover:bg-slate-800">Export PDF</a>
            <a href="/api/export/cases" className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Export CSV</a>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open escalated and High cases" value={s.cases.length} tone={s.cases.length ? 'red' : 'green'} />
        <StatCard label="Sales misconduct dismissals" value={thisMonth.total} hint={`This month. ${totalDismissals} in 6 months.`} />
        <StatCard label="Complaints linked to employees" value={s.complaints.total} hint={`${s.complaints.didNotAuthorise} "did not authorize", last 30 days`} />
        <StatCard label="Speak-up reports" value={s.speakUp.total} hint={s.speakUp.byBranch.map(([b, n]) => `${b} ${n}`).join(', ') || 'Last 30 days'} />
      </div>

      {s.appeals.length > 0 && (
        <Callout tone="violet" icon="filter" title={`${s.appeals.length} appeal${s.appeals.length === 1 ? '' : 's'} need a decision`}>
          <Link href="/disputes" className="font-medium underline">Open appeals</Link>
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon="radar" title="Highest Pressure Index" />
          <ul className="divide-y divide-slate-100">
            {s.topPressure.map((p) => (
              <li key={p.branchId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px] text-slate-600">
                <span><Link href={`/pressure#branch-${p.code}`} className="font-semibold text-indigo-700 hover:underline">Branch {p.code} {p.name}</Link>, manager {p.managerName}</span>
                <span className="flex items-center gap-2"><span className="font-semibold tabular-nums text-slate-800">{p.index}</span><RiskBadge level={p.rating} /></span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader icon="checkCircle" title="Effectiveness" />
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-slate-500">Reviewed within deadline, target 95%</dt><dd className="mt-0.5 font-semibold tabular-nums">{percent(e.pctOnTime)}</dd></div>
            <div><dt className="text-xs text-slate-500">Average time to resolve</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatHours(e.avgHours)}</dd></div>
            <div><dt className="text-xs text-slate-500">False alarm rate</dt><dd className="mt-0.5 font-semibold tabular-nums">{percent(e.falseAlarmRate)}</dd></div>
            <div><dt className="text-xs text-slate-500">Unapproved changes, target 0</dt><dd className="mt-0.5 font-semibold tabular-nums">{e.unapproved.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Bank-wide unused account rate</dt><dd className="mt-0.5 font-semibold tabular-nums">{percent(e.trend[e.trend.length - 1]?.rate || 0)}</dd></div>
            <div><dt className="text-xs text-slate-500">Permanent change log</dt><dd className="mt-0.5 font-semibold">{s.chain.intact ? 'Intact' : `Broken at entry ${s.chain.firstBroken}`}</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader icon="shield" title="Every threshold change, approved or blocked, last 30 days" />
          {s.requests.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <ul className="divide-y divide-slate-100">
              {s.requests.map((r) => (
                <li key={r.id} className="py-2 text-[13px] text-slate-600">
                  <span className="font-medium text-slate-800">{r.requestedBy}</span>, {r.label.toLowerCase()} from {r.oldValue} to {r.newValue}. <Badge tone={CHANGE_TONE[r.status]}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader icon="alert" title="Warning signs and complaints, last 30 days" />
          {s.alerts.length === 0 ? <p className="text-sm text-slate-500">No warning signs.</p> : (
            <ul className="divide-y divide-slate-100">
              {s.alerts.slice(0, 5).map((a) => (
                <li key={a.id} className="py-2 text-[13px] text-slate-600"><span className="font-medium text-slate-800">{a.title}.</span> {formatDateTime(a.createdAt)}</li>
              ))}
            </ul>
          )}
          {s.complaints.topEmployees.length > 0 && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-[13px] text-slate-600">
              <span className="font-medium text-slate-800">Most complaints.</span> {s.complaints.topEmployees.map(([name, n]) => `${name} (${n})`).join(', ')}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader icon="briefcase" title={`Cases with their audit trail (${s.cases.length})`} subtitle="Open a section to read the full audit trail." />
        {s.cases.length === 0 && <EmptyState icon="checkCircle" title="No open cases for the committee" />}
        <div className="space-y-2">
          {s.cases.map((c) => (
            <details key={c.id} className="rounded-xl border border-slate-200 open:bg-slate-50/50">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-[13px]">
                <RiskBadge level={c.riskLevel} />
                <span className="font-semibold text-slate-800">{c.ref} {c.title}</span>
                <Badge tone="neutral">{CASE_KINDS[c.kind]}</Badge>
                <span className={isOverdue(c, s.now) ? 'font-semibold text-red-700' : 'text-slate-500'}>{c.assignee || TIER_LABELS[c.tier]}, {deadlineText(c, s.now)}</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <p className="mb-3 text-[13px] text-slate-600">{c.summary}</p>
                <CaseTimeline events={c.events} format={formatDateTime} />
                <Link href={`/cases/${c.id}`} className="mt-3 inline-block text-[13px] font-medium text-indigo-700 hover:underline">Open the case and its evidence</Link>
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
