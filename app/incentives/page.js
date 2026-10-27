'use client';

import { useCallback, useEffect, useState } from 'react';
import BankingAppScreen from '@/components/BankingAppScreen';
import CustomerPhone from '@/components/CustomerPhone';
import Icon from '@/components/Icon';
import usePhoneSimulator from '@/components/usePhoneSimulator';
import {
  Avatar,
  Badge,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PresenterButton,
  PresenterPanel,
  SectionLabel,
  SystemWindow,
  cx,
  inputClass,
} from '@/components/ui';
import { formatDateTime, sgd, timeAgo } from '@/lib/format';

const BANK_NAME = 'Northbridge Bank';
const DAY = 24 * 60 * 60 * 1000;

const STATUS = {
  PROVISIONAL: { label: 'Provisional', tone: 'amber' },
  PAID: { label: 'Paid', tone: 'green' },
  LAPSED: { label: 'Lapsed', tone: 'red' },
};

const EVENT_STYLE = {
  PROVISIONAL: { tone: 'amber', label: 'Held', sign: '' },
  PAID: { tone: 'green', label: 'Credited', sign: '+' },
  LAPSED: { tone: 'red', label: 'Lapsed', sign: '−' },
  RETENTION_BONUS: { tone: 'violet', label: 'Bonus', sign: '+' },
};

const OUTCOME_STYLE = {
  PAID: { tone: 'green', icon: 'checkCircle', title: (o) => `New account creation incentive of ${sgd(o.amount)} credited to ${o.bankerName}` },
  RETENTION_BONUS: { tone: 'violet', icon: 'sparkles', title: (o) => `12-month retention bonus of ${sgd(o.amount)} credited to ${o.bankerName}` },
  LAPSED: { tone: 'red', icon: 'x', title: (o) => `Incentive of ${sgd(o.amount)} lapsed for ${o.bankerName}` },
};

// Illustrative balanced scorecard: sales volume is capped at 20% of the score.
function scorecard(s) {
  const sales = Math.min(100, s.opened * 20);
  const usage = s.paid + s.lapsed > 0 ? Math.round((s.paid / (s.paid + s.lapsed)) * 100) : 100;
  const outcomes = s.consents > 0 ? Math.round((1 - s.declined / s.consents) * 100) : 100;
  const conduct = Math.max(0, 100 - s.openAlerts * 20);
  const parts = [
    { label: 'Sales volume', weight: 20, score: sales },
    { label: 'Customers actually using accounts', weight: 30, score: usage },
    { label: 'Customer outcomes (consent given)', weight: 25, score: outcomes },
    { label: 'Conduct record (open alerts)', weight: 25, score: conduct },
  ];
  const total = Math.round(parts.reduce((n, p) => n + (p.score * p.weight) / 100, 0));
  return { parts, total };
}

function daysSince(date) {
  return date ? Math.floor((Date.now() - new Date(date).getTime()) / DAY) : null;
}

export default function IncentivesPage() {
  const [data, setData] = useState({ ledger: [], accounts: [], events: [] });
  const [bankerId, setBankerId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [outcomes, setOutcomes] = useState(null);
  const [reviewLabel, setReviewLabel] = useState('');

  const { phoneProps, showScreen, later } = usePhoneSimulator();

  const load = useCallback(async () => {
    const res = await fetch('/api/incentives');
    if (res.ok) setData(await res.json());
  }, []);

  const loadCustomer = useCallback(async (id) => {
    if (!id) return setCustomer(null);
    const res = await fetch(`/api/accounts/${id}`);
    if (res.ok) setCustomer(await res.json());
  }, []);

  useEffect(() => {
    showScreen('app');
    fetch('/api/incentives')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const ben = d.ledger.find((b) => b.name === 'Ben Lim') || d.ledger[0];
        if (ben) setBankerId(ben.id);
        const provisional = d.accounts.find((a) => a.status === 'ACTIVE' && a.incentiveStatus === 'PROVISIONAL' && a.bankerId === ben?.id);
        const first = provisional || d.accounts.find((a) => a.status === 'ACTIVE');
        if (first) setCustomerId(first.id);
      });
  }, [showScreen]);

  useEffect(() => {
    loadCustomer(customerId);
  }, [customerId, loadCustomer]);

  const banker = data.ledger.find((b) => b.id === bankerId);
  const bankerAccounts = data.accounts.filter((a) => a.bankerId === bankerId && a.status === 'ACTIVE');
  const bankerEvents = data.events.filter((e) => e.bankerId === bankerId);
  const activeCustomers = data.accounts.filter((a) => a.status === 'ACTIVE');
  const card = banker ? scorecard(banker.scorecardInputs) : null;

  async function customerAction(kind) {
    if (!customer) return;
    setBusy(true);
    const res = await fetch(`/api/accounts/${customer.id}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
    setBusy(false);
    if (!res.ok) return;
    if (kind !== 'STAFF_FUND_AND_REVERSE') {
      setToast(kind === 'SALARY_CREDIT' ? 'Salary received' : 'Payment successful');
      later(() => setToast(''), 2200);
    }
    await Promise.all([loadCustomer(customer.id), load()]);
  }

  async function runReview(fastForwardDays, accountId) {
    setBusy(true);
    const res = await fetch('/api/incentives/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fastForwardDays, accountId }),
    });
    setBusy(false);
    if (!res.ok) return;
    const body = await res.json();
    setOutcomes(body.outcomes);
    setReviewLabel(
      accountId
        ? `${customer?.customerName}’s account reviewed as of ${new Date(body.asOf).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })} (+${fastForwardDays} days)`
        : 'All accounts due today reviewed',
    );
    await Promise.all([load(), customer ? loadCustomer(customer.id) : null]);
  }

  return (
    <div>
      <PageHeader
        module="M3"
        title="Incentives that only pay for real customers"
        description="Opening an account earns a banker only a provisional credit. It is credited when the customer genuinely uses the account within 90 days, with a bonus at 12 months. Money a banker moves in and back out to fake activity never counts."
      />

      {outcomes && (
        <Card className="mb-6 animate-fade-up">
          <CardHeader
            icon="refresh"
            title="90-day usage review complete"
            subtitle={reviewLabel}
            actions={
              <button type="button" onClick={() => setOutcomes(null)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
                <Icon name="x" className="h-4 w-4" />
              </button>
            }
          />
          {outcomes.length === 0 ? (
            <p className="text-sm text-slate-500">No accounts reached a review point. Try fast-forwarding 90 days.</p>
          ) : (
            <div className="space-y-2">
              {outcomes.map((o, i) => {
                const style = OUTCOME_STYLE[o.kind];
                return (
                  <Callout key={i} tone={style.tone} icon={style.icon} title={style.title(o)}>
                    {o.note}
                  </Callout>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------- Banker / incentive system ---------- */}
        <div className="min-w-0 space-y-6">
          <SystemWindow
            title="Incentive & Scorecard System"
            subtitle="Branch sales compensation"
            right={
              <select value={bankerId} onChange={(e) => setBankerId(e.target.value)} className={cx(inputClass, 'h-8 py-0 text-xs')}>
                {data.ledger.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.branchName}
                  </option>
                ))}
              </select>
            }
          >
            {banker && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Avatar name={banker.name} className="h-10 w-10 text-xs" />
                  <div>
                    <p className="font-semibold text-slate-900">{banker.name}</p>
                    <p className="text-[13px] text-slate-500">{banker.branchName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ['Held (provisional)', banker.totals.provisional, 'text-amber-600', 'Not paid until the customer uses the account'],
                    ['Credited', banker.totals.paid, 'text-emerald-600', 'Customers genuinely using accounts'],
                    ['Lapsed', banker.totals.lapsed, 'text-red-600', 'Accounts never used by the customer'],
                    ['Retention bonus', banker.totals.bonus, 'text-violet-600', 'Still open and used at 12 months'],
                  ].map(([label, value, color, hint]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className={cx('mt-1 text-xl font-semibold tabular-nums', color)}>{sgd(value)}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="mb-2 flex items-end justify-between">
                    <SectionLabel className="mb-0">Balanced scorecard</SectionLabel>
                    <p className="text-xs text-slate-500">
                      Overall <span className="text-base font-semibold text-slate-900">{card.total}</span>/100
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {card.parts.map((p) => (
                      <div key={p.label} className="grid grid-cols-[minmax(0,1fr)_120px_36px] items-center gap-3 text-[13px]">
                        <span className="truncate text-slate-600">
                          {p.label} <span className="text-slate-400">· {p.weight}%</span>
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className={cx('block h-full rounded-full', p.score >= 70 ? 'bg-emerald-500' : p.score >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${p.score}%` }}
                          />
                        </span>
                        <span className="text-right tabular-nums text-slate-700">{p.score}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Sales volume can never be more than 20% of a banker’s score, so opening unwanted accounts cannot carry a scorecard.
                  </p>
                </div>

                <div>
                  <SectionLabel>Accounts opened</SectionLabel>
                  {bankerAccounts.length === 0 ? (
                    <EmptyState title="No active accounts">Open one on the New Account page.</EmptyState>
                  ) : (
                    <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200/80">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Customer</th>
                            <th className="px-3 py-2">90-day window</th>
                            <th className="px-3 py-2">Customer activity</th>
                            <th className="px-3 py-2">Incentive</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bankerAccounts.map((a) => {
                            const age = daysSince(a.activatedAt);
                            const customerTx = a.transactions.filter((t) => t.initiatedBy === 'CUSTOMER').length;
                            const staffTx = a.transactions.filter((t) => t.initiatedBy === 'STAFF').length;
                            return (
                              <tr
                                key={a.id}
                                onClick={() => setCustomerId(a.id)}
                                className={cx('cursor-pointer hover:bg-slate-50', a.id === customerId && 'bg-indigo-50/50')}
                              >
                                <td className="px-3 py-2.5">
                                  <p className="font-medium text-slate-900">{a.customerName}</p>
                                  <p className="text-xs text-slate-500">{a.product}</p>
                                </td>
                                <td className="px-3 py-2.5">
                                  {a.incentiveStatus === 'PROVISIONAL' ? (
                                    <div className="w-32">
                                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, ((age || 0) / 90) * 100)}%` }} />
                                      </div>
                                      <p className="mt-1 text-xs text-slate-500">Day {age} of 90</p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500">Reviewed · opened {age} days ago</p>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-xs">
                                  <span className={customerTx ? 'text-emerald-700' : 'text-slate-400'}>
                                    {customerTx} by customer
                                  </span>
                                  {staffTx > 0 && <span className="ml-2 font-medium text-red-600">{staffTx} by staff</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <Badge tone={STATUS[a.incentiveStatus].tone} dot>
                                      {STATUS[a.incentiveStatus].label}
                                    </Badge>
                                    <span className="tabular-nums text-slate-600">{sgd(a.incentiveAmount)}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">Click an account to show that customer’s phone.</p>
                </div>

                <div>
                  <SectionLabel>Incentive ledger</SectionLabel>
                  <ul className="space-y-2">
                    {bankerEvents.slice(0, 8).map((e) => {
                      const style = EVENT_STYLE[e.kind];
                      return (
                        <li key={e.id} className="flex items-start gap-3 rounded-xl px-1 py-1.5">
                          <Badge tone={style.tone} className="mt-0.5 w-[72px] justify-center">
                            {style.label}
                          </Badge>
                          <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-600">{e.note}</p>
                          <div className="shrink-0 text-right">
                            <p className="text-[13px] font-semibold tabular-nums text-slate-800">
                              {style.sign}
                              {sgd(e.amount)}
                            </p>
                            <p className="text-[11px] text-slate-400">{timeAgo(e.createdAt)}</p>
                          </div>
                        </li>
                      );
                    })}
                    {bankerEvents.length === 0 && <p className="text-sm text-slate-500">No ledger entries yet.</p>}
                  </ul>
                </div>
              </div>
            )}
          </SystemWindow>
        </div>

        {/* ---------- Customer phone ---------- */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[300px]">
            <SectionLabel>Customer’s phone</SectionLabel>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              {activeCustomers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.customerName} ({STATUS[a.incentiveStatus].label.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <CustomerPhone
            {...phoneProps}
            bankName={BANK_NAME}
            canReply={false}
            onSend={() => {}}
            appContent={
              <BankingAppScreen bankName={BANK_NAME} account={customer} onAction={customerAction} busy={busy} toast={toast} />
            }
          />

          <PresenterPanel className="w-[300px]">
            <PresenterButton
              icon="alert"
              disabled={busy || !customer || customer.incentiveStatus !== 'PROVISIONAL'}
              onClick={() => customerAction('STAFF_FUND_AND_REVERSE')}
              hint="S$50 in, then out"
            >
              Banker fakes activity
            </PresenterButton>
            <PresenterButton
              icon="forward"
              disabled={busy || !customer || customer.incentiveStatus !== 'PROVISIONAL'}
              onClick={() => runReview(90, customer.id)}
              hint="+90 days"
            >
              Fast-forward this account
            </PresenterButton>
            <PresenterButton icon="refresh" disabled={busy} onClick={() => runReview(0)}>
              Run today’s review (all accounts)
            </PresenterButton>
            {customer && (
              <p className="px-1 pt-1 text-[11px] leading-snug text-indigo-800/80">
                {customer.customerName}: day {daysSince(customer.activatedAt)} of 90 ·{' '}
                {customer.transactions?.filter((t) => t.initiatedBy === 'CUSTOMER').length || 0} customer transactions ·
                incentive {STATUS[customer.incentiveStatus].label.toLowerCase()}
                {customer.lastUsedAt ? ` · last used ${formatDateTime(customer.lastUsedAt)}` : ''}
              </p>
            )}
          </PresenterPanel>
        </div>
      </div>
    </div>
  );
}
