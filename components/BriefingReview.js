'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Callout, inputClass } from '@/components/ui';

// The reviewer's step on the AI draft: confirm it as written, or rewrite it.
export default function BriefingReview({ id, summary }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(body) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/briefing/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'That did not work.');
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Your review</p>
      {!editing ? (
        <>
          <p className="mt-0.5 text-[13px] text-slate-500">Check the summary against the figures in this briefing. Confirm it if it is accurate, or correct it if anything is wrong.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="success" icon="check" disabled={busy} onClick={() => send({ action: 'confirm' })}>{busy ? 'Working…' : 'Confirm, it is accurate'}</Button>
            <Button variant="secondary" icon="sliders" disabled={busy} onClick={() => setEditing(true)}>Correct it</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-0.5 text-[13px] text-slate-500">Rewrite the parts that are wrong. Your version replaces the AI draft, and the original is kept for the record.</p>
          <textarea className={`${inputClass} mt-3`} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon="check" disabled={busy} onClick={() => send({ action: 'correct', summary: text })}>{busy ? 'Working…' : 'Save correction'}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => { setEditing(false); setText(summary); setError(''); }}>Cancel</Button>
          </div>
        </>
      )}
      {error && <Callout tone="red" icon="alert" className="mt-3">{error}</Callout>}
    </div>
  );
}
