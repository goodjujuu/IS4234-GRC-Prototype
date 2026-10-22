import { getKriSummary } from '@/lib/kri';

export const dynamic = 'force-dynamic';

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function BoardDashboardPage() {
  const kri = await getKriSummary();

  const tiles = [
    { label: 'Consent decline rate', value: pct(kri.consentDeclineRate), hint: 'M2 — declined/expired ÷ total consent requests' },
    { label: 'Unused-account rate', value: pct(kri.unusedAccountRate), hint: 'M3 — accounts lapsed for non-use ÷ total accounts' },
    { label: 'Complaints logged', value: kri.complaints, hint: 'M5 — Speak-Up Channel reports' },
    { label: 'Open conduct alerts', value: kri.openAlerts, hint: 'M4 — not yet escalated or dismissed' },
    { label: 'Overdue cases', value: kri.overdueCases, hint: 'M6 — past tiered SLA deadline, unresolved' },
    { label: 'Resolved cases', value: kri.resolvedCases, hint: 'M6 — closed out across all tiers' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Board Risk & Audit Committee — Conduct KRI Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          M7&apos;s output: a single governed view aggregating M1–M6 signals, refreshed live from the underlying data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{tile.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{tile.label}</p>
            <p className="mt-1 text-xs text-slate-400">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">
          Tamper-Evident Control Governance — threshold/config change log (M7)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Append-only, hash-chained, and requires second-line sign-off before any detection threshold changes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Change</th>
                <th className="py-2 pr-4">Changed by</th>
                <th className="py-2 pr-4">Signed off by</th>
                <th className="py-2 pr-4">Hash</th>
                <th className="py-2 pr-4">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kri.configChanges.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-4">{c.change}</td>
                  <td className="py-2 pr-4">{c.changedBy}</td>
                  <td className="py-2 pr-4">{c.signedOffBy}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-500">{c.hash}</td>
                  <td className="py-2 pr-4 text-slate-500">{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
