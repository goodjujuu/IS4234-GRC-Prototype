'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Field,
  ModuleBadge,
  PageHeader,
  SEVERITY_TONE,
  cx,
  inputClass,
} from '@/components/ui';
import { alertTypeLabel, formatDateTime, timeLeft } from '@/lib/format';

const TIERS = [
  { key: 'BRANCH', label: 'Branch', sla: '5 days' },
  { key: 'CONDUCT_OFFICE', label: 'Conduct Office', sla: '48 hours' },
  { key: 'CRO', label: 'Chief Risk Officer', sla: '24 hours' },
];

const ROLES = ['Branch Manager', 'Conduct Office Analyst', 'Chief Risk Officer'];

const EVENT_STYLE = {
  OPENED: { icon: 'briefcase', color: 'bg-sky-100 text-sky-700' },
  ESCALATED: { icon: 'arrowUp', color: 'bg-amber-100 text-amber-700' },
  RESOLVED: { icon: 'check', color: 'bg-emerald-100 text-emerald-700' },
  NOTE: { icon: 'consent', color: 'bg-slate-100 text-slate-600' },
  BOARD_NOTIFIED: { icon: 'alert', color: 'bg-red-100 text-red-700' },
};

export default function CaseDetailPage() {
  const { id } = useParams();
  const [c, setCase] = useState(null);
  const [actor, setActor] = useState(ROLES[1]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cases/${id}`);
    if (res.ok) setCase(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action) {
    setError('');
    setBusy(true);
    const res = await fetch(`/api/cases/${id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, actor, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Action failed.');
      return;
    }
    setNote('');
    await load();
  }

  if (!c) return <p className="text-sm text-slate-500">Loading…</p>;

  const resolved = c.status === 'RESOLVED';
  const overdue = !resolved && new Date(c.deadlineAt) < new Date();
  const tierIndex = TIERS.findIndex((t) => t.key === c.level);

  return (
    <div>
      <Link href="/cases" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-800">
        ← All cases
      </Link>
      <PageHeader
        module="M6"
        title={alertTypeLabel(c.alert.type)}
        description={[c.banker?.name, c.branch?.name].filter(Boolean).join(' · ') || undefined}
        actions={
          resolved ? (
            <Badge tone="green" dot>
              Resolved
            </Badge>
          ) : (
            <Badge tone={overdue ? 'red' : 'amber'} dot>
              {timeLeft(c.deadlineAt)}
            </Badge>
          )
        }
      />

      {/* Tier stepper */}
      <Card className="mb-6">
        <ol className="grid gap-3 sm:grid-cols-3">
          {TIERS.map((t, i) => {
            const done = resolved || i < tierIndex;
            const current = !resolved && i === tierIndex;
            return (
              <li
                key={t.key}
                className={cx(
                  'rounded-xl p-3 ring-1 ring-inset',
                  current ? (overdue ? 'bg-red-50 ring-red-200' : 'bg-indigo-50 ring-indigo-200') : done ? 'bg-slate-50 ring-slate-200' : 'ring-slate-200',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                      current ? (overdue ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : done ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {done && !current ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                </div>
                <p className="mt-1 pl-8 text-xs text-slate-500">
                  {current ? `Deadline ${formatDateTime(c.deadlineAt)}` : `SLA ${t.sla}`}
                </p>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader icon="radar" title="Source alert" />
            <div className="flex flex-wrap items-center gap-2">
              <ModuleBadge module={c.alert.source} />
              <Badge tone={SEVERITY_TONE[c.alert.severity]}>{c.alert.severity}</Badge>
              <span className="text-xs text-slate-400">Raised {formatDateTime(c.alert.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.alert.description}</p>
          </Card>

          <Card>
            <CardHeader icon="clock" title="Audit trail" subtitle="Every action is timestamped and cannot be edited." />
            <ol className="relative space-y-5 pl-1">
              <span className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-200" aria-hidden="true" />
              {c.events.map((e) => {
                const style = EVENT_STYLE[e.action] || EVENT_STYLE.NOTE;
                return (
                  <li key={e.id} className="relative flex gap-3">
                    <span className={cx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white', style.color)}>
                      <Icon name={style.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm">
                        <span className="font-semibold text-slate-900">{e.action.replace('_', ' ').toLowerCase().replace(/^./, (x) => x.toUpperCase())}</span>
                        <span className="text-slate-500"> · {e.actor}</span>
                      </p>
                      {e.note && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{e.note}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(e.timestamp)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div>
          {!resolved ? (
            <Card className="lg:sticky lg:top-6">
              <CardHeader icon="briefcase" title="Take action" subtitle="Your role is recorded against the action." />
              <div className="space-y-3">
                <Field label="Acting as">
                  <select value={actor} onChange={(e) => setActor(e.target.value)} className={inputClass}>
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Note or evidence">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. Interviewed banker; 3 customers confirmed they never asked for accounts"
                    className={inputClass}
                  />
                </Field>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="grid gap-2">
                  {c.level !== 'CRO' && (
                    <Button variant="secondary" icon="arrowUp" disabled={busy} onClick={() => act('escalate')}>
                      Escalate to {TIERS[tierIndex + 1]?.label}
                    </Button>
                  )}
                  <Button variant="secondary" icon="consent" disabled={busy || !note} onClick={() => act('note')}>
                    Add to audit trail
                  </Button>
                  <Button variant="success" icon="check" disabled={busy} onClick={() => act('resolve')}>
                    Resolve case
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Callout tone="green" icon="checkCircle" title="Case resolved">
              The full history stays in the audit trail and is counted on the Board dashboard.
            </Callout>
          )}
        </div>
      </div>
    </div>
  );
}
