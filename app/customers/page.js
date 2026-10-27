'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import CustomerPhone from '@/components/CustomerPhone';
import PinSetupScreen from '@/components/PinSetupScreen';
import { Button, PageHeader, PresenterButton, PresenterPanel, SectionLabel, SystemWindow, inputClass } from '@/components/ui';
import usePhoneSimulator from '@/components/usePhoneSimulator';
import {
  STAFF_EMAIL_DOMAIN,
  displayValue,
  fieldLabel,
  formatMobile,
  maskEmail,
  maskMobile,
} from '@/lib/contactRules';

// Fictional bank name used in the simulated SMS (deliberately not a real bank).
const BANK_NAME = 'Northbridge Bank';
const SMS_DELIVERY_MS = 1600;
const BANK_REPLY_MS = 1100;

function staffShortName(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
}

function masked(field, value) {
  return field === 'MOBILE' ? maskMobile(value) : maskEmail(value);
}

function randomGenuineMobile() {
  return `9${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-SG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const SMS = {
  pending: ({ field, newValue }, branchName, bankerName) =>
    `${BANK_NAME}: A request was made at ${branchName} today by staff member ${staffShortName(bankerName)} ` +
    `to change the ${fieldLabel(field)} on your account to ${masked(field, newValue)}. ` +
    'For your security, this only takes effect after 48 hours.\n\n' +
    'Reply YES to confirm now, or NO if you did not ask for this change.',
  blocked: ({ field }, branchName) =>
    `${BANK_NAME}: We stopped a request made at ${branchName} today to change the ${fieldLabel(field)} on your account. ` +
    'No changes were made and you do not need to do anything.\n\nWe will never ask for your PIN or password.',
  confirm: ({ field, newValue }) =>
    `${BANK_NAME}: Thank you. The ${fieldLabel(field)} on your account has been updated to ${masked(field, newValue)}.`,
  cancel: ({ field, oldValue }) =>
    `${BANK_NAME}: Thank you. The change has been cancelled and reported to our independent Conduct team. ` +
    `Your ${fieldLabel(field)} stays as ${masked(field, oldValue)}.`,
  elapsed: ({ field, newValue }, branchName) =>
    `${BANK_NAME}: As requested at ${branchName}, the ${fieldLabel(field)} on your account was changed to ` +
    `${masked(field, newValue)}. If you did not ask for this, call us immediately on the number on the back of your card.`,
  unknown: () => `${BANK_NAME}: Sorry, we did not understand that. Reply YES to confirm the change, or NO if you did not ask for it.`,
  pinLink: () =>
    `${BANK_NAME}: Set the PIN for your debit card using the secure link below. It expires in 24 hours.\n\n` +
    'Never share your PIN with anyone, including bank staff.',
  pinSet: () =>
    `${BANK_NAME}: Your debit card PIN has been set. If this was not you, call us immediately on the number on the back of your card.`,
};

const CHANGE_STATUS = {
  BLOCKED: { label: 'Blocked by M1 rules', className: 'bg-red-100 text-red-800' },
  PENDING_COOLING_OFF: { label: 'Cooling-off (48h)', className: 'bg-amber-100 text-amber-800' },
  CONFIRMED_BY_CUSTOMER: { label: 'Confirmed by customer', className: 'bg-emerald-100 text-emerald-800' },
  APPLIED_AFTER_COOLING_OFF: { label: 'Applied after 48h', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED_BY_CUSTOMER: { label: 'Customer said NO', className: 'bg-red-100 text-red-800' },
};

function Spinner({ className }) {
  return <span className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${className}`} />;
}

export default function CustomerDetailsPage() {
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bankerId, setBankerId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [detail, setDetail] = useState(null);

  const [field, setField] = useState('MOBILE');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Latest M1 outcome shown on the banker's screen, and any change in cooling-off.
  const [result, setResult] = useState(null); // { status, changeRequest, branchName, bankerName }
  const [pendingChange, setPendingChange] = useState(null);
  const [pinLink, setPinLink] = useState('');

  const { phoneProps, receive, receiveLater, sendFromCustomer, reset: resetPhone, showScreen } = usePhoneSimulator();

  const bankers = branches.flatMap((b) => b.bankers.map((banker) => ({ ...banker, branchName: b.name })));
  const banker = bankers.find((b) => b.id === bankerId);
  const customers = accounts.filter((a) => a.status === 'ACTIVE');

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/accounts');
    if (res.ok) setAccounts(await res.json());
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    const res = await fetch(`/api/accounts/${id}`);
    if (res.ok) setDetail(await res.json());
  }, []);

  // Initial load: pick the first banker and first active customer so the demo is one click away.
  useEffect(() => {
    Promise.all([fetch('/api/branches').then((r) => r.json()), fetch('/api/accounts').then((r) => r.json())])
      .then(([branchData, accountData]) => {
        setBranches(branchData);
        setAccounts(accountData);
        const firstBanker = branchData.flatMap((b) => b.bankers)[0];
        const firstCustomer = accountData.find((a) => a.status === 'ACTIVE' && a.mobile);
        if (firstBanker) setBankerId(firstBanker.id);
        if (firstCustomer) setAccountId(firstCustomer.id);
      })
      .catch(() => setError('Could not load bankers and customers.'));
  }, []);

  // Switching customer = a different person's phone.
  useEffect(() => {
    loadDetail(accountId);
    resetPhone();
    setResult(null);
    setPendingChange(null);
    setPinLink('');
    setValue('');
    setError('');
  }, [accountId, loadDetail, resetPhone]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!banker || !detail) return;
    setError('');
    setBusy(true);
    const res = await fetch(`/api/accounts/${detail.id}/contact-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value, bankerId }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error || 'Could not submit the change.');
      return;
    }

    const { outcome, changeRequest, branchName } = body;
    setValue('');
    setResult({ status: changeRequest.status, changeRequest, branchName, bankerName: banker.name });
    if (outcome === 'BLOCKED') {
      receiveLater(SMS.blocked(changeRequest, branchName), SMS_DELIVERY_MS);
    } else {
      setPendingChange({ ...changeRequest, branchName, bankerName: banker.name });
      receiveLater(SMS.pending(changeRequest, branchName, banker.name), SMS_DELIVERY_MS);
    }
    loadDetail(detail.id);
  }

  async function resolveChange(action) {
    if (!pendingChange) return;
    setBusy(true);
    const res = await fetch(`/api/contact-changes/${pendingChange.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not record the customer’s response. Try again.');
      return;
    }
    const updated = await res.json();
    const change = { ...pendingChange, ...updated };
    setResult({ status: updated.status, changeRequest: change, branchName: change.branchName, bankerName: change.bankerName });
    setPendingChange(null);

    if (action === 'confirm') receiveLater(SMS.confirm(change), BANK_REPLY_MS, { asReply: true });
    if (action === 'cancel') receiveLater(SMS.cancel(change), BANK_REPLY_MS, { asReply: true });
    if (action === 'cooling-off-elapsed') receiveLater(SMS.elapsed(change, change.branchName), 600);

    loadDetail(change.accountId);
    loadAccounts();
  }

  // The customer types or taps a reply on their phone.
  function handleCustomerReply(text) {
    if (!pendingChange || busy) return;
    sendFromCustomer(text);
    const answer = text.trim().toUpperCase();
    if (answer === 'YES' || answer === 'Y') resolveChange('confirm');
    else if (answer === 'NO' || answer === 'N') resolveChange('cancel');
    else receiveLater(SMS.unknown(), BANK_REPLY_MS, { asReply: true });
  }

  async function sendPinLink() {
    if (!detail) return;
    setBusy(true);
    const res = await fetch(`/api/accounts/${detail.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-link' }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not send the PIN setup link.');
      return;
    }
    const label = `northbridgebank.com/pin/${randomCode()}`;
    setPinLink(label);
    receiveLater(SMS.pinLink(), SMS_DELIVERY_MS, { link: { label } });
    loadDetail(detail.id);
  }

  async function customerSetPin() {
    const res = await fetch(`/api/accounts/${detail.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'customer-set' }),
    });
    if (res.ok) loadDetail(detail.id);
    return res.ok;
  }

  function fill(nextField, nextValue) {
    setField(nextField);
    setValue(nextValue);
    setError('');
  }

  const otherCustomer = accounts.find((a) => a.id !== accountId && a.mobile);
  const staffEmail = banker
    ? `${banker.name.toLowerCase().trim().split(/\s+/).join('.')}@${STAFF_EMAIL_DOMAIN}`
    : `staff@${STAFF_EMAIL_DOMAIN}`;

  const pinStatusText = {
    NOT_SET: 'Not set',
    LINK_SENT: 'Setup link sent. Waiting for the customer to set it on their phone.',
    SET_BY_CUSTOMER: detail?.pinSetAt ? `Set by the customer on ${formatDateTime(detail.pinSetAt)}` : 'Set by the customer',
  };

  return (
    <div>
      <PageHeader
        module="M1"
        title="Contact details staff can’t quietly swap"
        description="Wells Fargo staff used placeholder emails and their own numbers so customers never heard about accounts opened in their name, and set customers’ PINs themselves. Here fake, staff-owned or shared contact details are blocked outright, any other change is announced to the customer’s existing mobile with a 48-hour cooling-off period, and only the customer can set a PIN."
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------------- Banker's screen ---------------- */}
        <section className="min-w-0">
          <SectionLabel>Banker’s screen</SectionLabel>
          <SystemWindow
            title="Branch Customer Servicing System"
            right={banker ? `Logged in: ${banker.name}` : 'Select a banker to log in'}
          >
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700">Logged in as</label>
                  <select
                    value={bankerId}
                    onChange={(e) => setBankerId(e.target.value)}
                    className={`mt-1.5 ${inputClass}`}
                  >
                    {branches.map((b) => (
                      <optgroup key={b.id} label={b.name}>
                        {b.bankers.map((bk) => (
                          <option key={bk.id} value={bk.id}>
                            {bk.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700">Customer</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className={`mt-1.5 ${inputClass}`}
                  >
                    <option value="">Select customer…</option>
                    {customers.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.customerName} — {a.product}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {detail && (
                <>
                  {/* Customer record */}
                  <dl className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-inset ring-slate-200/70 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-slate-500">Registered mobile</dt>
                      <dd className="font-medium text-slate-900">{maskMobile(detail.mobile)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Email</dt>
                      <dd className="truncate font-medium text-slate-900">{maskEmail(detail.email)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Home branch</dt>
                      <dd className="font-medium text-slate-900">{detail.branch?.name}</dd>
                    </div>
                  </dl>

                  {/* Contact change */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <h2 className="text-[15px] font-semibold text-slate-900">Update contact details</h2>
                    <div className="flex gap-4 text-sm">
                      {['MOBILE', 'EMAIL'].map((f) => (
                        <label key={f} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="field"
                            value={f}
                            checked={field === f}
                            onChange={() => {
                              setField(f);
                              setValue('');
                              setError('');
                            }}
                          />
                          {f === 'MOBILE' ? 'Mobile number' : 'Email address'}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        required
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={field === 'MOBILE' ? 'New mobile, e.g. 9876 5432' : 'New email, e.g. name@gmail.com'}
                        className={`min-w-0 flex-1 ${inputClass}`}
                      />
                      <Button type="submit" disabled={busy || !!pendingChange}>
                        Request change
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                  </form>

                  {/* Latest outcome */}
                  {result && <Outcome result={result} pendingChange={pendingChange} detail={detail} />}

                  {/* PIN */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <h2 className="text-[15px] font-semibold text-slate-900">Debit card PIN</h2>
                    <p className="text-sm text-slate-700">
                      Status: <span className="font-medium">{pinStatusText[detail.pinStatus]}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Staff cannot view, choose or reset a customer’s PIN. The customer sets it themselves through a
                      secure link sent to their registered mobile.
                    </p>
                    <button
                      type="button"
                      onClick={sendPinLink}
                      disabled={busy || detail.pinStatus === 'LINK_SENT'}
                      className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {detail.pinStatus === 'SET_BY_CUSTOMER' ? 'Send PIN reset link to customer' : 'Send PIN setup link to customer'}
                    </button>
                  </div>

                  {/* History */}
                  {detail.contactChanges?.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <h2 className="text-[15px] font-semibold text-slate-900">Contact change history</h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="text-left text-xs uppercase text-slate-500">
                            <tr>
                              <th className="py-1.5 pr-4">When</th>
                              <th className="py-1.5 pr-4">Change</th>
                              <th className="py-1.5 pr-4">Requested by</th>
                              <th className="py-1.5 pr-4">Outcome</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detail.contactChanges.map((c) => (
                              <tr key={c.id}>
                                <td className="whitespace-nowrap py-1.5 pr-4 text-slate-500">{formatDateTime(c.createdAt)}</td>
                                <td className="py-1.5 pr-4 text-slate-700">
                                  {c.field === 'MOBILE' ? 'Mobile' : 'Email'} → {displayValue(c.field, c.newValue)}
                                </td>
                                <td className="py-1.5 pr-4 text-slate-700">{c.banker?.name}</td>
                                <td className="py-1.5 pr-4">
                                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${CHANGE_STATUS[c.status]?.className}`}>
                                    {CHANGE_STATUS[c.status]?.label || c.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </SystemWindow>
        </section>

        {/* ---------------- Customer's phone ---------------- */}
        <section className="flex flex-col items-center gap-4">
          <SectionLabel className="w-[300px]">{detail ? `${detail.customerName}’s phone` : 'Customer’s phone'}</SectionLabel>
          <CustomerPhone
            {...phoneProps}
            bankName={BANK_NAME}
            canReply={!!pendingChange && !busy}
            onSend={handleCustomerReply}
            onLinkTap={() => showScreen('app')}
            appContent={
              <PinSetupScreen
                bankName={BANK_NAME}
                linkLabel={pinLink}
                onComplete={customerSetPin}
                onDone={() => {
                  showScreen('messages');
                  receiveLater(SMS.pinSet(), 700);
                }}
              />
            }
          />

          <PresenterPanel className="w-[300px]">
            <p className="text-[12px] font-medium text-indigo-900/80">Fill the banker’s form with…</p>
            <div className="grid grid-cols-1 gap-1.5">
              <Shortcut
                label="Banker’s own mobile"
                hint={banker?.mobile ? formatMobile(banker.mobile) : '—'}
                disabled={!banker?.mobile}
                onClick={() => fill('MOBILE', formatMobile(banker.mobile))}
              />
              <Shortcut
                label="Another customer’s mobile"
                hint={otherCustomer ? formatMobile(otherCustomer.mobile) : '—'}
                disabled={!otherCustomer}
                onClick={() => fill('MOBILE', formatMobile(otherCustomer.mobile))}
              />
              <Shortcut label="Placeholder email" hint="noemail@noemail.com" onClick={() => fill('EMAIL', 'noemail@noemail.com')} />
              <Shortcut label="Staff email" hint={staffEmail} onClick={() => fill('EMAIL', staffEmail)} />
              <Shortcut label="Genuine new mobile" hint="random 9xxx xxxx" onClick={() => fill('MOBILE', formatMobile(randomGenuineMobile()))} />
            </div>
            <PresenterButton onClick={() => resolveChange('cooling-off-elapsed')} disabled={!pendingChange || busy} hint="+48 hours">
              No reply from the customer
            </PresenterButton>
          </PresenterPanel>
        </section>
      </div>
    </div>
  );
}

function Shortcut({ label, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-left text-xs ring-1 ring-inset ring-indigo-100 hover:bg-indigo-50 disabled:opacity-50"
    >
      <span className="font-medium text-slate-700">{label}</span>
      <span className="truncate text-[11px] text-slate-400">{hint}</span>
    </button>
  );
}

function Outcome({ result, pendingChange, detail }) {
  const { status, changeRequest: c, branchName, bankerName } = result;
  const label = fieldLabel(c.field);
  const shown = displayValue(c.field, c.newValue);

  if (status === 'BLOCKED') {
    return (
      <div className="animate-fade-up rounded-xl bg-red-50 p-3.5 text-sm text-red-900 ring-1 ring-inset ring-red-200">
        <p className="font-semibold">Change blocked</p>
        <p className="mt-1">
          {shown}: {c.blockReason}
        </p>
        <p className="mt-2 text-red-800">
          Logged against {bankerName} and {branchName} for Conduct review. The customer has been told on their existing
          mobile that a change was attempted.{' '}
          <Link className="font-medium underline" href="/alerts">
            View on Alerts
          </Link>
        </p>
      </div>
    );
  }

  if (status === 'PENDING_COOLING_OFF' && pendingChange) {
    return (
      <div className="animate-fade-up rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
        <p className="flex items-center gap-3 font-medium">
          <Spinner className="border-amber-500" />
          Waiting out the 48-hour cooling-off period…
        </p>
        <p className="mt-2 text-amber-800">
          The new {label} ({shown}) takes effect on {formatDateTime(c.effectiveAt)} unless the customer objects. They
          have been notified on their current mobile, {maskMobile(detail.mobile)}, not the new one.
        </p>
      </div>
    );
  }

  if (status === 'CONFIRMED_BY_CUSTOMER' || status === 'APPLIED_AFTER_COOLING_OFF') {
    return (
      <div className="animate-fade-up rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-200">
        {status === 'CONFIRMED_BY_CUSTOMER'
          ? `The customer confirmed the change on their existing mobile. The ${label} is now ${shown}.`
          : `No objection within 48 hours. The ${label} is now ${shown}.`}
      </div>
    );
  }

  if (status === 'CANCELLED_BY_CUSTOMER') {
    return (
      <div className="animate-fade-up rounded-xl bg-red-50 p-3.5 text-sm text-red-900 ring-1 ring-inset ring-red-200">
        <p className="font-semibold">Customer replied NO</p>
        <p className="mt-1">
          They did not ask for this change. It has been cancelled and logged against {bankerName} and {branchName} for
          Conduct review.{' '}
          <Link className="font-medium underline" href="/alerts">
            View on Alerts
          </Link>
        </p>
      </div>
    );
  }

  return null;
}
