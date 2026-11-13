'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Callout, Field, inputClass } from '@/components/ui';

async function post(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: 'Could not reach the server. Please try again.' } };
  }
}

// A form that posts JSON to an API route, then refreshes the server-rendered page.
// Server rule failures are shown exactly as the route words them.
export function ActionForm({ url, fields, extra, submitLabel, variant = 'primary', icon, resetOnSuccess = true, resultTone = 'green', compact }) {
  const router = useRouter();
  const initial = Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? (f.type === 'select' ? f.options[0]?.value ?? '' : '')]));
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await post(url, { ...extra, ...values });
    setBusy(false);
    if (!ok) return setError(data.error || 'That did not work.');
    if (data.message) setMessage(data.message);
    if (resetOnSuccess) setValues(initial);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={compact ? 'space-y-2' : 'space-y-3'}>
      {fields.map((f) => (
        <Field key={f.name} label={f.label} hint={f.hint}>
          {f.type === 'textarea' ? (
            <textarea className={inputClass} rows={f.rows || 3} required={f.required} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          ) : f.type === 'select' ? (
            <select className={inputClass} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input className={inputClass} type={f.type || 'text'} step={f.step} required={f.required} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          )}
        </Field>
      ))}
      {error && <Callout tone="red" icon="alert">{error}</Callout>}
      {message && <Callout tone={resultTone} icon="check">{message}</Callout>}
      <Button type="submit" variant={variant} icon={icon} disabled={busy}>{busy ? 'Working…' : submitLabel}</Button>
    </form>
  );
}

// A single button that posts to an API route. Shows the route's message or error inline.
export function ActionButton({ url, body, children, variant = 'secondary', size = 'sm', icon, resultTone = 'green' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    setBusy(true);
    setResult(null);
    const { ok, data } = await post(url, body);
    setBusy(false);
    setResult(ok ? (data.message ? { tone: data.source === 'SIMULATED' ? 'amber' : resultTone, text: data.message } : null) : { tone: 'red', text: data.error || 'That did not work.' });
    router.refresh();
  }

  return (
    <div className="min-w-0">
      <Button variant={variant} size={size} icon={icon} onClick={run} disabled={busy}>{busy ? 'Working…' : children}</Button>
      {result && <Callout tone={result.tone} className="mt-2">{result.text}</Callout>}
    </div>
  );
}
