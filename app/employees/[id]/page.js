import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IndicatorGrid, ScoreBreakdown, ScoreRing, ScoreScale, Section } from '@/components/ConductView';
import { Badge, Card, PageHeader, RiskBadge } from '@/components/ui';
import { canViewCase, canViewEmployee } from '@/lib/access';
import { getNow, loadConfig } from '@/lib/engine';
import { OUTCOMES, TIER_LABELS, formatDate, formatDateTime, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getEmployeeRecord } from '@/lib/record';
import { requireUser } from '@/lib/session';

export default async function EmployeeProfile({ params }) {
  const { id } = await params;
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const record = await getEmployeeRecord(id);
  if (!record) notFound();
  if (!canViewEmployee(user, record.employee)) redirect('/');
  const [allCases, now, config] = await Promise.all([
    prisma.case.findMany({ where: { employeeId: id, kind: 'EMPLOYEE_FLAG' }, orderBy: { openedAt: 'desc' } }),
    getNow(prisma),
    loadConfig(prisma),
  ]);
  const { employee, latest } = record;
  const cases = allCases.map((c) => ({ ...c, visible: canViewCase(user, c) }));

  return (
    <div className="space-y-8">
      <PageHeader
        level="employee"
        eyebrow={`${employee.position}, Branch ${employee.branch.code} ${employee.branch.name}`}
        title={employee.name}
        description="See this employee's conduct risk score, what is driving it and every flag on their record."
      />

      {!latest ? (
        <Card>No score has been calculated for this employee yet.</Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <p className="text-base font-semibold text-slate-900">Conduct risk score</p>
              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                <ScoreRing score={latest.score} level={latest.level} />
                <div className="w-full min-w-0 flex-1">
                  <RiskBadge level={latest.level} />
                  <p className="mt-2 text-[13px] text-slate-500">A score is an indicator, not proof. Compare it with the evidence before deciding anything.</p>
                  <div className="mt-5"><ScoreScale score={latest.score} medium={config.level_medium} high={config.level_high} /></div>
                </div>
              </div>
              <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">Last updated {formatDateTime(latest.asOf)}. Scores are updated daily at 6:00 am.</p>
            </Card>
            <Card>
              <p className="text-base font-semibold text-slate-900">Flags on record</p>
              {cases.length === 0 ? (
                <p className="mt-2 text-[13px] text-slate-600">No flags. Flags are raised when the score reaches {config.level_medium}.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {cases.map((c) => {
                    const body = (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-900">{c.ref}</span>
                          <RiskBadge level={c.riskLevel} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {c.status === 'CLOSED' ? `${OUTCOMES[c.outcome]}, ${formatDate(c.closedAt)}` : `With ${TIER_LABELS[c.tier].toLowerCase()}, ${timeLeft(c.deadlineAt, now)}`}
                        </p>
                      </>
                    );
                    return (
                      <li key={c.id} className="py-2.5">
                        {c.visible ? <Link href={`/cases/${c.id}`} className="block hover:opacity-80">{body}</Link> : body}
                      </li>
                    );
                  })}
                </ul>
              )}
              {cases.some((c) => !c.visible) && <p className="mt-2 text-xs text-slate-500"><Badge tone="neutral">Read-only</Badge> Flags routed to another reviewer cannot be opened.</p>}
            </Card>
          </div>

          <Section title={`What makes up the score of ${latest.score}`} subtitle="Points from each of four areas. The longer the bar, the more that area is driving the score.">
            <ScoreBreakdown latest={latest} self={false} />
          </Section>

          <Section title="Conduct indicators" subtitle="The seven measures behind the score, each compared with colleagues in the same role.">
            <IndicatorGrid latest={latest} self={false} />
          </Section>
        </>
      )}
    </div>
  );
}
