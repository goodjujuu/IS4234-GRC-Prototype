'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import {
  Badge,
  Callout,
  Card,
  ModuleBadge,
  PageHeader,
  PresenterButton,
  PresenterPanel,
  StatCard,
  cx,
} from '@/components/ui';
import { CASE_LEVELS, alertTypeLabel, timeLeft } from '@/lib/format';

const COLUMNS = [
  { key: 'BRANCH', title: 'Branch', sla: '5 days', hours: 120, accent: 'bg-sky-500' },
  { key: 'CONDUCT_OFFICE', title: 'Conduct Office', sla: '48 hours', hours: 48, accent: 'bg-amber-500' },
  { key: 'CRO', title: 'Chief Risk Officer', sla: '24 hours', hours: 24, accent: 'bg-red-500' },
  { key: 'RESOLVED', title: 'Resolved', sla: null, accent: 'bg-emerald-500' },
];

function isOverdue(c) {
  return c.status !== 'RESOLVED' && new Date(c.deadlineAt) < new Date();
}

function CaseCard({ c, hours }) {
  const overdue = isOverdue(c);
  const remaining = new Date(c.deadlineAt).getTime() - Date.now();
  const used = hours ? Math.min(100, Math.max(0, 100 - (remaining / (hours * 3600000)) * 100)) : 100;
  const boardNotified = c.events.some((e) => e.action === 'BOARD_NOTIFIED');

  return (
    <Link
      href={`/cases/${c.id}`}
      className={cx(
        'block rounded-xl bg-white p-3.5 shadow-card ring-1 transition hover:-translate-y-0.5 hover:shadow-lift',
        overdue ? 'ring-red-300' : 'ring-slate-200/80',
      )}
    >
      <div className="flex items-center gap-2">
        <ModuleBadge module={c.alert.source} />
        <p className="truncate text-[13px] font-semibold text-slate-900">{alertTypeLabel(c.alert.type)}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {[c.banker?.name, c.branch?.name].filter(Boolean).join(' · ') || 'No branch'}
      </p>
      {c.status !== 'RESOLVED' ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cx('h-full rounded-full', overdue ? 'bg-red-500' : used > 70 ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${overdue ? 100 : used}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={overdue ? 'font-semibold text-red-600' : 'text-slate-500'}>{timeLeft(c.deadlineAt)}</span>
            {boardNotified && <Badge tone="red">Board notified</Badge>}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-emerald-600">Closed with full audit trail</p>
      )}
    </Link>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sweep, setSweep] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/cases');
    if (res.ok) setCases(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runSweep(fastForwardHours) {
    setBusy(true);
    const res = await fetch('/api/cases/sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fastForwardHours }),
    });
    setBusy(false);
    if (res.ok) setSweep(await res.json());
    await load();
  }

  const open = cases.filter((c) => c.status !== 'RESOLVED');
  const overdue = open.filter(isOverdue).length;
  const boardNotified = cases.filter((c) => c.events.some((e) => e.action === 'BOARD_NOTIFIED')).length;

  return (
    <div>
      <PageHeader
        module="M6"
        title="Escalation with deadlines that enforce themselves"
        description="At Wells Fargo, cases sat with branch managers and HR and never reached the board. Here every case runs on a clock, escalates automatically when a tier misses its deadline, and keeps a timestamped audit trail."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open cases" value={open.length} icon="briefcase" />
        <StatCard label="Overdue now" value={overdue} tone={overdue ? 'red' : 'neutral'} icon="clock" />
        <StatCard label="Reported to the Board" value={boardNotified} tone={boardNotified ? 'red' : 'neutral'} icon="alert" />
        <StatCard label="Resolved" value={cases.length - open.length} tone="green" icon="checkCircle" />
      </div>

      {sweep && (
        <Callout
          className="mb-6"
          tone={sweep.actions.length ? 'amber' : 'green'}
          icon="refresh"
          title={
            sweep.actions.length
              ? `SLA sweep${sweep.fastForwardHours ? ` (+${sweep.fastForwardHours / 24} days)` : ''}: ${sweep.actions.length} case${sweep.actions.length === 1 ? '' : 's'} escalated automatically`
              : `SLA sweep${sweep.fastForwardHours ? ` (+${sweep.fastForwardHours / 24} days)` : ''}: every case is within its deadline`
          }
        >
          {sweep.actions.map((a) => (
            <span key={a.caseId + a.to} className="block">
              {alertTypeLabel(a.alertType)}: {a.note}
            </span>
          ))}
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = cases.filter((c) => (col.key === 'RESOLVED' ? c.status === 'RESOLVED' : c.status !== 'RESOLVED' && c.level === col.key));
            return (
              <div key={col.key} className="rounded-2xl bg-slate-100/70 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cx('h-2 w-2 rounded-full', col.accent)} />
                    <p className="text-[13px] font-semibold text-slate-800">{col.title}</p>
                    <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-slate-500">{items.length}</span>
                  </div>
                  {col.sla && <span className="text-[11px] text-slate-500">SLA {col.sla}</span>}
                </div>
                <div className="space-y-2">
                  {items.map((c) => (
                    <CaseCard key={c.id} c={c} hours={col.hours} />
                  ))}
                  {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-slate-400">No cases</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <PresenterPanel>
            <PresenterButton icon="refresh" disabled={busy} onClick={() => runSweep(0)}>
              Run SLA sweep now
            </PresenterButton>
            <PresenterButton icon="forward" disabled={busy} onClick={() => runSweep(48)}>
              Skip ahead 2 days, then sweep
            </PresenterButton>
            <PresenterButton icon="forward" disabled={busy} onClick={() => runSweep(120)}>
              Skip ahead 5 days, then sweep
            </PresenterButton>
          </PresenterPanel>
          <Card>
            <p className="text-[13px] font-semibold text-slate-800">Routing rules</p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
              {Object.entries(CASE_LEVELS).map(([k, v]) => (
                <li key={k} className="flex gap-2">
                  <Icon name="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {v.label}: {v.sla} to act, then auto-escalates
                </li>
              ))}
              <li className="flex gap-2">
                <Icon name="arrowUp" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Repeat pattern (banker with a case in 180 days) and speak-up alerts skip the branch
              </li>
              <li className="flex gap-2">
                <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Control-tampering alerts go straight to the CRO
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
