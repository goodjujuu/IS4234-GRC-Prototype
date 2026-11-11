import Link from 'next/link';
import { ActionButton } from '@/components/actions';
import { Badge, Callout, Card, CardHeader, EmptyState, PageHeader, StatCard, TableWrap, TrendLine, tdClass, thClass } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import { verifyChain } from '@/lib/hashChain';
import { getEffectiveness } from '@/lib/kri';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const short = (hash) => (hash ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : 'Genesis');

export default async function WatchersPage() {
  await requireUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const [alerts, chain, effectiveness] = await Promise.all([
    prisma.watcherAlert.findMany({ orderBy: { createdAt: 'desc' } }),
    verifyChain(prisma),
    getEffectiveness(),
  ]);
  const open = alerts.filter((a) => a.status === 'OPEN');
  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Threshold Governance" title="Warning signs" description="Signs that detection may be being weakened, and the permanent log of every threshold change." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open warning signs" value={open.length} tone={open.length ? 'amber' : 'green'} />
        <StatCard label="Unapproved threshold changes" value={effectiveness.unapproved.length} tone={effectiveness.unapproved.length ? 'red' : 'green'} hint="Target zero" />
        <StatCard label="Change log" value={chain.intact ? 'Intact' : 'Broken'} tone={chain.intact ? 'green' : 'red'} hint={chain.intact ? `${chain.entries.length} entries verified` : `First break at entry ${chain.firstBroken}`} />
      </div>

      <Card>
        <CardHeader icon="alert" title="Alerts" subtitle="Threshold changes attempted, unapproved changes, sudden drops in flags and unusually fast reviews." />
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

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <Card className="self-start">
          <CardHeader icon="chart" title="Flag volume by run" subtitle="A sudden fall raises an alert." />
          <TrendLine points={effectiveness.trend.slice(-12).map((t) => ({ value: t.flags, label: formatDate(t.asOf) }))} label="Employees flagged Medium or High at each scoring run" />
        </Card>
        <Card>
          <CardHeader
            icon="hash"
            title="Permanent change log"
            subtitle="Who made each change, the old and new values, and the reason, hash-chained so any edit is detected."
            actions={<ActionButton url="/api/watchers/verify" icon="shield">Run checks</ActionButton>}
          />
          {!chain.intact && <Callout tone="red" icon="alert" className="mb-3" title={`Chain broken at entry ${chain.firstBroken}`}>This entry no longer matches its hash, so the log has been edited.</Callout>}
          <TableWrap>
            <table className="w-full min-w-[640px] border-collapse">
              <thead><tr><th className={thClass}>#</th><th className={thClass}>When</th><th className={thClass}>Change</th><th className={thClass}>Sign-off</th><th className={thClass}>Hash</th></tr></thead>
              <tbody>
                {[...chain.entries].reverse().map((e) => (
                  <tr key={e.id} className={e.hashOk && e.linkOk ? '' : 'bg-red-50'}>
                    <td className={`${tdClass} tabular-nums`}>{e.seq}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(e.createdAt)}</td>
                    <td className={tdClass}><span className="font-medium">{e.changedBy}.</span> {e.change}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{e.signedOffBy || (e.event === 'BLOCKED' ? 'Blocked' : 'Awaiting decision')}</td>
                    <td className={`${tdClass} whitespace-nowrap font-mono text-xs`} title={e.hash}>{e.hashOk && e.linkOk ? short(e.hash) : 'Mismatch'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="mt-2 text-[13px]"><Link href="/thresholds" className="font-medium text-indigo-700 hover:underline">See thresholds and pending requests</Link></p>
        </Card>
      </div>
    </div>
  );
}
