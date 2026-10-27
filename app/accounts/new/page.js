'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import CustomerPhone from '@/components/CustomerPhone';

// Fictional bank name used in the simulated SMS (deliberately not a real bank).
const BANK_NAME = 'Northbridge Bank';

// How long the simulated SMS takes to "arrive", and how long the bank's
// automated reply takes after the customer answers.
const SMS_DELIVERY_MS = 1800;
const BANK_REPLY_MS = 1100;

function clockTime(d = new Date()) {
  return d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
}

function longDate(d = new Date()) {
  return d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Demo stand-in for the last 4 digits of the customer's registered mobile.
// In a real deployment this comes from the customer record, and staff can't
// change it without going through M1 Contact-Integrity Guard.
function maskedMobile(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String(h % 10000).padStart(4, '0');
}

// "Ben Lim" -> "Ben L." — how a bank would identify staff in a customer SMS.
function staffShortName(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
}

function consentRequestSms(account) {
  return (
    `${BANK_NAME}: A new ${account.product} was requested in your name at ${account.branch.name} ` +
    `by staff member ${staffShortName(account.banker.name)} today at ${clockTime()}.\n\n` +
    'Reply YES to approve, or NO if you did not request this.\n\n' +
    'If we do not hear from you within 7 days, no account will be opened. ' +
    'We will never ask for your PIN or password.'
  );
}

const BANK_REPLIES = {
  approve: (account) =>
    `${BANK_NAME}: Thank you. Your ${account.product} is now active and ready to use.`,
  decline: () =>
    `${BANK_NAME}: Thank you for letting us know. The request has been cancelled and no account was opened. ` +
    'It has been referred to our independent Conduct team. You do not need to do anything else.',
  expire: (account) =>
    `${BANK_NAME}: We did not receive a reply, so the ${account.product} request has expired ` +
    'and no account was opened. No action is needed.',
  unknown: () =>
    `${BANK_NAME}: Sorry, we did not understand that. Reply YES to approve, or NO if you did not request this account.`,
};

const STATUS_PILL = {
  PENDING_CONSENT: { label: 'Pending customer consent', className: 'bg-amber-100 text-amber-800' },
  ACTIVE: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  DECLINED: { label: 'Blocked: customer declined', className: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Expired: no reply', className: 'bg-slate-200 text-slate-700' },
};

function Spinner({ className }) {
  return <span className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${className}`} />;
}

export default function NewAccountPage() {
  // Banker form
  const [branches, setBranches] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [bankerId, setBankerId] = useState('');
  const [error, setError] = useState('');

  // Application + consent flow
  const [account, setAccount] = useState(null);
  const [phase, setPhase] = useState('form'); // form | sending | awaiting | resolved
  const [busy, setBusy] = useState(false);

  // Customer's phone
  const [messages, setMessages] = useState([]);
  const [screen, setScreen] = useState('lock'); // lock | messages
  const [hasNotification, setHasNotification] = useState(false);
  const [bankTyping, setBankTyping] = useState(false);
  const [buzzKey, setBuzzKey] = useState(0);
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  const screenRef = useRef('lock');
  const timers = useRef([]);

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then(setBranches)
      .catch(() => setError('Could not load branches.'));
  }, []);

  // Live clock on the phone (set on the client only, to avoid a server/client mismatch).
  useEffect(() => {
    const tick = () => {
      setTime(clockTime());
      setDate(longDate());
    };
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const showScreen = useCallback((next) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  // A new SMS from the bank lands on the customer's phone.
  const deliverBankSms = useCallback((text) => {
    setBankTyping(false);
    setMessages((prev) => [...prev, { from: 'bank', text, time: clockTime() }]);
    setBuzzKey((k) => k + 1);
    if (screenRef.current === 'lock') setHasNotification(true);
  }, []);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedBanker = selectedBranch?.bankers.find((b) => b.id === bankerId);
  const loggedInBanker = account?.banker || selectedBanker;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, branchId, bankerId }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Failed to create account.');
      return;
    }
    const created = await res.json();
    setAccount(created);
    setPhase('sending');
    later(() => {
      deliverBankSms(consentRequestSms(created));
      setPhase('awaiting');
    }, SMS_DELIVERY_MS);
  }

  async function resolveConsent(action) {
    setBusy(true);
    const res = await fetch(`/api/accounts/${account.id}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      setBusy(false);
      setBankTyping(false);
      setError('Could not record the customer’s response. Try again.');
      return;
    }
    const updated = await res.json();
    setAccount(updated);
    setPhase('resolved');
    setBusy(false);
    if (action !== 'expire') setBankTyping(true);
    later(() => deliverBankSms(BANK_REPLIES[action](updated)), BANK_REPLY_MS);
  }

  // The customer types or taps a reply on their phone.
  function handleCustomerReply(text) {
    if (phase !== 'awaiting' || busy) return;
    setMessages((prev) => [...prev, { from: 'customer', text, time: clockTime() }]);
    const answer = text.trim().toUpperCase();
    if (answer === 'YES' || answer === 'Y') {
      resolveConsent('approve');
    } else if (answer === 'NO' || answer === 'N') {
      resolveConsent('decline');
    } else {
      setBankTyping(true);
      later(() => deliverBankSms(BANK_REPLIES.unknown()), BANK_REPLY_MS);
    }
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setAccount(null);
    setPhase('form');
    setCustomerName('');
    setBranchId('');
    setBankerId('');
    setError('');
    setMessages([]);
    setHasNotification(false);
    setBankTyping(false);
    showScreen('lock');
  }

  const mobile = account ? maskedMobile(account.id) : '';
  const pill = account ? STATUS_PILL[account.status] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">New Account — M2 Independent Consent Gate</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          The banker can submit an application, but only the customer can activate it, by replying to an SMS sent to
          their own registered mobile. The branch system has no approve button. A decline or a missed reply blocks the
          account and logs it against the banker and branch.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ---------------- Banker's screen ---------------- */}
        <section className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Banker’s screen</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 bg-slate-800 px-4 py-2 text-xs text-slate-200">
              <span className="font-semibold">Branch Account Opening System</span>
              <span className="truncate">
                {loggedInBanker ? `Logged in: ${loggedInBanker.name}` : 'Select a banker to log in'}
              </span>
            </div>

            <div className="p-5">
              {!account && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Branch</label>
                    <select
                      required
                      value={branchId}
                      onChange={(e) => {
                        setBranchId(e.target.value);
                        setBankerId('');
                      }}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select branch…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Banker</label>
                    <select
                      required
                      value={bankerId}
                      onChange={(e) => setBankerId(e.target.value)}
                      disabled={!selectedBranch}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      <option value="">Select banker…</option>
                      {selectedBranch?.bankers.map((banker) => (
                        <option key={banker.id} value={banker.id}>
                          {banker.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Customer name</label>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="e.g. Priya Raman"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Product</label>
                    <input
                      readOnly
                      value="Savings Account"
                      className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    />
                  </div>
                  <p className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Submitting sends a consent request to the customer’s registered mobile. The account stays inactive
                    until the customer approves it there.
                  </p>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {busy ? 'Submitting…' : 'Submit application'}
                  </button>
                </form>
              )}

              {account && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Application</p>
                      <p className="text-lg font-semibold text-slate-900">{account.customerName}</p>
                      <p className="text-sm text-slate-500">
                        {account.product} · {account.branch?.name}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${pill.className}`}>
                      {pill.label}
                    </span>
                  </div>

                  {phase === 'sending' && (
                    <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <Spinner className="border-slate-500" />
                      Sending consent request to the customer’s registered mobile ending {mobile}…
                    </div>
                  )}

                  {phase === 'awaiting' && account.status === 'PENDING_CONSENT' && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="flex items-center gap-3 font-medium">
                        <Spinner className="border-amber-500" />
                        Waiting for customer approval…
                      </p>
                      <p className="mt-2 text-amber-800">
                        This account cannot be activated from the branch system. Only the customer can approve it, from
                        their registered mobile ending {mobile}. If there is no reply within 7 days, the request expires
                        and no account is opened.
                      </p>
                    </div>
                  )}

                  {account.status === 'ACTIVE' && (
                    <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      The customer approved on their registered mobile. The account is now active. Your sales credit is
                      held as <span className="font-medium">provisional</span> until the customer actually uses the
                      account (M3).
                    </div>
                  )}

                  {account.status === 'DECLINED' && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      The customer replied that they did not request this account. It has been blocked, and this attempt
                      is logged against {account.banker?.name} and {account.branch?.name} for Conduct review.{' '}
                      <Link className="font-medium underline" href="/alerts">
                        View on Alerts
                      </Link>
                    </div>
                  )}

                  {account.status === 'EXPIRED' && (
                    <div className="rounded border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">
                      No reply from the customer within 7 days. The request expired and no account was opened. This is
                      logged against {account.banker?.name} and {account.branch?.name} for Conduct review.{' '}
                      <Link className="font-medium underline" href="/alerts">
                        View on Alerts
                      </Link>
                    </div>
                  )}

                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Consent channel</dt>
                      <dd className="text-slate-800">SMS to registered mobile •••• {mobile}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Sales credit</dt>
                      <dd className="text-slate-800">
                        {account.status === 'ACTIVE' ? 'Provisional (pending usage)' : 'None'}
                      </dd>
                    </div>
                  </dl>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  {phase === 'resolved' && (
                    <button onClick={reset} className="text-sm text-slate-600 underline">
                      Start another application
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- Customer's phone ---------------- */}
        <section className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer’s phone</p>
          <CustomerPhone
            time={time}
            date={date}
            screen={screen}
            hasNotification={hasNotification}
            messages={messages}
            bankName={BANK_NAME}
            canReply={phase === 'awaiting' && !busy}
            bankTyping={bankTyping}
            buzzKey={buzzKey}
            onOpenNotification={() => {
              setHasNotification(false);
              showScreen('messages');
            }}
            onBack={() => showScreen('lock')}
            onSend={handleCustomerReply}
          />

          <div className="w-[300px] rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Presenter controls</p>
            <p className="mt-0.5">For the demo only. Neither the banker nor the customer sees this.</p>
            <button
              type="button"
              onClick={() => resolveConsent('expire')}
              disabled={phase !== 'awaiting' || busy}
              className="mt-2 w-full rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Fast-forward 7 days with no reply
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
