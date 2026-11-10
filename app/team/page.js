import Link from 'next/link';
import Icon from '@/components/Icon';
import { Section } from '@/components/ConductView';
import { Avatar, Badge, Card, PageHeader, RiskBadge, cx } from '@/components/ui';
import { getNow, latestScores, loadConfig } from '@/lib/engine';
import { formatDateTime, isOverdue, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { METRICS } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const LEVELS = [
  ['HIGH', 'High', 'bg-red-400', 'Reviewed by the conduct risk team'],
  ['MEDIUM', 'Medium', 'bg-amber-400', 'Reviewed by you'],
  ['LOW', 'Low', 'bg-emerald-400', 'No action needed'],
];
const BAR = { HIGH: 'bg-red-400', MEDIUM: 'bg-amber-400', LOW: 'bg-emerald-400' };

// What the team lead can do about each person's flag, given where the case is routed.
function FlagStatus({ flag, now }) {
  if (!flag) return <span className="text-[13px] text-slate-400">No flag</span>;
  if (flag.tier === 'TEAM_LEAD') {
    return (
      <Link href={`/cases/${flag.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800">
        Review, {timeLeft(flag.deadlineAt, now)}
        <Icon name="arrowRight" className="h-3 w-3" />
      </Link>
    );
  }
  return <Badge tone="neutral">{flag.tier === 'AUDIT_COMMITTEE' ? 'With the audit committee' : 'With conduct risk'}</Badge>;
}

export default async function TeamPage() {
  const user = await requireUser(['TEAM_LEAD']);
  const [all, employees, flags, now, config] = await Promise.all([
    latestScores(prisma),
    prisma.employee.findMany({ where: { branchId: user.branchId } }),
    prisma.case.findMany({ where: { branchId: user.branchId, kind: 'EMPLOYEE_FLAG', status: { not: 'CLOSED' } }, orderBy: { deadlineAt: 'asc' } }),
    getNow(prisma),
    loadConfig(prisma),
  ]);
  const people = new Map(employees.map((e) => [e.id, e]));
  const team = all
    .filter((s) => s.branchId === user.branchId && s.employeeId !== user.employeeId)
    .sort((a, b) => b.score - a.score)
    .map((s) => {
      const top = METRICS.map((m) => ({ m, pts: s.metrics[m.key].contribution })).sort((a, b) => b.pts - a.pts)[0];
      return { ...s, employee: people.get(s.employeeId), flag: flags.find((f) => f.employeeId === s.employeeId), driver: top.pts >= 5 ? top.m.label : null };
    });
  const mine = flags.filter((f) => f.tier === 'TEAM_LEAD' && f.employeeId !== user.employeeId);
  const next = mine[0];
  const count = (level) => team.filter((t) => t.level === level).length;

  return (
    <div className="space-y-8">
      <PageHeader
        level="employee"
        eyebrow={`Branch ${user.branch.code} ${user.branch.name}`}
        title="My team"
        description="See how your team's conduct risk scores compare and review the Medium flags assigned to you."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className={cx('flex flex-col rounded-2xl border p-5 shadow-card', mine.length ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200/80 bg-white')}>
          <p className="text-[13px] font-medium text-slate-600">Waiting for my review</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-slate-900">{mine.length}</p>
          <p className="mt-1 text-[13px] text-slate-600">
            {next ? <>Next due {formatDateTime(next.deadlineAt)}, <span className={isOverdue(next, now) ? 'font-semibold text-red-700' : ''}>{timeLeft(next.deadlineAt, now)}</span>.</> : 'You are up to date.'}
          </p>
          {mine.length > 0 && (
            <Link href="/cases" className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800">
              Open my reviews
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-slate-900">Team at a glance</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              <Icon name="refresh" className="h-3.5 w-3.5" />
              Scores updated daily at 6:00 am
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-slate-500">{team.length} team members, by risk level. Each level is reviewed by a different person.</p>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {LEVELS.map(([key, , color]) => <div key={key} className={color} style={{ width: `${(count(key) / (team.length || 1)) * 100}%` }} />)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {LEVELS.map(([key, label, color, who]) => (
              <div key={key} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className={cx('h-2.5 w-2.5 rounded-sm', color)} />
                  <p className="text-[13px] font-medium text-slate-700">{label}</p>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{count(key)}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">{who}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Section title="Team members" subtitle={`Highest score first. Medium starts at ${config.level_medium} and High at ${config.level_high}. Select a name to see their indicators.`}>
        <Card padded={false}>
          <div className="hidden grid-cols-[1.4fr_1.2fr_1.3fr_1fr] gap-4 border-b border-slate-200 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:grid">
            <span>Employee</span><span>Risk score</span><span>Main driver</span><span className="text-right">Flag</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {team.map((t) => (
              <li key={t.id} className="grid gap-3 px-5 py-3.5 md:grid-cols-[1.4fr_1.2fr_1.3fr_1fr] md:items-center md:gap-4">
                <Link href={`/employees/${t.employeeId}`} className="group flex min-w-0 items-center gap-3">
                  <Avatar name={t.employee?.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">{t.employee?.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.employee?.position}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right text-sm font-semibold tabular-nums text-slate-900">{t.score}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div className={cx('h-1.5 rounded-full', BAR[t.level])} style={{ width: `${t.score}%` }} />
                  </div>
                  <RiskBadge level={t.level} />
                </div>
                <p className="text-[13px] text-slate-600">{t.driver || <span className="text-slate-400">Nothing stands out</span>}</p>
                <div className="md:text-right"><FlagStatus flag={t.flag} now={now} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-3 text-xs text-slate-500">
          High flags go to the conduct risk team so that a branch does not review the pressure it creates. You can see who is flagged but not decide those cases.
        </p>
      </Section>
    </div>
  );
}
