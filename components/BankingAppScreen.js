'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import { cents } from '@/lib/format';

// The customer's own mobile banking app (inside the simulated phone).
// Anything done here is customer-initiated — the only kind of activity that
// counts as genuine use for M3.

const ACTIONS = [
  { kind: 'SALARY_CREDIT', label: 'Salary in', sub: 'Northpoint · S$3,200', icon: 'briefcase', amountCents: 320000 },
  { kind: 'CARD_PAYMENT', label: 'Pay by card', sub: 'Kopi Corner · S$6.80', icon: 'coins', amountCents: -680 },
  { kind: 'BILL_PAYMENT', label: 'Pay a bill', sub: 'SP Utilities · S$84.50', icon: 'sparkles', amountCents: -8450 },
];

export default function BankingAppScreen({ bankName, account, onAction, busy, toast }) {
  const [declined, setDeclined] = useState('');

  if (!account) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-slate-500">
        Choose a customer to see their banking app.
      </div>
    );
  }

  const balance = (account.transactions || []).reduce((n, t) => n + t.amountCents, 0);
  const firstName = account.customerName.split(' ')[0];
  const last4 = (account.mobile || account.id).replace(/\D/g, '').slice(-4).padStart(4, '0');

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="shrink-0 px-4 pb-3 pt-1">
        <p className="text-[11px] text-slate-500">{bankName}</p>
        <p className="text-[17px] font-semibold text-slate-900">Hi, {firstName}</p>
      </div>

      <div className="mx-4 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-4 text-white shadow-md">
        <p className="text-[11px] opacity-80">
          {account.product} •••• {last4}
        </p>
        <p className="mt-1 text-[24px] font-semibold tabular-nums">
          S${(balance / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] opacity-75">Available balance</p>
      </div>

      <div className="mx-4 mt-3 grid shrink-0 grid-cols-3 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.kind}
            type="button"
            disabled={busy || account.status !== 'ACTIVE'}
            onClick={() => {
              if (a.amountCents < 0 && balance + a.amountCents < 0) {
                setDeclined('Payment declined — insufficient funds');
                setTimeout(() => setDeclined(''), 2200);
                return;
              }
              onAction(a.kind);
            }}
            className="flex flex-col items-center rounded-xl bg-white px-1 py-2 shadow-sm ring-1 ring-slate-200 transition active:scale-95 disabled:opacity-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Icon name={a.icon} className="h-4 w-4" />
            </span>
            <span className="mt-1 text-[11px] font-semibold text-slate-800">{a.label}</span>
            <span className="text-[9px] leading-tight text-slate-400">{a.sub}</span>
          </button>
        ))}
      </div>

      <p className="mx-4 mt-4 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent activity</p>
      <div className="scroll-thin mx-4 mt-1 min-h-0 flex-1 overflow-y-auto pb-8">
        {(account.transactions || []).length === 0 && (
          <p className="py-6 text-center text-[12px] text-slate-400">No transactions yet</p>
        )}
        {(account.transactions || []).map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 border-b border-slate-200/70 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-slate-800">{t.description}</p>
              <p className="text-[10px] text-slate-400">
                {new Date(t.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                {t.initiatedBy === 'STAFF' && ' · by branch staff'}
              </p>
            </div>
            <span className={`shrink-0 text-[12px] font-semibold tabular-nums ${t.amountCents < 0 ? 'text-slate-800' : 'text-emerald-600'}`}>
              {cents(t.amountCents)}
            </span>
          </div>
        ))}
      </div>

      {(toast || declined) && (
        <div
          className={`animate-slide-down absolute inset-x-3 top-1 z-10 rounded-xl px-3 py-2 text-[12px] text-white shadow-lg ${
            declined ? 'bg-red-600/95' : 'bg-slate-900/95'
          }`}
        >
          {declined || toast}
        </div>
      )}
    </div>
  );
}
