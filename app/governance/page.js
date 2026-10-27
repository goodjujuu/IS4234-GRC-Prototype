'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  Field,
  PageHeader,
  PresenterButton,
  PresenterPanel,
  cx,
  inputClass,
} from '@/components/ui';
import { formatDateTime, timeAgo } from '@/lib/format';
import { PERSONAS } from '@/lib/governance';
import { formatValue } from '@/lib/thresholds';

function short(hash) {
  return hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : '—';
}

function VolumeChart({ volume }) {
  const max = Math.max(1, ...volume.weeks.map((w) => w.count));
  return (
    <div>
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Conduct alerts raised per week, last 8 weeks">
        {volume.weeks.map((w, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={cx('w-full rounded-t-[4px]', i === 7 ? (volume.suppressed ? 'bg-red-500' : 'bg-indigo-600') : 'bg-indigo-300')}
              style={{ height: `${Math.max(3, (w.count / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[11px] text-white group-hover:block">
              {w.count} alert{w.count === 1 ? '' : 's'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
        <span>8 weeks ago</span>
        <span>This week</span>
      </div>
    </div>
  );
}

export default function GovernancePage() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [verify, setVerify] = useState(null);
  const [tamper, setTamper] = useState(null);
  const [form, setForm] = useState(null); // { thresholdKey, newValue, reason, requestedBy }
  const [formError, setFormError] = useState('');
  const [review, setReview] = useState({}); // requestId -> { reviewer, note, error }

  const load = useCallback(async () => {
    const res = await fetch('/api/governance');
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitRequest(e) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    const res = await fetch('/api/governance/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setFormError(body.error);
    setForm(null);
    await load();
  }

  async function decide(id, action) {
    const r = review[id] || {};
    setBusy(true);
    const res = await fetch(`/api/governance/requests/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reviewer: r.reviewer || 'Second-Line Risk Officer', note: r.note || '' }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setReview((prev) => ({ ...prev, [id]: { ...r, error: body.error } }));
      return;
    }
    setReview((prev) => ({ ...prev, [id]: undefined }));
    setVerify(null);
    await load();
  }

  async function runVerify() {
    setBusy(true);
    const res = await fetch('/api/governance/verify', { method: 'POST' });
    setBusy(false);
    setVerify(await res.json());
    await load();
  }

  async function runTamper() {
    setBusy(true);
    const res = await fetch('/api/governance/tamper', { method: 'POST' });
    setBusy(false);
    setTamper(await res.json());
    setVerify(null);
    await load();
  }

  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  const pending = data.requests.filter((r) => r.status === 'PENDING');
  const decided = data.requests.filter((r) => r.status !== 'PENDING');
  const chain = verify || data.chain;
  const offCount = data.coverage.thresholds.filter((t) => t.off).length;
  const thresholdByKey = Object.fromEntries(data.thresholds.map((t) => [t.key, t]));

  return (
    <div>
      <PageHeader
        module="M7"
        title="Monitoring that can’t be quietly switched off"
        description="At Wells Fargo the business could pause or narrow its own sales monitoring, and the board heard about the dismissals from the press. Here every threshold change needs independent second-line sign-off and lands on a hash-chained log that exposes any later edit."
      />

      {/* Status row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className={cx(!chain.intact && 'ring-2 ring-red-300')}>
          <CardHeader
            icon="hash"
            title="Log integrity"
            actions={
              <Button size="sm" variant="secondary" icon="refresh" disabled={busy} onClick={runVerify}>
                Verify
              </Button>
            }
          />
          {chain.intact ? (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Icon name="shield" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-emerald-700">Chain intact</p>
                <p className="text-xs text-slate-500">All {chain.entries.length} entries match their SHA-256 hashes.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                <Icon name="alert" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-red-700">Tampering detected at entry #{chain.firstBroken}</p>
                <p className="text-xs text-slate-500">
                  {verify?.alert || verify ? 'HIGH alert raised in M4 — escalating it opens a case directly with the CRO.' : 'Press Verify to raise the alert.'}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader icon="layers" title="Monitoring coverage" />
          <div className="space-y-1.5 text-[13px]">
            <p className="flex items-center justify-between">
              <span className="text-slate-600">Checks switched on</span>
              <span className={cx('font-semibold', offCount ? 'text-red-600' : 'text-emerald-600')}>
                {data.coverage.thresholds.length - offCount} of {data.coverage.thresholds.length}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-slate-600">Branches scanned</span>
              <span className={cx('font-semibold', data.coverage.runFresh ? 'text-emerald-600' : 'text-amber-600')}>
                {data.coverage.runFresh ? `${data.coverage.branches.length} of ${data.coverage.branches.length}` : 'Not in the last 7 days'}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-slate-600">Last analytics run</span>
              <span className="text-slate-700">{data.coverage.lastRun ? timeAgo(data.coverage.lastRun.createdAt) : 'Never'}</span>
            </p>
          </div>
          {(offCount > 0 || !data.coverage.runFresh) && (
            <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
              Blind spot: {offCount > 0 ? `${offCount} check${offCount === 1 ? ' is' : 's are'} set so high it can never trigger. ` : ''}
              {!data.coverage.runFresh ? 'Conduct analytics has not run recently (run it from M4).' : ''}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            icon="chart"
            title="Alert volume (suppression monitor)"
            subtitle={`This week ${data.volume.latest} · 4-week average ${data.volume.prior}`}
          />
          <VolumeChart volume={data.volume} />
          {data.volume.suppressed && (
            <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              Alerts fell by more than half this week — possible suppression. Reported to the Board.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Thresholds */}
          <Card padded={false}>
            <div className="border-b border-slate-100 p-5">
              <CardHeader className="mb-0" icon="sliders" title="M4 detection thresholds" subtitle="Anyone can propose a change. Only the second line can approve it." />
            </div>
            <ul className="divide-y divide-slate-100">
              {data.thresholds.map((t) => {
                const isPending = pending.some((p) => p.thresholdKey === t.key);
                return (
                  <li key={t.key} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold tabular-nums text-slate-900">
                        ≥ {formatValue(t.unit, t.value)}
                      </span>
                      {isPending ? (
                        <Badge tone="amber" dot>
                          Awaiting sign-off
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setFormError('');
                            setForm({ thresholdKey: t.key, newValue: t.value, reason: '', requestedBy: PERSONAS[0].name });
                          }}
                        >
                          Propose change
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Proposal form */}
          {form && (
            <Card className="animate-fade-up ring-2 ring-indigo-200">
              <CardHeader icon="sliders" title={`Propose a change: ${thresholdByKey[form.thresholdKey].label}`} subtitle="Step 1 of 2 — the maker" />
              <form onSubmit={submitRequest} className="grid gap-4 sm:grid-cols-2">
                <Field label="Requested by">
                  <select value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} className={inputClass}>
                    {PERSONAS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.line})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={`New threshold (${thresholdByKey[form.thresholdKey].unit === 'PERCENT' ? '%' : 'count'})`}
                  hint={`Currently ${formatValue(thresholdByKey[form.thresholdKey].unit, thresholdByKey[form.thresholdKey].value)}`}
                >
                  <input type="number" min="0" value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} className={inputClass} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Reason">
                    <input
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="e.g. Too many alerts are slowing down our sales campaign"
                      className={inputClass}
                    />
                  </Field>
                </div>
                {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={busy}>
                    Submit for sign-off
                  </Button>
                  <Button variant="ghost" onClick={() => setForm(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Pending sign-off */}
          <Card padded={false}>
            <div className="border-b border-slate-100 p-5">
              <CardHeader className="mb-0" icon="consent" title="Awaiting second-line sign-off" subtitle="Step 2 of 2 — the checker. Rules are enforced by the server, not just this screen." />
            </div>
            {pending.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nothing awaiting sign-off">Propose a threshold change above to start.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map((r) => {
                  const t = thresholdByKey[r.thresholdKey];
                  const hides = r.flagsBefore - r.flagsAfter;
                  const rv = review[r.id] || {};
                  return (
                    <li key={r.id} className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                        <span className="text-sm tabular-nums text-slate-600">
                          {formatValue(t.unit, r.oldValue)} → <span className="font-semibold text-slate-900">{formatValue(t.unit, r.newValue)}</span>
                        </span>
                        {hides > 0 ? (
                          <Badge tone="red" dot>
                            Suppression risk: hides {hides} of {r.flagsBefore} current flags
                          </Badge>
                        ) : (
                          <Badge tone="green">No current flags hidden</Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-600">
                        <span className="font-medium text-slate-800">{r.requestedBy}</span>: “{r.reason}” · {timeAgo(r.createdAt)}
                      </p>
                      <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end">
                        <Field label="Signing off as">
                          <select
                            value={rv.reviewer || 'Second-Line Risk Officer'}
                            onChange={(e) => setReview((p) => ({ ...p, [r.id]: { ...rv, reviewer: e.target.value, error: '' } }))}
                            className={inputClass}
                          >
                            {PERSONAS.map((p) => (
                              <option key={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label={hides > 0 ? 'Justification (required to approve)' : 'Note (optional)'}>
                          <input
                            value={rv.note || ''}
                            onChange={(e) => setReview((p) => ({ ...p, [r.id]: { ...rv, note: e.target.value, error: '' } }))}
                            className={inputClass}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" disabled={busy} onClick={() => decide(r.id, 'approve')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide(r.id, 'reject')}>
                            Reject
                          </Button>
                        </div>
                      </div>
                      {rv.error && (
                        <Callout tone="red" icon="lock">
                          {rv.error}
                        </Callout>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {decided.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                Decided:{' '}
                {decided.slice(0, 4).map((r) => (
                  <span key={r.id} className="mr-3 inline-flex items-center gap-1">
                    <Badge tone={r.status === 'APPROVED' ? 'green' : 'neutral'}>{r.status}</Badge>
                    {thresholdByKey[r.thresholdKey]?.label} by {r.reviewedBy}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Log */}
          <Card padded={false}>
            <div className="border-b border-slate-100 p-5">
              <CardHeader
                className="mb-0"
                icon="hash"
                title="Tamper-evident control log"
                subtitle="Append-only. Each entry’s hash covers its content and the previous entry’s hash."
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2.5">#</th>
                    <th className="px-3 py-2.5">Change</th>
                    <th className="px-3 py-2.5">Maker → checker</th>
                    <th className="px-3 py-2.5">Hash</th>
                    <th className="px-5 py-2.5 text-right">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...chain.entries].reverse().map((e) => {
                    const ok = e.linkOk && e.hashOk;
                    return (
                      <tr key={e.id} className={cx(!ok && 'bg-red-50/70')}>
                        <td className="px-5 py-3 align-top text-xs font-semibold tabular-nums text-slate-400">{e.seq}</td>
                        <td className="max-w-md px-3 py-3 align-top">
                          <p className="text-[13px] leading-snug text-slate-800">{e.change}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(e.createdAt)}</p>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-600">
                          {e.changedBy}
                          <br />→ {e.signedOffBy}
                        </td>
                        <td className="px-3 py-3 align-top font-mono text-[11px] text-slate-500">
                          {short(e.hash)}
                          <br />
                          <span className="text-slate-400">prev {short(e.prevHash)}</span>
                        </td>
                        <td className="px-5 py-3 text-right align-top">
                          {ok ? (
                            <Badge tone="green">
                              <Icon name="check" className="h-3 w-3" /> Valid
                            </Badge>
                          ) : (
                            <Badge tone="red">{!e.hashOk ? 'Content altered' : 'Link broken'}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <PresenterPanel>
            <p className="text-[12px] leading-snug text-indigo-900/80">
              Simulate someone with database access editing a past log entry directly, bypassing sign-off.
            </p>
            <PresenterButton icon="alert" disabled={busy} onClick={runTamper}>
              Edit a log entry in the database
            </PresenterButton>
            {tamper && !tamper.error && (
              <p className="px-1 text-[11px] leading-snug text-indigo-900/80">
                Entry #{tamper.seq} changed to: “{tamper.after}”. Now press <b>Verify</b> on Log integrity.
              </p>
            )}
            <p className="px-1 text-[11px] text-indigo-800/70">Run <code>npm run seed</code> to restore a clean log.</p>
          </PresenterPanel>

          <Card>
            <p className="text-[13px] font-semibold text-slate-800">Sign-off rules</p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
              <li className="flex gap-2">
                <Icon name="user" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Only the Second-Line Risk Officer or CRO can approve — never the business line.
              </li>
              <li className="flex gap-2">
                <Icon name="x" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Nobody can approve their own request (maker-checker).
              </li>
              <li className="flex gap-2">
                <Icon name="eyeOff" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                A change that hides current flags needs a written justification.
              </li>
              <li className="flex gap-2">
                <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Switching a check off entirely needs the Chief Risk Officer.
              </li>
              <li className="flex gap-2">
                <Icon name="hash" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                Approvals and rejections are both written to the hash-chained log.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
