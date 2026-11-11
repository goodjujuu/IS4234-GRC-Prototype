import { Badge, Card, CardHeader, PageHeader } from '@/components/ui';
import { REPORT_THEMES, formatDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export default async function SpeakUpReportsPage() {
  await requireUser(['AUDIT_COMMITTEE']);
  // The seal is deliberately left out of the query, so it cannot reach this page.
  const reports = await prisma.speakUpReport.findMany({
    select: { id: true, trackingCode: true, theme: true, message: true, createdAt: true, branch: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div className="space-y-6">
      <PageHeader level="manager" eyebrow="Managers and Targets" title="Speak-Up Reports" description="Anonymous reports from branch staff, newest first." />
      <Card>
        <CardHeader icon="megaphone" title={`Reports (${reports.length})`} />
        <ul className="divide-y divide-slate-100">
          {reports.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-semibold tabular-nums text-slate-800">{r.trackingCode}</span>
                <Badge tone="neutral">{REPORT_THEMES[r.theme]}</Badge>
                <span className="text-slate-500">Branch {r.branch.code} {r.branch.name}, {formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{r.message}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
