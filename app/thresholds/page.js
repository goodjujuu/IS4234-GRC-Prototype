import { Callout, Card, CardHeader, PageHeader, SectionLabel } from '@/components/ui';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const LEVEL_UNITS = { level_medium: 'score', level_high: 'score', pressure_flag: 'index', branch_high_share: 'percent of staff' };

export default async function ThresholdsPage() {
  await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT']);
  const config = await prisma.scoringConfig.findMany();
  const byKey = new Map(config.map((c) => [c.key, c]));
  const levels = ['level_medium', 'level_high', 'pressure_flag', 'branch_high_share'].map((k) => byKey.get(k)).filter(Boolean);
  const weights = config.filter((c) => c.group === 'WEIGHT' && c.key.startsWith('weight_')).sort((a, b) => b.value - a.value);
  const harm = config.filter((c) => c.group === 'WEIGHT' && c.key.startsWith('harm_'));
  const watch = config.filter((c) => c.group === 'WATCH');
  const maxWeight = Math.max(1, ...weights.map((w) => w.value));

  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Threshold Governance" title="Thresholds and Weights" description="See the fixed thresholds, metric weights and warning sign settings used to monitor conduct risk." />
      <Callout tone="neutral" icon="lock">These settings are read-only and cannot be changed in the application.</Callout>
      <section>
        <SectionLabel>Risk levels</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((c) => (
            <Card key={c.key}>
              <p className="text-[13px] font-medium text-slate-600">{c.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{c.value}<span className="ml-1 text-xs font-normal text-slate-400">{LEVEL_UNITS[c.key]}</span></p>
              <p className="mt-2 text-[12px] leading-snug text-slate-500">{c.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader icon="chart" title="Metric weights" subtitle="How many of the 100 score points each indicator can add." />
            <ul className="space-y-3">
              {weights.map((w) => (
                <li key={w.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-medium text-slate-800">{w.label.replace(/ weight$/, '')}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{w.value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-violet-500" style={{ width: `${(w.value / maxWeight) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {harm.map((c) => (
                <div key={c.key}>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{c.value}</p>
                  <p className="text-[12px] leading-snug text-slate-500">{c.description}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader icon="alert" title="Warning sign settings" subtitle="When the platform alerts internal audit that detection may be weakening." />
            <div className="grid gap-3 sm:grid-cols-2">
              {watch.map((c) => (
                <div key={c.key} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[13px] font-medium text-slate-800">{c.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{c.value}{c.key === 'flag_drop_pct' ? '%' : ''}</p>
                  <p className="text-[12px] leading-snug text-slate-500">{c.description}</p>
                </div>
              ))}
            </div>
          </Card>
      </div>
    </div>
  );
}
