import Link from 'next/link';
import Icon from '@/components/Icon';
import { Avatar, Badge, Card, CardHeader, ModuleBadge, PageHeader, StatCard, cx } from '@/components/ui';
import { MODULES, formatDateTime, sgd } from '@/lib/format';
import { getKriSummary } from '@/lib/kri';

export const dynamic = 'force-dynamic';

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

// Single-series horizontal bars: one hue, value labels in text ink, hover title.
function BarList({ rows, max, color = 'bg-indigo-500', empty }) {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => r.value), 0));
  if (rows.every((r) => r.value === 0)) return <p className="py-6 text-center text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,230px)_minmax(0,1fr)_32px] items-center gap-3" title={`${r.title || r.label}: ${r.value}`}>
          <span className="flex min-w-0 items-center gap-2 text-[13px] text-slate-600">
            {r.badge}
            <span className="truncate">{r.label}</span>
          </span>
          <span className="h-2.5 rounded-full bg-slate-100">
            <span className={cx('block h-full rounded-full', color)} style={{ width: `${(r.value / top) * 100}%`, minWidth: r.value ? 6 : 0 }} />
          </span>
          <span className="text-right text-[13px] font-semibold tabular-nums text-slate-800">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function BoardDashboardPage() {
  const kri = await getKriSummary();
  const asOf = new Date();

  const incentiveTotal = Math.max(1, kri.incentives.paid + kri.incentives.lapsed);

  return (
    <div>
      <PageHeader
        eyebrow="Board Risk & Audit Committees"
        title="Conduct KRI pack"
        description="One page the Board sees without anyone choosing what to forward. Every number is computed live from the seven modules."
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live · as of {formatDateTime(asOf)}
          </span>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Consent decline rate"
          value={pct(kri.consentDeclineRate)}
          tone={kri.consentDeclineRate >= 0.25 ? 'red' : 'neutral'}
          hint={`${kri.consentCounts.declined} of ${kri.consentCounts.total} new accounts declined or ignored by the customer (M2)`}
          icon="consent"
        />
        <StatCard
          label="Unused-account rate"
          value={pct(kri.unusedAccountRate)}
          tone={kri.unusedAccountRate >= 0.2 ? 'red' : 'neutral'}
          hint={`${kri.unusedCounts.lapsed} of ${kri.unusedCounts.reviewed} reviewed accounts never used by the customer (M3)`}
          icon="coins"
        />
        <StatCard
          label="Speak-up reports"
          value={kri.complaints}
          tone={kri.retaliationFlags ? 'amber' : 'neutral'}
          hint={`${kri.retaliationFlags} with retaliation flagged against the reporter (M5)`}
          icon="megaphone"
        />
        <StatCard
          label="Open conduct alerts"
          value={kri.openAlerts}
          tone={kri.highOpenAlerts ? 'red' : 'neutral'}
          hint={`${kri.highOpenAlerts} high severity · ${kri.dismissedTotal} dismissed with a recorded reason (M4)`}
          icon="radar"
        />
        <StatCard
          label="Overdue cases"
          value={kri.overdueCases}
          tone={kri.overdueCases ? 'red' : 'green'}
          hint={`${kri.openCases} open · ${kri.resolvedCases} resolved · ${kri.boardNotified} escalated past the CRO to the Board (M6)`}
          icon="clock"
        />
        <StatCard
          label="Control log integrity"
          value={kri.chain.intact ? 'Intact' : 'Broken'}
          tone={kri.chain.intact ? 'green' : 'red'}
          hint={
            kri.chain.intact
              ? `${kri.chain.entries} hash-chained entries verified${kri.suppression ? ' · alert volume drop detected' : ''} (M7)`
              : `Entry #${kri.chain.firstBroken} was altered outside the approved process (M7)`
          }
          icon="shield"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon="radar" title="Live alerts by source" subtitle="Open and escalated alerts, by the module that raised them." />
          <BarList
            empty="No live alerts"
            rows={kri.alertsBySource.map((r) => ({
              key: r.source,
              label: MODULES[r.source].name,
              badge: <ModuleBadge module={r.source} />,
              value: r.count,
            }))}
          />
        </Card>
        <Card>
          <CardHeader icon="filter" title="Dismissals by reason" subtitle="Every dismissed alert needs a recorded reason and owner." />
          <BarList
            empty="No alerts have been dismissed"
            color="bg-slate-500"
            rows={kri.dismissalsByReason.map((r) => ({ key: r.reason, label: r.reason, value: r.count }))}
          />
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader icon="coins" title="Incentives" subtitle="Credit only pays out for genuinely used accounts." />
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            <span className="h-full bg-emerald-500" style={{ width: `${(kri.incentives.paid / incentiveTotal) * 100}%` }} />
            <span className="h-full border-l-2 border-white bg-red-400" style={{ width: `${(kri.incentives.lapsed / incentiveTotal) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <p className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Credited
              </p>
              <p className="text-lg font-semibold tabular-nums">{sgd(kri.incentives.paid)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Lapsed (unused)
              </p>
              <p className="text-lg font-semibold tabular-nums">{sgd(kri.incentives.lapsed)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon="sliders" title="Threshold changes" subtitle="Maker-checker requests on M4’s detection thresholds." />
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            {[
              ['Approved', kri.thresholdChanges.approved, 'text-slate-900'],
              ['Rejected', kri.thresholdChanges.rejected, 'text-slate-900'],
              ['Awaiting sign-off', kri.thresholdChanges.pending, 'text-amber-600'],
              ['Would hide flags', kri.thresholdChanges.suppressing, kri.thresholdChanges.suppressing ? 'text-red-600' : 'text-slate-900'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className={cx('text-lg font-semibold tabular-nums', color)}>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader icon="user" title="Highest-risk bankers" subtitle="Threshold breaches from conduct analytics." />
          {kri.topBankers.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">No banker breaches any threshold.</p>
          ) : (
            <ul className="space-y-3">
              {kri.topBankers.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <Avatar name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.branchName}</p>
                  </div>
                  <Badge tone={b.riskScore >= 2 ? 'red' : 'amber'}>{b.riskScore}/4 breaches</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/alerts" className="mt-4 inline-block text-[13px] font-medium text-indigo-600 hover:text-indigo-500">
            Open the risk map →
          </Link>
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <CardHeader className="mb-0" icon="hash" title="Recent control changes" subtitle="From the tamper-evident log (M7)." />
          {kri.chain.intact ? (
            <Badge tone="green">
              <Icon name="check" className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge tone="red">Tampering detected</Badge>
          )}
        </div>
        <ul className="divide-y divide-slate-100">
          {kri.configChanges.map((e) => (
            <li key={e.id} className={cx('flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4', !(e.linkOk && e.hashOk) && 'bg-red-50/70')}>
              <span className="w-6 text-xs font-semibold tabular-nums text-slate-400">#{e.seq}</span>
              <p className="min-w-0 flex-1 text-[13px] text-slate-700">{e.change}</p>
              <p className="shrink-0 text-xs text-slate-500">
                {e.changedBy} → {e.signedOffBy} · {formatDateTime(e.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
