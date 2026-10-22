'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const severityColor = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-800',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/alerts');
    setAlerts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEscalate(id) {
    const res = await fetch(`/api/alerts/${id}/escalate`, { method: 'POST' });
    if (res.ok) load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Conduct Alerts — M4 Conduct Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signals rolled up from M1 (blocked contact changes), M2 (consent declines/expiries), M3 (lapsed
          incentives), M4 (branch-wide patterns) and M5 (retaliation-flagged reports).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Branch / Banker</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-4 py-2 font-medium text-slate-700">{alert.source}</td>
                  <td className="px-4 py-2">{alert.type}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityColor[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {alert.branch?.name || '—'}{alert.banker ? ` / ${alert.banker.name}` : ''}
                  </td>
                  <td className="px-4 py-2 max-w-sm text-slate-600">{alert.description}</td>
                  <td className="px-4 py-2">{alert.status}</td>
                  <td className="px-4 py-2">
                    {alert.status === 'OPEN' && (
                      <button
                        onClick={() => handleEscalate(alert.id)}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        Escalate
                      </button>
                    )}
                    {alert.caseRecord && (
                      <Link href={`/cases/${alert.caseRecord.id}`} className="text-xs underline text-slate-600">
                        View case
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
