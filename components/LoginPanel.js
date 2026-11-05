'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { Button, Callout, Field, inputClass } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/format';

const PASSWORD = 'demo1234';

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

  const roles = Object.keys(ROLE_LABELS);
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
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">Or choose a demo account</h2>
        <div className="mt-3 space-y-4">
          {roles.map((role) => (
            <div key={role}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{ROLE_LABELS[role]}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.filter((a) => a.role === role).map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    disabled={busy}
                    onClick={() => logIn(a.email, PASSWORD)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-card transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">{a.name}</span>
                      <span className="block truncate text-xs text-slate-500">{a.title}</span>
                    </span>
                    <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
