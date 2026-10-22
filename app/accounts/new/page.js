'use client';

import { useEffect, useState } from 'react';

export default function NewAccountPage() {
  const [branches, setBranches] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [bankerId, setBankerId] = useState('');
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then(setBranches)
      .catch(() => setError('Could not load branches.'));
  }, []);

  const selectedBranch = branches.find((b) => b.id === branchId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, branchId, bankerId }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Failed to create account.');
      return;
    }
    setAccount(await res.json());
  }

  async function handleConsent(action) {
    const res = await fetch(`/api/accounts/${account.id}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setAccount(await res.json());
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">New Account — M2 Independent Consent Gate</h1>
        <p className="mt-1 text-sm text-slate-600">
          Opening an account does not activate it. The customer must approve it on their own registered channel
          first; a decline or no-reply expiry blocks it and logs an alert against the banker and branch.
        </p>
      </div>

      {!account && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                <option key={b.id} value={b.id}>{b.name}</option>
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
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select banker…</option>
              {selectedBranch?.bankers.map((banker) => (
                <option key={banker.id} value={banker.id}>{banker.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Open account
          </button>
        </form>
      )}

      {account && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">Account for</p>
            <p className="text-lg font-semibold text-slate-900">{account.customerName}</p>
            <p className="mt-1 text-sm">
              Status: <span className="font-medium">{account.status}</span> · Consent channel:{' '}
              <span className="font-medium">{account.consentRequest?.channel}</span>
            </p>
          </div>

          {account.status === 'PENDING_CONSENT' && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Simulate the customer&apos;s response to the consent request:</p>
              <div className="flex gap-2">
                <button onClick={() => handleConsent('approve')} className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  Approve
                </button>
                <button onClick={() => handleConsent('decline')} className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500">
                  Decline
                </button>
                <button onClick={() => handleConsent('expire')} className="rounded bg-slate-500 px-3 py-2 text-sm font-medium text-white hover:bg-slate-400">
                  No reply (expire)
                </button>
              </div>
            </div>
          )}

          {account.status === 'ACTIVE' && (
            <p className="text-sm text-emerald-700">Consent approved — account is now active and incentive-eligible.</p>
          )}
          {(account.status === 'DECLINED' || account.status === 'EXPIRED') && (
            <p className="text-sm text-red-700">
              Account blocked. A conduct alert has been logged against this banker and branch — check{' '}
              <a className="underline" href="/alerts">Alerts</a>.
            </p>
          )}

          <button
            onClick={() => {
              setAccount(null);
              setCustomerName('');
              setBranchId('');
              setBankerId('');
            }}
            className="text-sm text-slate-500 underline"
          >
            Start another
          </button>
        </div>
      )}
    </div>
  );
}
