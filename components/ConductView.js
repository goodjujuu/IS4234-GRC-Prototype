import { HARM, metricsByCategory, points } from '@/components/MyConduct';
import { Badge, Card, cx } from '@/components/ui';
import { formatMetric, metricDetail } from '@/lib/scoring';

// Score visuals shared by the employee's own dashboard and the reviewer's employee profile.
// `self` words the text for the employee ("you"), otherwise for a reviewer ("they").

const RING = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

export function Section({ title, subtitle, actions, children }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ScoreRing({ score, level, size = 'h-36 w-36' }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={cx('relative shrink-0', size)}>
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
export function ScoreScale({ score, medium, high }) {
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

// The score split into the points each area adds.
export function ScoreBreakdown({ latest, self = true }) {
  const parts = [
    ...metricsByCategory(latest),
    { ...HARM, points: latest.metrics.harm, description: `${latest.metrics.counts.customersAffected} of ${self ? 'your' : 'their'} customers had at least one warning sign.` },
  ];
  return (
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
  );
}

function IndicatorTile({ metric, data, status, counts, self }) {
  const top = Math.max(data.value, data.median) || 1;
  const youColor = !status.flagged ? 'bg-emerald-400' : status.tone === 'red' ? 'bg-red-400' : 'bg-amber-400';
  const bars = [[self ? 'You' : 'Employee', data.value, youColor], ['Peers', data.median, 'bg-slate-300']];
  return (
    <div className={cx('flex flex-col rounded-xl border bg-white p-4 shadow-card', !status.flagged ? 'border-slate-200' : status.tone === 'red' ? 'border-red-200' : 'border-amber-200')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{metric.label}</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div className="mt-3 space-y-1.5">
        {bars.map(([label, v, color], i) => (
          <div key={label} className={cx('grid items-center gap-2 text-[12px]', self ? 'grid-cols-[42px_1fr_auto]' : 'grid-cols-[58px_1fr_auto]')}>
            <span className="text-slate-500">{label}</span>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div className={cx('h-1.5 rounded-full', color)} style={{ width: `${Math.max(3, (v / top) * 100)}%` }} />
            </div>
            <span className={cx('tabular-nums', i === 0 ? 'font-semibold text-slate-900' : 'text-slate-500')}>{formatMetric(metric.unit, v)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex-1 text-[12px] leading-relaxed text-slate-500">{metricDetail(metric, data, counts, self)}</p>
      <p className="mt-3 border-t border-slate-100 pt-2 text-[12px] font-medium tabular-nums text-slate-600">
        {Math.round(data.contribution) > 0 ? `Adds ${points(data.contribution)} to the score` : 'Adds nothing to the score'}
      </p>
    </div>
  );
}

// The seven indicators as tiles, grouped by area.
export function IndicatorGrid({ latest, self = true }) {
  return (
    <div className="space-y-6">
      {metricsByCategory(latest).map((cat) => (
        <div key={cat.key}>
          <div className="mb-2 flex flex-wrap items-center gap-x-2">
            <span className={cx('h-2.5 w-2.5 rounded-sm', cat.color)} />
            <p className="text-sm font-semibold text-slate-800">{cat.label}</p>
            <p className="text-[13px] text-slate-500">{cat.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((i) => <IndicatorTile key={i.metric.key} {...i} counts={latest.metrics.counts} self={self} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
