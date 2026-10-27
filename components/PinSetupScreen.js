'use client';

import { useState } from 'react';

// The bank's secure PIN-setup web page, as opened on the customer's own phone
// from the SMS link. The PIN only ever lives in this component's state — it is
// never sent to the server (the server only records that the customer set one).
const PIN_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinSetupScreen({ bankName, linkLabel, onComplete, onDone }) {
  const [step, setStep] = useState('enter'); // enter | confirm | saving | done
  const [first, setFirst] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');

  async function press(key) {
    if (step === 'saving' || step === 'done') return;
    if (key === 'del') {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (!key || current.length >= PIN_LENGTH) return;

    const next = current + key;
    setCurrent(next);
    if (next.length < PIN_LENGTH) return;

    if (step === 'enter') {
      setError('');
      setFirst(next);
      setTimeout(() => {
        setCurrent('');
        setStep('confirm');
      }, 250);
      return;
    }

    // step === 'confirm'
    if (next !== first) {
      setTimeout(() => {
        setError('The PINs did not match. Please choose your PIN again.');
        setFirst('');
        setCurrent('');
        setStep('enter');
      }, 250);
      return;
    }
    setStep('saving');
    const ok = await onComplete();
    setFirst('');
    setCurrent('');
    if (ok) {
      setStep('done');
    } else {
      setError('Something went wrong. Please try again.');
      setStep('enter');
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {/* Simulated mobile browser address bar */}
      <div className="shrink-0 px-3 pb-2">
        <div className="flex items-center justify-center gap-1 rounded-lg bg-slate-200/80 px-3 py-1.5 text-[11px] text-slate-700">
          <svg width="9" height="11" viewBox="0 0 9 11" fill="currentColor" aria-hidden="true">
            <path d="M2 4.5V3a2.5 2.5 0 0 1 5 0v1.5h.5A1 1 0 0 1 8.5 5.5v4.5a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Zm1 0h3V3a1.5 1.5 0 0 0-3 0Z" />
          </svg>
          <span className="truncate">{linkLabel}</span>
        </div>
      </div>

      <div className="shrink-0 bg-emerald-800 px-4 py-2.5 text-white">
        <p className="text-[13px] font-semibold">{bankName}</p>
        <p className="text-[10px] opacity-80">Secure card PIN setup</p>
      </div>

      {step === 'done' ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <p className="mt-3 text-[15px] font-semibold text-slate-900">Your PIN has been set</p>
          <p className="mt-1 text-[12px] text-slate-600">
            Only you know it. Bank staff cannot see or reset it on your behalf.
          </p>
          <button
            type="button"
            onClick={onDone}
            className="mt-5 rounded-full bg-emerald-700 px-6 py-2 text-[13px] font-medium text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-5 pt-4">
          <p className="text-center text-[14px] font-semibold text-slate-900">
            {step === 'enter' ? 'Choose a 6-digit PIN' : 'Enter the same PIN again'}
          </p>
          <p className="mt-1 text-center text-[11px] text-slate-500">
            {step === 'saving' ? 'Saving securely…' : 'Never share your PIN with anyone, including bank staff.'}
          </p>

          <div className="mt-4 flex justify-center gap-3" aria-label={`${current.length} of ${PIN_LENGTH} digits entered`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full border border-slate-500 ${i < current.length ? 'bg-slate-800' : ''}`}
              />
            ))}
          </div>

          {error && <p className="mt-3 text-center text-[11px] text-red-600">{error}</p>}

          <div className="mt-auto grid grid-cols-3 gap-2 pb-8">
            {KEYS.map((key, i) =>
              key ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => press(key)}
                  disabled={step === 'saving'}
                  aria-label={key === 'del' ? 'Delete' : key}
                  className="h-11 rounded-xl bg-white text-[18px] font-medium text-slate-900 shadow-sm active:bg-slate-200 disabled:opacity-50"
                >
                  {key === 'del' ? '⌫' : key}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
