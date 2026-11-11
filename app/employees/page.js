import Link from 'next/link';
import { Avatar, Badge, Card, PageHeader, RiskBadge, cx } from '@/components/ui';
import { latestScores } from '@/lib/engine';
import { TIER_LABELS } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { METRICS } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const BAR = { HIGH: 'bg-red-400', MEDIUM: 'bg-amber-400', LOW: 'bg-emerald-400' };
const LEVELS = [['', 'All'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']];

function Chip({ href, active, children }) {
  return (
    <Link href={href} className={cx('rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-inset', active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
      {children}
    </Link>
  );
}

export default async function EmployeesPage({ searchParams }) {
  await requireUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const { branch = '', level = '' } = await searchParams;
  const [scores, employees, branches, flags] = await Promise.all([
    latestScores(prisma),
    prisma.employee.findMany({ include: { branch: true } }),
    prisma.branch.findMany({ orderBy: { code: 'asc' } }),
    prisma.case.findMany({ where: { kind: 'EMPLOYEE_FLAG', status: { not: 'CLOSED' } } }),
  ]);
  const byId = new Map(employees.map((e) => [e.id, e]));
  const flagFor = new Map(flags.map((f) => [f.employeeId, f]));
  const inBranch = scores.filter((s) => !branch || String(byId.get(s.employeeId).branch.code) === branch);
  const rows = inBranch.filter((s) => !level || s.level === level).sort((a, b) => b.score - a.score);
  const href = (b, l) => `/employees?${new URLSearchParams({ ...(b && { branch: b }), ...(l && { level: l }) })}`;
  const count = (l) => inBranch.filter((s) => !l || s.level === l).length;

  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow="Employee Conduct"
        title="Employees"
        description="Look up any employee's conduct risk score across the bank, filtered by branch or risk level, and open their profile."
      />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-xs font-medium text-slate-500">Level</span>
          {LEVELS.map(([l, label]) => <Chip key={label} href={href(branch, l)} active={level === l}>{label} <span className="opacity-60">{count(l)}</span></Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-xs font-medium text-slate-500">Branch</span>
          <Chip href={href('', level)} active={!branch}>All</Chip>
          {branches.map((b) => <Chip key={b.id} href={href(String(b.code), level)} active={branch === String(b.code)}>{b.code} {b.name}</Chip>)}
        </div>
      </Card>

      <Card padded={false}>
        <div className="hidden grid-cols-[1.4fr_1fr_1.3fr_1.2fr_1fr] gap-4 border-b border-slate-200 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:grid">
          <span>Employee</span><span>Branch</span><span>Risk score</span><span>Main driver</span><span className="text-right">Flag</span>
        </div>
        {rows.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">No employees match these filters.</p>}
        <ul className="divide-y divide-slate-100">
          {rows.map((s) => {
            const e = byId.get(s.employeeId);
            const top = METRICS.map((m) => ({ m, pts: s.metrics[m.key].contribution })).sort((a, b) => b.pts - a.pts)[0];
            const flag = flagFor.get(s.employeeId);
            return (
              <li key={s.id}>
                <Link href={`/employees/${e.id}`} className="grid gap-2 px-5 py-3 hover:bg-slate-50 md:grid-cols-[1.4fr_1fr_1.3fr_1.2fr_1fr] md:items-center md:gap-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={e.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{e.name}</span>
                      <span className="block truncate text-xs text-slate-500">{e.position}</span>
                    </span>
                  </span>
                  <span className="text-[13px] text-slate-600">{e.branch.code} {e.branch.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="w-7 text-right text-sm font-semibold tabular-nums text-slate-900">{s.score}</span>
                    <span className="h-1.5 flex-1 rounded-full bg-slate-100"><span className={cx('block h-1.5 rounded-full', BAR[s.level])} style={{ width: `${s.score}%` }} /></span>
                    <RiskBadge level={s.level} />
                  </span>
                  <span className="text-[13px] text-slate-600">{top.pts >= 5 ? top.m.label : <span className="text-slate-400">Nothing stands out</span>}</span>
                  <span className="md:text-right">{flag ? <Badge tone="neutral">With {TIER_LABELS[flag.tier].toLowerCase()}</Badge> : <span className="text-[13px] text-slate-400">No flag</span>}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
