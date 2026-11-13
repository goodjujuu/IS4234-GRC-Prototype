import Link from 'next/link';
import { ActionButton } from '@/components/actions';
import BriefingReview from '@/components/BriefingReview';
import Icon from '@/components/Icon';
import { Badge, Callout, Card, CardHeader, PageHeader, RiskBadge, SectionLabel, cx } from '@/components/ui';
import { formatClock, formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const STATUS = {
  PENDING: { tone: 'amber', text: 'Awaiting review' },
  CONFIRMED: { tone: 'green', text: 'Confirmed by a reviewer' },
  CORRECTED: { tone: 'green', text: 'Corrected by a reviewer' },
};

const TONE = { red: 'text-red-600', amber: 'text-amber-600', green: 'text-emerald-600' };
const linkClass = 'text-[13px] font-medium text-indigo-700 hover:underline';

// One item the team should look at today, with a link to where it is handled.
function Attention({ icon, title, count, note, href, linkText, children }) {
  return (
    <Card>
      <CardHeader
        icon={icon}
        title={`${title} (${count})`}
        subtitle={note}
        actions={href && <Link href={href} className={linkClass}>{linkText}</Link>}
      />
      {count === 0 ? <p className="text-[13px] text-slate-400">Nothing new today.</p> : children}
    </Card>
  );
}

export default async function BriefingPage() {
  const user = await requireUser(['CONDUCT_RISK', 'INTERNAL_AUDIT']);
  const briefing = await prisma.briefing.findFirst({ orderBy: { createdAt: 'desc' } });
  const f = briefing.facts;
  const status = STATUS[briefing.status];
  const canAct = user.role === 'CONDUCT_RISK';
  const tiles = [
    ['New High cases', f.newHigh.length, 'red', 'For you, 48 hours each'],
    ['Overdue reviews', f.overdue.length, f.overdue.length ? 'red' : 'green', 'Past their deadline'],
    ['Branches with rising pressure', f.rising.length, f.rising.length ? 'amber' : 'green', 'Pressure Index went up'],
    ['New Medium cases', f.newMedium.length, 'amber', 'With team leads'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Risk Reporting"
        title="Morning Briefing"
        description="Review what changed overnight across the bank and confirm the AI summary of likely causes before the team acts on it."
        actions={canAct && <ActionButton url="/api/briefing" icon="refresh">Generate again</ActionButton>}
      />

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
        <Icon name="clock" className="h-4 w-4 text-slate-400" />
        <span>Figures as of the overnight data load, {formatClock(briefing.asOf)}</span>
      </div>

      <section>
        <SectionLabel>Today at a glance</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map(([label, n, tone, hint]) => (
            <Card key={label}>
              <p className={cx('text-[28px] font-semibold tabular-nums tracking-tight', n ? TONE[tone] : 'text-slate-900')}>{n}</p>
              <p className="mt-1 text-[13px] font-medium leading-snug text-slate-700">{label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Likely causes</SectionLabel>
        <div className="rounded-2xl bg-indigo-50/60 p-5 ring-1 ring-inset ring-indigo-100">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="sparkles" className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-950">What the figures suggest</p>
            <Badge tone={briefing.source === 'AI_MODEL' ? 'indigo' : 'neutral'}>{briefing.source === 'AI_MODEL' ? 'AI draft' : 'Simulated AI draft'}</Badge>
            <Badge tone={status.tone}>{status.text}</Badge>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-800">{briefing.summary}</p>
          <p className="mt-2 text-xs text-slate-500">
            Written by AI from branch-level figures only, never employee names.
            {briefing.source === 'SIMULATED' && ' No model key is configured, so this draft was built from a template over the figures on this page.'}
          </p>

          {briefing.status === 'PENDING' && canAct && <BriefingReview id={briefing.id} summary={briefing.summary} />}
          {briefing.status === 'PENDING' && !canAct && <Callout tone="neutral" className="mt-3">The conduct risk team confirms or corrects this draft before anyone acts on it.</Callout>}
          {briefing.confirmedBy && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-white p-3 text-[13px]">
              <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{briefing.status === 'CONFIRMED' ? 'Confirmed' : 'Corrected'} by {briefing.confirmedBy}, {formatDateTime(briefing.confirmedAt)}</p>
                <p className="text-slate-500">{briefing.status === 'CONFIRMED' ? 'The summary can now inform action.' : 'The corrected summary above replaces the AI draft.'}</p>
                {briefing.status === 'CORRECTED' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[12px] font-medium text-indigo-700">Show the original AI draft</summary>
                    <p className="mt-1 text-[12px] text-slate-500">{briefing.draft}</p>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionLabel>Needs attention today</SectionLabel>
        <div className="grid gap-5 lg:grid-cols-2">
          <Attention icon="user" title="New High cases" count={f.newHigh.length} note="Routed to the conduct risk team." href="/cases" linkText="Open cases">
            <ul className="divide-y divide-slate-100">
              {f.newHigh.map((x) => (
                <li key={x.name} className="flex flex-wrap items-center gap-2 py-2 text-[13px] first:pt-0 last:pb-0">
                  <RiskBadge level="HIGH" /><span className="font-medium text-slate-800">{x.name}</span><span className="text-slate-500">{x.branch}, score {x.score}</span>
                </li>
              ))}
            </ul>
          </Attention>
          <Attention icon="radar" title="Branches with a rising Pressure Index" count={f.rising.length} note="Pressure from targets and managers, not only employees." href="/pressure" linkText="Open the Pressure Index">
            <ul className="divide-y divide-slate-100">
              {f.rising.map((b) => (
                <li key={b.code} className="flex flex-wrap items-center gap-2 py-2 text-[13px] first:pt-0 last:pb-0">
                  <span className="font-medium text-slate-800">Branch {b.code} {b.name}</span>
                  <span className="tabular-nums text-slate-600">{b.previous} <Icon name="arrowRight" className="inline h-3 w-3 text-slate-400" /> {b.index}</span>
                  {b.level !== b.previousLevel && <><span className="text-slate-500">now rated</span><RiskBadge level={b.level} /></>}
                </li>
              ))}
            </ul>
          </Attention>
          <Attention icon="clock" title="Overdue reviews" count={f.overdue.length} note="Cases past their deadline, which escalate automatically." href="/cases" linkText="Open cases">
            <ul className="divide-y divide-slate-100 text-[13px] text-slate-700">
              {f.overdue.map((x) => <li key={x.ref} className="py-2 first:pt-0 last:pb-0"><span className="font-medium text-slate-800">{x.ref}</span>, {x.title}</li>)}
            </ul>
          </Attention>
        </div>
      </section>

      <Card>
        <CardHeader icon="user" title={`New Medium cases (${f.newMedium.length})`} subtitle="These go to each branch's team lead. You review them only if they become overdue." />
        {f.newMedium.length === 0 ? (
          <p className="text-[13px] text-slate-400">Nothing new today.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {f.newMedium.map((x) => (
              <span key={x.name} className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-[13px]">
                <span className="font-medium text-slate-800">{x.name}</span><span className="text-slate-500">{x.branch}, score {x.score}</span>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
