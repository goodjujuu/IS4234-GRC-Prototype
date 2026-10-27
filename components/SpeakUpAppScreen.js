'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { REPORT_THEMES } from '@/lib/format';

// The independent speak-up hotline app on an employee's own phone (M5).
const fieldClass =
  'mt-1 block w-full rounded-lg border-0 bg-white px-2.5 py-1.5 text-[12px] text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500';

export default function SpeakUpAppScreen({ employee, branches, onSubmit }) {
  const [branchId, setBranchId] = useState('');
  const [theme, setTheme] = useState('SALES_PRESSURE');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await onSubmit({ branchId: branchId || employee?.branchId, theme, description, anonymous });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubmitted(result);
    setDescription('');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="shrink-0 bg-gradient-to-br from-violet-700 to-indigo-700 px-4 pb-4 pt-2 text-white">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Icon name="megaphone" className="h-4 w-4" /> SpeakUp
        </p>
        <p className="mt-0.5 text-[10px] leading-snug opacity-85">
          Independent hotline · goes straight to second-line Risk and the Audit Committee
        </p>
      </div>

      {submitted ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-slate-900">Report received</p>
          <p className="mt-1 text-[11px] text-slate-500">Your reference</p>
          <p className="font-mono text-[18px] font-semibold tracking-wider text-violet-700">{submitted.trackingCode}</p>
          <div className="mt-4 w-full space-y-1.5 rounded-xl bg-white p-3 text-left text-[11px] ring-1 ring-slate-200">
            <p className="flex items-start gap-1.5 text-emerald-700">
              <Icon name="check" className="mt-0.5 h-3 w-3 shrink-0" /> Sent to: second-line Risk &amp; Audit Committee
            </p>
            <p className="flex items-start gap-1.5 text-slate-600">
              <Icon name="eyeOff" className="mt-0.5 h-3 w-3 shrink-0" /> Not visible to branch or regional management
            </p>
            <p className="flex items-start gap-1.5 text-slate-600">
              <Icon name="lock" className="mt-0.5 h-3 w-3 shrink-0" />
              {submitted.anonymous ? 'Your identity is not recorded' : 'Your name is shared only with the recipients above'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(null)}
            className="mt-4 rounded-full bg-violet-700 px-5 py-1.5 text-[12px] font-medium text-white"
          >
            New report
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="scroll-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-8 pt-3">
          <label className="text-[11px] font-medium text-slate-600">
            Which branch is this about?
            <select value={branchId || employee?.branchId || ''} onChange={(e) => setBranchId(e.target.value)} className={fieldClass}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-medium text-slate-600">
            What is it about?
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className={fieldClass}>
              {Object.entries(REPORT_THEMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-medium text-slate-600">
            What happened?
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what you saw or were asked to do…"
              className={`${fieldClass} resize-none`}
            />
          </label>

          <button
            type="button"
            onClick={() => setAnonymous((a) => !a)}
            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-left ring-1 ring-slate-200"
          >
            <span>
              <span className="block text-[12px] font-medium text-slate-800">Stay anonymous</span>
              <span className="block text-[10px] leading-snug text-slate-500">
                {anonymous ? 'Nobody can identify you from this report' : `Named as ${employee?.name || 'you'} — recipients only`}
              </span>
            </span>
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${anonymous ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${anonymous ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          </button>

          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-xl bg-violet-700 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Sending securely…' : 'Send report'}
          </button>
        </form>
      )}
    </div>
  );
}
