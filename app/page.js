import Link from 'next/link';
import Icon from '@/components/Icon';
import { LAYER_STYLES } from '@/components/nav';
import { Card, ModuleBadge, cx } from '@/components/ui';
import { getKriSummary } from '@/lib/kri';

export const dynamic = 'force-dynamic';

const LAYERS = [
  {
    key: 'prevent',
    title: 'Prevent',
    stops: 'Accounts opened without consent; fake contact details; staff-set PINs',
    modules: [
      { id: 'M1', name: 'Contact-Integrity Guard', href: '/customers', icon: 'contact', line: 'Blocks staff, shared and placeholder contact details; 48h cooling-off; customer-set PINs.' },
      { id: 'M2', name: 'Independent Consent Gate', href: '/accounts/new', icon: 'consent', line: 'The customer approves every new account on their own phone before it goes live.' },
    ],
  },
  {
    key: 'reward',
    title: 'Remove the reward',
    stops: 'Simulated funding; pressured approvals; accounts never used',
    modules: [
      { id: 'M3', name: 'Usage-Linked Incentive Engine', href: '/incentives', icon: 'coins', line: 'Sales credit stays provisional until the customer genuinely uses the account.' },
    ],
  },
  {
    key: 'detect',
    title: 'Detect',
    stops: 'Branch-wide gaming; manager pressure; ignored complaints',
    modules: [
      { id: 'M4', name: 'Conduct Analytics', href: '/alerts', icon: 'radar', line: 'Joins every signal into a banker and branch risk map with governed thresholds.' },
      { id: 'M5', name: 'Speak-Up Channel', href: '/speak-up', icon: 'megaphone', line: 'Reports go straight to Risk and the Audit Committee; retaliation is flagged.' },
    ],
  },
  {
    key: 'govern',
    title: 'Govern',
    stops: 'Pausing or narrowing monitoring; keeping the board uninformed',
    modules: [
      { id: 'M6', name: 'Escalation & Case Management', href: '/cases', icon: 'briefcase', line: 'Branch 5 days → Conduct Office 48h → CRO 24h, auto-escalated, fully audited.' },
      { id: 'M7', name: 'Tamper-Evident Control Governance', href: '/governance', icon: 'shield', line: 'Maker-checker threshold changes on a hash-chained, append-only log.' },
    ],
  },
];

const DEMO = [
  ['M2', '/accounts/new', 'Open an account and have the customer reply NO on their phone.'],
  ['M1', '/customers', 'Try to put the banker’s own number on a customer’s account.'],
  ['M3', '/incentives', 'Let a customer use their card, then run the 90-day review to credit the banker.'],
  ['M5', '/speak-up', 'File an anonymous report from an employee’s phone; the branch manager cannot see it.'],
  ['M4', '/alerts', 'Run analytics: Ben Lim lights up across several thresholds at once.'],
  ['M6', '/cases', 'Escalate the alert and fast-forward time to watch the SLA sweep take it to the CRO.'],
  ['M7', '/governance', 'A sales manager tries to loosen a threshold — it needs second-line sign-off, and tampering is caught.'],
  ['Board', '/board', 'Every action above has already reached the Board’s conduct dashboard.'],
];

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

export default async function HomePage() {
  const kri = await getKriSummary();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-40 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">IS4234 · Group 26 · Wells Fargo case study</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            One control chain from account opening to the boardroom.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
            Wells Fargo had an ethics code, a hotline and sales monitoring, but nothing linked customer consent,
            incentive pay and escalation. ConductGuard connects seven controls across four layers, so an unauthorised
            account has to beat all of them to go unnoticed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Start the demo <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 hover:bg-white/10"
            >
              Board dashboard
            </Link>
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Consent decline rate', pct(kri.consentDeclineRate)],
            ['Unused-account rate', pct(kri.unusedAccountRate)],
            ['Open conduct alerts', kri.openAlerts],
            ['Overdue cases', kri.overdueCases],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/10">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Four layers */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Four layers of defence</h2>
          <p className="text-sm text-slate-500">Every module is interactive. Click one to open it.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LAYERS.map((layer, i) => {
            const style = LAYER_STYLES[layer.key];
            return (
              <Card key={layer.key} className="flex flex-col" padded={false}>
                <div className="border-b border-slate-100 px-5 pb-4 pt-5">
                  <div className="flex items-center gap-2">
                    <span className={cx('flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold', style.soft)}>{i + 1}</span>
                    <h3 className="font-semibold">{layer.title}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    <span className="font-medium text-slate-600">Stops: </span>
                    {layer.stops}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2">
                  {layer.modules.map((m) => (
                    <Link key={m.id} href={m.href} className="group rounded-xl p-3 transition hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Icon name={m.icon} className={cx('h-4 w-4', style.text)} />
                        <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                        <span className="ml-auto">
                          <ModuleBadge module={m.id} />
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-snug text-slate-500">{m.line}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Demo path */}
      <section>
        <Card padded={false}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">Five-minute demo path</h2>
            <p className="text-sm text-slate-500">
              Run <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">npm run seed</code> first for a clean
              starting point. Riverside’s Ben Lim is the banker showing the Wells Fargo pattern.
            </p>
          </div>
          <ol className="divide-y divide-slate-100">
            {DEMO.map(([mod, href, text], i) => (
              <li key={href}>
                <Link href={href} className="group flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {i + 1}
                  </span>
                  {mod === 'Board' ? (
                    <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">Board</span>
                  ) : (
                    <ModuleBadge module={mod} />
                  )}
                  <span className="flex-1 text-sm text-slate-700">{text}</span>
                  <Icon name="arrowRight" className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}
