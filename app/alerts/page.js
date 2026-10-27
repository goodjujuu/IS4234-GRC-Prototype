'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  ModuleBadge,
  PageHeader,
  SEVERITY_TONE,
  Tabs,
  cx,
  inputClass,
} from '@/components/ui';
import { DISMISS_REASONS, alertTypeLabel, timeAgo } from '@/lib/format';
import { formatValue } from '@/lib/thresholds';

const SOURCES = ['All', 'M1', 'M2', 'M3', 'M4', 'M5', 'M7'];
const STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ALL', label: 'All' },
];

function RiskCell({ value, threshold, unit, breached }) {
  if (value === null || value === undefined) return <span className="text-slate-300">—</span>;
  return (
    <span
      className={cx(
        'inline-flex min-w-[52px] justify-center rounded-md px-2 py-1 text-[13px] font-semibold tabular-nums',
        breached ? 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200' : 'bg-slate-50 text-slate-600',
      )}
      title={`Threshold ${formatValue(unit, threshold)}`}
    >
      {formatValue(unit, value)}
    </span>
  );
}

function RiskMap({ map, onRun, running, lastRun }) {
  if (!map) return <Card>Loading…</Card>;
  const bankerThresholds = map.thresholds.filter((t) => t.scope === 'banker');
  const branchThresholds = map.thresholds.filter((t) => t.scope === 'branch');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon="sliders"
          title="Detection thresholds"
          subtitle="Set and changed only through M7 Control governance, with second-line sign-off."
          actions={
            <Link href="/governance" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-500">
              Manage in M7 →
            </Link>
          }
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {map.thresholds.map((t) => (
            <div key={t.key} className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70">
              <p className="text-[11px] font-medium leading-snug text-slate-500">{t.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                ≥ {formatValue(t.unit, t.value)}
                <span className="ml-1 text-[11px] font-normal text-slate-400">per {t.scope}</span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Banker risk map</h2>
            <p className="text-[13px] text-slate-500">
              Every module’s signals, joined per banker. Red cells breach a threshold.
              {lastRun ? ` Last analytics run ${timeAgo(lastRun.createdAt)}.` : ' Analytics has not run yet.'}
            </p>
          </div>
          <Button icon="play" onClick={onRun} disabled={running}>
            {running ? 'Running…' : 'Run analytics now'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3">Banker</th>
                <th className="px-3 py-3 text-center">Accounts</th>
                {bankerThresholds.map((t) => (
                  <th key={t.key} className="max-w-[130px] px-3 py-3 text-center normal-case tracking-normal">
                    {t.label}
                  </th>
                ))}
                <th className="px-5 py-3 text-right">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {map.bankers.map((b) => (
                <tr key={b.id} className={b.riskScore >= 2 ? 'bg-red-50/40' : ''}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={b.name} />
                      <div>
                        <p className="font-medium text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.branchName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">{b.accountsOpened}</td>
                  {bankerThresholds.map((t) => (
                    <td key={t.key} className="px-3 py-3 text-center">
                      <RiskCell value={b.metrics[t.key]} threshold={t.value} unit={t.unit} breached={b.breaches.includes(t.key)} />
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={cx('h-4 w-1.5 rounded-sm', i < b.riskScore ? (b.riskScore >= 2 ? 'bg-red-500' : 'bg-amber-400') : 'bg-slate-200')}
                          />
                        ))}
                      </div>
                      <span className="w-8 text-right text-[13px] font-semibold tabular-nums">{b.riskScore}/4</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padded={false}>
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-[15px] font-semibold">Branch view</h2>
          <p className="text-[13px] text-slate-500">Branch-level signals are aggregated first, to protect individual privacy.</p>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
          {map.branches.map((br) => (
            <div key={br.id} className="bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{br.name}</p>
                {br.breaches.length > 0 ? <Badge tone="red" dot>Flagged</Badge> : <Badge tone="green" dot>Clear</Badge>}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {br.bankers} bankers · {br.accounts} accounts
              </p>
              {branchThresholds.map((t) => (
                <div key={t.key} className="mt-3 flex items-center justify-between text-[13px]">
                  <span className="text-slate-600">{t.label}</span>
                  <RiskCell value={br.metrics[t.key]} threshold={t.value} unit={t.unit} breached={br.breaches.includes(t.key)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AlertCard({ alert, onEscalate, onDismiss, busy }) {
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState(DISMISS_REASONS[0]);
  const stripe = { HIGH: 'bg-red-500', MEDIUM: 'bg-amber-400', LOW: 'bg-slate-300' }[alert.severity];

  return (
    <Card padded={false} className="relative overflow-hidden">
      <span className={cx('absolute inset-y-0 left-0 w-1', stripe)} />
      <div className="flex flex-col gap-4 p-4 pl-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ModuleBadge module={alert.source} />
            <h3 className="text-[15px] font-semibold text-slate-900">{alertTypeLabel(alert.type)}</h3>
            <Badge tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</Badge>
            {alert.status !== 'OPEN' && <Badge tone={alert.status === 'ESCALATED' ? 'violet' : 'neutral'}>{alert.status}</Badge>}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{alert.description}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {alert.banker && (
              <span className="flex items-center gap-1">
                <Icon name="user" className="h-3.5 w-3.5" />
                {alert.banker.name}
              </span>
            )}
            {alert.branch && (
              <span className="flex items-center gap-1">
                <Icon name="building" className="h-3.5 w-3.5" />
                {alert.branch.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {timeAgo(alert.createdAt)}
            </span>
          </p>
          {alert.status === 'DISMISSED' && (
            <p className="mt-2 text-xs text-slate-500">
              Dismissed by {alert.dismissedBy}: <span className="font-medium text-slate-700">{alert.dismissReason}</span>
            </p>
          )}
          {dismissing && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={cx(inputClass, 'sm:flex-1')}>
                {DISMISS_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" disabled={busy} onClick={() => onDismiss(alert.id, reason)}>
                  Confirm dismissal
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {alert.status === 'OPEN' && !dismissing && (
            <>
              <Button size="sm" icon="briefcase" disabled={busy} onClick={() => onEscalate(alert.id)}>
                Escalate to case
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDismissing(true)}>
                Dismiss
              </Button>
            </>
          )}
          {alert.caseRecord && (
            <Link
              href={`/cases/${alert.caseRecord.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
            >
              View case <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ConductAnalyticsPage() {
  const [tab, setTab] = useState('map');
  const [map, setMap] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [source, setSource] = useState('All');
  const [status, setStatus] = useState('OPEN');
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const [m, a] = await Promise.all([fetch('/api/analytics').then((r) => r.json()), fetch('/api/alerts').then((r) => r.json())]);
    setMap(m);
    setAlerts(a);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAnalytics() {
    setBusy(true);
    const res = await fetch('/api/analytics/run', { method: 'POST' });
    const body = await res.json();
    setBusy(false);
    setRunResult(body);
    await load();
  }

  async function escalate(id) {
    setBusy(true);
    const res = await fetch(`/api/alerts/${id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'Conduct Office Analyst' }),
    });
    const body = await res.json();
    setBusy(false);
    if (res.ok) setNotice({ caseId: body.id, note: body.events?.[0]?.note });
    await load();
  }

  async function dismiss(id, reason) {
    setBusy(true);
    await fetch(`/api/alerts/${id}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, by: 'Conduct Office Analyst' }),
    });
    setBusy(false);
    await load();
  }

  const counts = {
    OPEN: alerts.filter((a) => a.status === 'OPEN').length,
    ESCALATED: alerts.filter((a) => a.status === 'ESCALATED').length,
    DISMISSED: alerts.filter((a) => a.status === 'DISMISSED').length,
    ALL: alerts.length,
  };
  const visible = alerts.filter((a) => (status === 'ALL' || a.status === status) && (source === 'All' || a.source === source));

  return (
    <div>
      <PageHeader
        module="M4"
        title="Conduct analytics"
        description="Wells Fargo held complaints, unused accounts and dismissals in separate places, so nobody saw the pattern. Here every module feeds one risk map, compared against thresholds that only M7 can change."
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'map', label: 'Risk map' },
              { value: 'queue', label: 'Alert queue', count: counts.OPEN },
            ]}
          />
        }
      />

      {runResult && (
        <Callout
          className="mb-6"
          tone={runResult.raised.length ? 'red' : 'green'}
          icon={runResult.raised.length ? 'alert' : 'checkCircle'}
          title={
            runResult.raised.length
              ? `Analytics raised ${runResult.raised.length} new pattern alert${runResult.raised.length === 1 ? '' : 's'}`
              : 'Analytics run complete — no new patterns'
          }
        >
          {runResult.raised.length ? (
            <>
              {runResult.raised.map((a) => (
                <span key={a.id} className="block">
                  {a.description}
                </span>
              ))}
              <button type="button" className="mt-1 font-semibold underline" onClick={() => setTab('queue')}>
                Review in the alert queue
              </button>
            </>
          ) : (
            `Scanned ${runResult.run.bankersScanned} bankers and ${runResult.run.branchesScanned} branches. Existing open alerts already cover every breach.`
          )}
        </Callout>
      )}

      {notice && (
        <Callout className="mb-6" tone="violet" icon="briefcase" title="Case opened">
          {notice.note}{' '}
          <Link href={`/cases/${notice.caseId}`} className="font-semibold underline">
            Open the case
          </Link>
        </Callout>
      )}

      {tab === 'map' ? (
        <RiskMap map={map} onRun={runAnalytics} running={busy} lastRun={map?.lastRun} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={cx(
                    'rounded-full px-3 py-1 text-xs font-semibold transition',
                    source === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  {s === 'All' ? 'All sources' : s}
                </button>
              ))}
            </div>
            <Tabs value={status} onChange={setStatus} tabs={STATUSES.map((s) => ({ ...s, count: counts[s.value] }))} />
          </div>
          {visible.length === 0 ? (
            <EmptyState title="No alerts here">Try another filter, or run analytics from the risk map.</EmptyState>
          ) : (
            visible.map((a) => <AlertCard key={a.id} alert={a} onEscalate={escalate} onDismiss={dismiss} busy={busy} />)
          )}
        </div>
      )}
    </div>
  );
}
