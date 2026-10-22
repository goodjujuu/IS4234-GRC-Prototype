'use client';

import { useEffect, useState } from 'react';

export default function CaseDetailPage({ params }) {
  const { id } = params;
  const [caseRecord, setCaseRecord] = useState(null);
  const [actor, setActor] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch(`/api/cases/${id}`);
    if (res.ok) setCaseRecord(await res.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAction(action) {
    setError('');
    if (!actor) {
      setError('Enter who is taking this action.');
      return;
    }
    const res = await fetch(`/api/cases/${id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, actor, note }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Action failed.');
      return;
    }
    setCaseRecord(await res.json());
    setNote('');
  }

  if (!caseRecord) return <p className="text-sm text-slate-500">Loading…</p>;

  const isOverdue = caseRecord.status !== 'RESOLVED' && new Date(caseRecord.deadlineAt) < new Date();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Case — {caseRecord.level.replace('_', ' ')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          From alert: <span className="font-medium">{caseRecord.alert?.type}</span> at{' '}
          {caseRecord.branch?.name}{caseRecord.banker ? ` / ${caseRecord.banker.name}` : ''}
        </p>
        <p className="mt-1 text-sm">
          Status: <span className="font-medium">{caseRecord.status}</span> · Deadline:{' '}
          <span className={isOverdue ? 'font-semibold text-red-700' : 'font-medium'}>
            {new Date(caseRecord.deadlineAt).toLocaleString()} {isOverdue && '(OVERDUE)'}
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Audit trail</h2>
        <ul className="mt-3 space-y-3">
          {caseRecord.events.map((event) => (
            <li key={event.id} className="border-l-2 border-slate-300 pl-3 text-sm">
              <p className="font-medium text-slate-800">
                {event.action} <span className="text-slate-500">— {event.actor}</span>
              </p>
              {event.note && <p className="text-slate-600">{event.note}</p>}
              <p className="text-xs text-slate-400">{new Date(event.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </div>

      {caseRecord.status !== 'RESOLVED' && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Take action</h2>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Your role/name (e.g. Conduct Office Analyst)"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            {caseRecord.level !== 'CRO' && (
              <button onClick={() => handleAction('escalate')} className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500">
                Escalate to next tier
              </button>
            )}
            <button onClick={() => handleAction('resolve')} className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
