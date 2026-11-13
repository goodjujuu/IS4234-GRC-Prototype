'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { Button, Callout, Field, inputClass } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/format';

const PASSWORD = 'demo1234';

// The accounts the demo walks through, from the business up to the board.
// Core steps carry the story. The others add depth if time permits.
const WALKTHROUGH = [
  { email: 'maya.lindqvist@conductguard.demo', line: 'Business', core: true, show: 'See her High flag and why it was raised, dispute it and report sales pressure anonymously' },
  { email: 'daniel.okafor@conductguard.demo', line: 'Business', core: true, show: 'Review Medium flags on his team and see the fixed thresholds' },
  { email: 'priya.raman@conductguard.demo', line: 'Risk oversight', core: true, show: 'Morning briefing shows Branch 12 at High, then the Pressure Index and the manager and target case' },
  { email: 'samuel.ito@conductguard.demo', line: 'Independent assurance', core: false, show: 'Checks warning signs, verifies fixed settings and measures review effectiveness' },
  { email: 'margaret.flynn@conductguard.demo', line: 'Board oversight', core: true, show: 'Monthly summary, with the case and its full audit trail' },
];

export default function LoginPanel({ accounts }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function logIn(address, secret) {
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: address, password: secret }) });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(data.error);
    }
    window.location.href = data.redirect;
  }

  const walkthrough = WALKTHROUGH.map((w) => ({ ...w, account: accounts.find((a) => a.email === w.email) })).filter((w) => w.account);
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">Log in</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            logIn(email, password);
          }}
        >
          <Field label="Email">
            <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint={`Every demo account uses ${PASSWORD}.`}>
            <input className={inputClass} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <Callout tone="red" icon="alert">{error}</Callout>}
          <Button type="submit" disabled={busy} className="w-full">Log in</Button>
        </form>
      </div>
      <div className="space-y-6">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Demo walkthrough</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">One account per role, from the business up to the board.</p>
          <ol className="mt-3 space-y-2">
            {walkthrough.map(({ account: a, line, core, show }, i) => (
              <li key={a.email}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => logIn(a.email, PASSWORD)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-card transition disabled:opacity-50 ${core ? 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 hover:bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${core ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-slate-900">{a.name}</span>
                      <span className={`text-xs font-medium ${core ? 'text-indigo-700' : 'text-slate-500'}`}>{ROLE_LABELS[a.role]} · {line}</span>
                      {!core && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">If time permits</span>}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">{show}</span>
                  </span>
                  <Icon name="arrowRight" className={`h-4 w-4 shrink-0 ${core ? 'text-indigo-400' : 'text-slate-400'}`} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
