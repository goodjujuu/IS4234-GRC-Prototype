import Link from 'next/link';

const layers = [
  {
    title: '1. Prevent',
    modules: 'M1 Contact-Integrity Guard · M2 Independent Consent Gate',
    desc: 'Blocks contact-change takeovers and requires the customer to approve the account on their own registered channel before it goes live.',
    status: 'M2 built. M1 shown as seeded/logged events.',
  },
  {
    title: '2. Remove the reward',
    modules: 'M3 Usage-Linked Incentive Engine',
    desc: 'Sales credit is provisional until the account is genuinely used; unused accounts lapse the incentive and get flagged for review.',
    status: 'Shown as seeded/logged events feeding the dashboard.',
  },
  {
    title: '3. Detect',
    modules: 'M4 Conduct Analytics · M5 Speak-Up Channel',
    desc: 'Aggregates red flags — blocked contacts, declined consent, lapsed incentives, complaints — into branch and banker-level patterns.',
    status: 'M4 built. M5 shown as seeded/logged events feeding M4.',
  },
  {
    title: '4. Govern',
    modules: 'M6 Escalation & Case Management · M7 Tamper-Evident Control Governance',
    desc: 'Tiered, time-stamped escalation (Branch 5d → Conduct Office 48h → CRO 24h) with an append-only audit trail and governed detection thresholds.',
    status: 'M6 built. M7 shown as seeded/logged events (config change log).',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales Conduct & Incentive Risk Monitoring Platform</h1>
        <p className="mt-2 text-slate-600">
          A technology-enabled prototype for IS4234 Group 26&apos;s Wells Fargo cross-selling case study. Four layers,
          seven modules (M1–M7), feeding a single Board Risk and Audit Committee conduct KRI dashboard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {layers.map((layer) => (
          <div key={layer.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{layer.title}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{layer.modules}</p>
            <p className="mt-2 text-sm text-slate-600">{layer.desc}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-emerald-700">{layer.status}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-900">Demo path</h3>
        <ol className="mt-2 list-decimal list-inside text-sm text-amber-900 space-y-1">
          <li>
            Open a new account on <Link className="underline" href="/accounts/new">New Account</Link> — this starts the M2
            consent gate.
          </li>
          <li>Simulate a decline or expiry — notice it gets blocked and logged.</li>
          <li>
            See it surface as a conduct signal on <Link className="underline" href="/alerts">Alerts</Link> (M4), alongside
            seeded M1/M3/M5 events.
          </li>
          <li>Escalate an alert into a <Link className="underline" href="/cases">Case</Link> (M6) and walk it through the tiers.</li>
          <li>Check the <Link className="underline" href="/board">Board Dashboard</Link> (M7) — the KRIs move as you act.</li>
        </ol>
      </div>
    </div>
  );
}
