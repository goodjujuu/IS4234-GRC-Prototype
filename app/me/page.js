import Link from 'next/link';
import Icon from '@/components/Icon';
import { FLAG_RULES, HARM, metricsByCategory, points } from '@/components/MyConduct';
import { Badge, Card, PageHeader, RiskBadge, cx } from '@/components/ui';
import { getNow, loadConfig } from '@/lib/engine';
import { formatDate, formatDateTime, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getEmployeeRecord } from '@/lib/record';
import { formatMetric, metricDetail } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const DAY = 24 * 60 * 60 * 1000;
const LEVEL_MEANING = {
  LOW: 'Your activity is in line with colleagues in the same role. Nothing needs your attention.',
  MEDIUM: 'Some of your activity stands out from colleagues in the same role, so your team lead will review it.',
  HIGH: 'Several parts of your activity stand out from colleagues in the same role, so the conduct risk team will review it.',
};
const RING = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

function Section({ title, subtitle, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ScoreRing({ score, level }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={RING[level]} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">{score}</span>
        <span className="text-xs text-slate-400">out of 100</span>
      </div>
    </div>
  );
}

// The 0 to 100 scale with the Medium and High bands marked.
function ScoreScale({ score, medium, high }) {
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div className="bg-emerald-300" style={{ width: `${medium}%` }} />
        <div className="bg-amber-300" style={{ width: `${high - medium}%` }} />
        <div className="flex-1 bg-red-300" />
      </div>
      <div className="relative h-0">
        <span className="absolute -top-[12px] h-4 w-4 -translate-x-1/2 rounded-full bg-slate-900 ring-[3px] ring-white" style={{ left: `${score}%` }} />
      </div>
      <div className="mt-2 flex text-[11px] text-slate-500">
        <span style={{ width: `${medium}%` }}>Low, 0 to {medium - 1}</span>
        <span style={{ width: `${high - medium}%` }}>Medium, {medium} to {high - 1}</span>
        <span>High, {high} to 100</span>
      </div>
    </div>
  );
}

function OpenFlag({ flag, now, latest, medium }) {
  if (!flag) {
    return (
      <Card className="h-full">
        <div className="flex items-center gap-2 text-emerald-700">
          <Icon name="checkCircle" className="h-5 w-5" />
          <p className="text-[15px] font-semibold">No open flags</p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          You are flagged only if your score reaches {medium}.{latest && ` Your score is ${latest.score}.`}
        </p>
      </Card>
    );
  }
  const high = flag.riskLevel === 'HIGH';
  const rule = FLAG_RULES[flag.riskLevel];
  return (
    <div className={cx('flex h-full flex-col rounded-2xl border p-5 shadow-card', high ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60')}>
      <div className="flex items-center justify-between gap-2">
        <div className={cx('flex items-center gap-2', high ? 'text-red-700' : 'text-amber-700')}>
          <Icon name="alert" className="h-5 w-5" />
          <p className="text-[15px] font-semibold">You have an open flag</p>
        </div>
        <RiskBadge level={flag.riskLevel} />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
        Raised on {formatDate(flag.evidence?.asOf || flag.openedAt)} when your score reached {flag.evidence?.score ?? latest?.score}.{rule && ` It is reviewed by ${rule.reviewer}.`}
      </p>
      <dl className="mt-4 space-y-2 text-[13px]">
        {[
          ['Case', flag.ref],
          ['Reviewer', flag.assignee || 'Being assigned'],
          ['Decision due', formatDateTime(flag.deadlineAt)],
          ['Time left', timeLeft(flag.deadlineAt, now)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href="/me/disputes" className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800">
        See why and respond
        <Icon name="arrowRight" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function IndicatorTile({ metric, data, status, counts }) {
  const top = Math.max(data.value, data.median) || 1;
  const youColor = !status.flagged ? 'bg-emerald-400' : status.tone === 'red' ? 'bg-red-400' : 'bg-amber-400';
  const bars = [['You', data.value, youColor], ['Peers', data.median, 'bg-slate-300']];
  return (
    <div className={cx('flex flex-col rounded-xl border bg-white p-4 shadow-card', !status.flagged ? 'border-slate-200' : status.tone === 'red' ? 'border-red-200' : 'border-amber-200')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{metric.label}</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div className="mt-3 space-y-1.5">
        {bars.map(([label, v, color]) => (
          <div key={label} className="grid grid-cols-[42px_1fr_auto] items-center gap-2 text-[12px]">
            <span className="text-slate-500">{label}</span>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div className={cx('h-1.5 rounded-full', color)} style={{ width: `${Math.max(3, (v / top) * 100)}%` }} />
            </div>
            <span className={cx('tabular-nums', label === 'You' ? 'font-semibold text-slate-900' : 'text-slate-500')}>{formatMetric(metric.unit, v)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex-1 text-[12px] leading-relaxed text-slate-500">{metricDetail(metric, data, counts)}</p>
      <p className="mt-3 border-t border-slate-100 pt-2 text-[12px] font-medium tabular-nums text-slate-600">
        {Math.round(data.contribution) > 0 ? `Adds ${points(data.contribution)} to your score` : 'Adds nothing to your score'}
      </p>
    </div>
  );
}

export default async function MyDashboard() {
  const user = await requireUser(['EMPLOYEE']);
  const [record, openFlag, now, config] = await Promise.all([
    getEmployeeRecord(user.employeeId),
    prisma.case.findFirst({ where: { employeeId: user.employeeId, kind: 'EMPLOYEE_FLAG', status: { not: 'CLOSED' } }, orderBy: { openedAt: 'desc' } }),
    getNow(prisma),
    loadConfig(prisma),
  ]);
  const { employee, latest } = record;
  const categories = latest ? metricsByCategory(latest) : [];
  const parts = latest ? [...categories, { ...HARM, points: latest.metrics.harm, description: `${latest.metrics.counts.customersAffected} of your customers had at least one warning sign.` }] : [];

  return (
    <div className="space-y-8">
      <PageHeader
        level="employee"
        eyebrow={`${employee.position}, Branch ${employee.branch.code} ${employee.branch.name}`}
        title={`Welcome, ${employee.name.split(' ')[0]}`}
        description="Check your conduct risk score, see what is driving it, and respond to any flag on your record."
      />

      {!latest ? (
        <Card>No score has been calculated for you yet. Scores are calculated every day at 6:00 am.</Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">My conduct risk score</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  <Icon name="refresh" className="h-3.5 w-3.5" />
                  Updated daily at 6:00 am
                </span>
              </div>
              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                <ScoreRing score={latest.score} level={latest.level} />
                <div className="w-full min-w-0 flex-1">
                  <RiskBadge level={latest.level} />
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{LEVEL_MEANING[latest.level]}</p>
                  <p className="mt-1 text-[13px] text-slate-500">A score is an indicator, not proof. A named person reviews every flag, and you can dispute it.</p>
                  <div className="mt-5"><ScoreScale score={latest.score} medium={config.level_medium} high={config.level_high} /></div>
                </div>
              </div>
              <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Last updated {formatDateTime(latest.asOf)} from the previous day&rsquo;s account activity. Next update {formatDateTime(new Date(new Date(latest.asOf).getTime() + DAY))}.
              </p>
            </Card>
            <OpenFlag flag={openFlag} now={now} latest={latest} medium={config.level_medium} />
          </div>

          <Section title={`Why is my score ${latest.score}?`} subtitle="Your score adds up points from four areas. The longer the bar, the more that area is driving your score.">
            <Card>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {parts.map((p) => <div key={p.label} className={p.color} style={{ width: `${p.points}%` }} title={`${p.label}, ${points(p.points)}`} />)}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {parts.map((p) => (
                  <div key={p.label} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className={cx('h-2.5 w-2.5 rounded-sm', p.color)} />
                      <p className="text-[13px] font-medium text-slate-700">{p.label}</p>
                    </div>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{Math.round(p.points)}<span className="ml-1 text-xs font-normal text-slate-400">points</span></p>
                    <p className="mt-1 text-[12px] leading-snug text-slate-500">{p.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          <Section title="My conduct indicators" subtitle="The seven measures behind your score. Each compares you with colleagues in the same role, and the further above them you are, the more points it adds.">
            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <div className="mb-2 flex flex-wrap items-center gap-x-2">
                    <span className={cx('h-2.5 w-2.5 rounded-sm', cat.color)} />
                    <p className="text-sm font-semibold text-slate-800">{cat.label}</p>
                    <p className="text-[13px] text-slate-500">{cat.description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.items.map((i) => <IndicatorTile key={i.metric.key} {...i} counts={latest.metrics.counts} />)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
