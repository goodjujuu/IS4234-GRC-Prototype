import { notFound, redirect } from 'next/navigation';
import { CaseTable } from '@/components/CaseRows';
import { FlaggedAccounts, IndicatorNotice, ScoreSummary } from '@/components/EmployeeRecord';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { canViewCase, canViewEmployee } from '@/lib/access';
import { getNow } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { getEmployeeRecord } from '@/lib/record';
import { requireUser } from '@/lib/session';

export default async function EmployeeProfile({ params }) {
  const { id } = await params;
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const record = await getEmployeeRecord(id);
  if (!record) notFound();
  if (!canViewEmployee(user, record.employee)) redirect('/');
  const [allCases, now] = await Promise.all([prisma.case.findMany({ where: { employeeId: id }, orderBy: { openedAt: 'desc' } }), getNow(prisma)]);
  const cases = allCases.filter((c) => canViewCase(user, c));
  return (
    <div className="space-y-6">
      <PageHeader level="employee" eyebrow={`${record.employee.position}, Branch ${record.employee.branch.code} ${record.employee.branch.name}`} title={record.employee.name} description="This employee's risk score, metrics against peers, and the accounts and cases behind any flags." />
      <IndicatorNotice />
      <ScoreSummary record={record} />
      <FlaggedAccounts accounts={record.flaggedAccounts} />
      {cases.length > 0 && (
        <Card>
          <CardHeader icon="briefcase" title="Cases" />
          <CaseTable cases={cases} now={now} />
        </Card>
      )}
    </div>
  );
}
