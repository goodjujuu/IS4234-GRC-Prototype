import Link from 'next/link';
import { ActionButton } from '@/components/actions';
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard, TrendLine } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import { getEffectiveness } from '@/lib/kri';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export default async function WatchersPage() {
  await requireUser(['INTERNAL_AUDIT']);
  const [alerts, effectiveness] = await Promise.all([
    prisma.watcherAlert.findMany({ where: { type: { notIn: ['THRESHOLD_CHANGE', 'LOG_TAMPERING'] } }, orderBy: { createdAt: 'desc' } }),
    getEffectiveness(),
  ]);
  const open = alerts.filter((a) => a.status === 'OPEN');
  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Threshold Governance" title="Warning Signs" description="Investigate warning signs, acknowledge alerts and check that detection settings match the fixed baseline." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Open warning signs" value={open.length} tone={open.length ? 'amber' : 'green'} />
        <StatCard label="Unexpected configuration changes" value={effectiveness.unexpected.length} tone={effectiveness.unexpected.length ? 'red' : 'green'} hint="Target zero" />
      </div>

      <Card>
        <CardHeader icon="alert" title="Alerts" subtitle="Unexpected configuration changes, sudden drops in flags and unusually fast reviews." />
        {alerts.length === 0 && <EmptyState icon="checkCircle" title="No alerts" />}
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.severity === 'HIGH' ? 'red' : 'amber'} dot>{a.severity === 'HIGH' ? 'High' : 'Medium'}</Badge>
                    <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{a.detail}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(a.createdAt)}{a.acknowledgedBy ? `. Acknowledged by ${a.acknowledgedBy}` : ''}</p>
                </div>
                {a.status === 'OPEN' && <ActionButton url={`/api/watchers/${a.id}`} icon="check">Acknowledge</ActionButton>}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader
          icon="shield"
          title="Configuration settings"
          subtitle="Check that current thresholds and weights match the fixed baseline."
          actions={<ActionButton url="/api/watchers/verify" icon="shield">Check settings</ActionButton>}
        />
        <Link href="/thresholds" className="text-[13px] font-medium text-indigo-700 hover:underline">See fixed thresholds and weights</Link>
      </Card>
      <Card>
        <CardHeader icon="chart" title="Flag volume by run" subtitle="A sudden fall raises an alert." />
        <TrendLine points={effectiveness.trend.slice(-12).map((t) => ({ value: t.flags, label: formatDate(t.asOf) }))} label="Employees flagged Medium or High at each scoring run" />
      </Card>
    </div>
  );
}
