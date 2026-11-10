import Link from 'next/link';
import Icon from '@/components/Icon';
import { IndicatorGrid, ScoreBreakdown, ScoreRing, ScoreScale, Section } from '@/components/ConductView';
import { FLAG_RULES } from '@/components/MyConduct';
import { Card, PageHeader, RiskBadge, cx } from '@/components/ui';
import { getNow, loadConfig } from '@/lib/engine';
import { formatDate, formatDateTime, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getEmployeeRecord } from '@/lib/record';
import { requireUser } from '@/lib/session';

const DAY = 24 * 60 * 60 * 1000;
const LEVEL_MEANING = {
  LOW: 'Your activity is in line with colleagues in the same role. Nothing needs your attention.',
  MEDIUM: 'Some of your activity stands out from colleagues in the same role, so your team lead will review it.',
  HIGH: 'Several parts of your activity stand out from colleagues in the same role, so the conduct risk team will review it.',
};

function OpenFlag({ flag, now, latest, medium }) {
  if (!flag) {
    return (
      <Card className="h-full">
        <div className="flex items-center gap-2 text-emerald-700">
          <Icon name="checkCircle" className="h-5 w-5" />
          <p className="text-[15px] font-semibold">No open flags</p>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          You are flagged only if your score reaches {medium}.{latest && ` Your score is ${latest.score}.`}
        </p>
      </Card>
    );
  }
  const high = flag.riskLevel === 'HIGH';
  const rule = FLAG_RULES[flag.riskLevel];
  return (
    <div className={cx('flex h-full flex-col rounded-2xl border p-5 shadow-card', high ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60')}>
      <div className="flex items-center justify-between gap-2">
        <div className={cx('flex items-center gap-2', high ? 'text-red-700' : 'text-amber-700')}>
          <Icon name="alert" className="h-5 w-5" />
          <p className="text-[15px] font-semibold">You have an open flag</p>
        </div>
        <RiskBadge level={flag.riskLevel} />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
        Raised on {formatDate(flag.evidence?.asOf || flag.openedAt)} when your score reached {flag.evidence?.score ?? latest?.score}.{rule && ` It is reviewed by ${rule.reviewer}.`}
      </p>
      <dl className="mt-4 space-y-2 text-[13px]">
        {[
          ['Case', flag.ref],
          ['Reviewer', flag.assignee || 'Being assigned'],
          ['Decision due', formatDateTime(flag.deadlineAt)],
          ['Time left', timeLeft(flag.deadlineAt, now)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href="/me/disputes" className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800">
        See why and respond
        <Icon name="arrowRight" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default async function MyDashboard() {
  const user = await requireUser(['EMPLOYEE']);
  const [record, openFlag, now, config] = await Promise.all([
    getEmployeeRecord(user.employeeId),
    prisma.case.findFirst({ where: { employeeId: user.employeeId, kind: 'EMPLOYEE_FLAG', status: { not: 'CLOSED' } }, orderBy: { openedAt: 'desc' } }),
    getNow(prisma),
    loadConfig(prisma),
  ]);
  const { employee, latest } = record;

  return (
    <div className="space-y-8">
      <PageHeader
        level="employee"
        eyebrow={`${employee.position}, Branch ${employee.branch.code} ${employee.branch.name}`}
        title={`Welcome, ${employee.name.split(' ')[0]}`}
        description="Check your conduct risk score, see what is driving it, and respond to any flag on your record."
      />

      {!latest ? (
        <Card>No score has been calculated for you yet. Scores are calculated every day at 6:00 am.</Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">My conduct risk score</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  <Icon name="refresh" className="h-3.5 w-3.5" />
                  Updated daily at 6:00 am
                </span>
              </div>
              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                <ScoreRing score={latest.score} level={latest.level} />
                <div className="w-full min-w-0 flex-1">
                  <RiskBadge level={latest.level} />
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{LEVEL_MEANING[latest.level]}</p>
                  <p className="mt-1 text-[13px] text-slate-500">A score is an indicator, not proof. A named person reviews every flag, and you can dispute it.</p>
                  <div className="mt-5"><ScoreScale score={latest.score} medium={config.level_medium} high={config.level_high} /></div>
                </div>
              </div>
              <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Last updated {formatDateTime(latest.asOf)} from the previous day&rsquo;s account activity. Next update {formatDateTime(new Date(new Date(latest.asOf).getTime() + DAY))}.
              </p>
            </Card>
            <OpenFlag flag={openFlag} now={now} latest={latest} medium={config.level_medium} />
          </div>

          <Section title={`Why is my score ${latest.score}?`} subtitle="Your score adds up points from four areas. The longer the bar, the more that area is driving your score.">
            <ScoreBreakdown latest={latest} />
          </Section>

          <Section title="My conduct indicators" subtitle="The seven measures behind your score. Each compares you with colleagues in the same role, and the further above them you are, the more points it adds.">
            <IndicatorGrid latest={latest} />
          </Section>
        </>
      )}
    </div>
  );
}
