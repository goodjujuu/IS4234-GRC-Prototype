'use client';

import { useCallback, useEffect, useState } from 'react';
import CustomerPhone from '@/components/CustomerPhone';
import Icon from '@/components/Icon';
import SpeakUpAppScreen from '@/components/SpeakUpAppScreen';
import usePhoneSimulator from '@/components/usePhoneSimulator';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  PageHeader,
  PresenterButton,
  PresenterPanel,
  SectionLabel,
  cx,
  inputClass,
} from '@/components/ui';
import { REPORT_THEMES, timeAgo } from '@/lib/format';

export default function SpeakUpPage() {
  const [branches, setBranches] = useState([]);
  const [reports, setReports] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [themeFilter, setThemeFilter] = useState('ALL');
  const [newId, setNewId] = useState(null);
  const [retaliationTarget, setRetaliationTarget] = useState('');
  const [presenterNote, setPresenterNote] = useState(null);

  const { phoneProps, showScreen } = usePhoneSimulator();

  const loadReports = useCallback(async () => {
    const res = await fetch('/api/reports');
    if (res.ok) setReports(await res.json());
  }, []);

  useEffect(() => {
    showScreen('app');
    fetch('/api/branches')
      .then((r) => r.json())
      .then((b) => {
        setBranches(b);
        const all = b.flatMap((br) => br.bankers);
        const daniel = all.find((x) => x.name === 'Daniel Koh') || all[0];
        if (daniel) setEmployeeId(daniel.id);
      });
    loadReports();
  }, [showScreen, loadReports]);

  const employees = branches.flatMap((b) => b.bankers.map((x) => ({ ...x, branchName: b.name })));
  const employee = employees.find((e) => e.id === employeeId);
  const named = reports.filter((r) => !r.anonymous && r.reporter && !r.retaliationFlag);

  async function submitReport(payload) {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, reporterId: employeeId }),
    });
    const body = await res.json();
    if (!res.ok) return { error: body.error || 'Could not send the report.' };
    setNewId(body.id);
    await loadReports();
    return body;
  }

  async function act(id, action) {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const body = await res.json();
    if (action === 'adverse-action') {
      setPresenterNote(res.ok ? { tone: 'red', text: 'Retaliation flagged automatically and sent to the Audit Committee as a HIGH alert.' } : { tone: 'neutral', text: body.error });
    }
    await loadReports();
  }

  const themeCounts = Object.keys(REPORT_THEMES).map((k) => ({ key: k, count: reports.filter((r) => r.theme === k).length }));
  const visible = reports.filter((r) => themeFilter === 'ALL' || r.theme === themeFilter);
  const riverside = branches.find((b) => b.name === 'Riverside Branch');

  return (
    <div>
      <PageHeader
        module="M5"
        title="A hotline that bypasses the sales chain"
        description="Wells Fargo’s hotline routed complaints back through the same managers who benefited from the sales numbers. Here reports go straight to second-line Risk and the Audit Committee, and any adverse action against a named reporter is flagged automatically."
      />

      <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---------- Employee phone ---------- */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[300px]">
            <SectionLabel>Employee’s phone</SectionLabel>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.branchName}
                </option>
              ))}
            </select>
          </div>
          <CustomerPhone
            {...phoneProps}
            bankName="SpeakUp"
            canReply={false}
            onSend={() => {}}
            appContent={<SpeakUpAppScreen key={employeeId} employee={employee} branches={branches} onSubmit={submitReport} />}
          />
          <PresenterPanel className="w-[300px]">
            <p className="text-[12px] leading-snug text-indigo-900/80">
              Simulate branch management cutting a named reporter’s hours after they spoke up.
            </p>
            <select value={retaliationTarget} onChange={(e) => setRetaliationTarget(e.target.value)} className={cx(inputClass, 'text-xs')}>
              <option value="">Choose a named report…</option>
              {named.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.trackingCode} · {r.reporter.name}
                </option>
              ))}
            </select>
            <PresenterButton icon="alert" disabled={!retaliationTarget} onClick={() => act(retaliationTarget, 'adverse-action')}>
              Manager cuts reporter’s hours
            </PresenterButton>
            {presenterNote && <p className={cx('px-1 text-[11px]', presenterNote.tone === 'red' ? 'text-red-700' : 'text-slate-600')}>{presenterNote.text}</p>}
            <p className="px-1 text-[11px] text-indigo-800/70">Anonymous reporters can’t be targeted — management never learns who they are.</p>
          </PresenterPanel>
        </div>

        {/* ---------- Recipients ---------- */}
        <div className="min-w-0 space-y-6">
          <Card padded={false}>
            <div className="border-b border-slate-100 p-5">
              <CardHeader
                className="mb-3"
                icon="inbox"
                title="Second-line Risk & Audit Committee inbox"
                subtitle="The only place speak-up reports appear. Grouped by theme so repeated concerns stand out."
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setThemeFilter('ALL')}
                  className={cx('rounded-full px-3 py-1 text-xs font-semibold', themeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}
                >
                  All · {reports.length}
                </button>
                {themeCounts.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setThemeFilter(t.key)}
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      themeFilter === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600',
                      t.count === 0 && 'opacity-50',
                    )}
                  >
                    {REPORT_THEMES[t.key]} · {t.count}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {visible.map((r) => (
                <li key={r.id} className={cx('p-5', r.id === newId && 'animate-fade-up bg-violet-50/50')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold text-violet-700">{r.trackingCode}</span>
                    <Badge tone="neutral">{REPORT_THEMES[r.theme]}</Badge>
                    {r.branch && <Badge tone="blue">{r.branch.name}</Badge>}
                    {r.anonymous ? (
                      <Badge tone="green">
                        <Icon name="eyeOff" className="h-3 w-3" /> Anonymous
                      </Badge>
                    ) : (
                      <Badge tone="indigo">Named: {r.reporter?.name}</Badge>
                    )}
                    {r.retaliationFlag && (
                      <Badge tone="red" dot>
                        Retaliation flagged
                      </Badge>
                    )}
                    {r.id === newId && <Badge tone="violet">Just received</Badge>}
                    <span className="ml-auto text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{r.description}</p>
                  {r.retaliationNote && (
                    <Callout tone="red" icon="alert" className="mt-3">
                      {r.retaliationNote}
                    </Callout>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">Routed to {r.routedTo}</p>
                    {r.status === 'OPEN' ? (
                      <Button size="sm" variant="secondary" icon="check" onClick={() => act(r.id, 'review')}>
                        Mark reviewed
                      </Button>
                    ) : (
                      <Badge tone="green">Reviewed</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Business-line management view: locked */}
          <Card className="relative overflow-hidden">
            <CardHeader
              icon="building"
              title={`${riverside ? riverside.name : 'Branch'} manager’s dashboard`}
              subtitle="Business-line management view"
            />
            <div className="relative">
              <div className="pointer-events-none select-none space-y-2 blur-[3px]" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-100" />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Icon name="lock" className="h-5 w-5" />
                </span>
                <p className="mt-2 text-sm font-semibold text-slate-900">No access to speak-up reports</p>
                <p className="max-w-sm text-[13px] text-slate-500">
                  Branch and regional managers can’t see, count or search reports, so they can’t work out who spoke up.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
