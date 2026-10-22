'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function isOverdue(caseRecord) {
  return caseRecord.status !== 'RESOLVED' && new Date(caseRecord.deadlineAt) < new Date();
}

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cases')
      .then((res) => res.json())
      .then((data) => {
        setCases(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cases — M6 Escalation & Case Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tiered SLAs: Branch 5 days → Conduct Office 48h → CRO 24h. Overdue cases are highlighted below.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Level</th>
                <th className="px-4 py-2">Branch / Banker</th>
                <th className="px-4 py-2">Alert</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Deadline</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c.id} className={isOverdue(c) ? 'bg-red-50' : ''}>
                  <td className="px-4 py-2 font-medium text-slate-700">{c.level.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.branch?.name || '—'}{c.banker ? ` / ${c.banker.name}` : ''}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.alert?.type}</td>
                  <td className="px-4 py-2">
                    {c.status}
                    {isOverdue(c) && <span className="ml-2 text-xs font-semibold text-red-700">OVERDUE</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{new Date(c.deadlineAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Link href={`/cases/${c.id}`} className="text-xs underline text-slate-600">Open</Link>
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
