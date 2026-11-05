import Link from 'next/link';
import { ActionButton, ActionForm } from '@/components/actions';
import { Badge, Callout, Card, CardHeader, PageHeader } from '@/components/ui';
import { formatClock, formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const STATUS = {
  PENDING: { tone: 'amber', text: 'Unconfirmed, do not act on this yet' },
  CONFIRMED: { tone: 'green', text: 'Confirmed by a reviewer' },
  CORRECTED: { tone: 'green', text: 'Corrected by a reviewer' },
};

function Section({ title, count, children }) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-[13px] font-semibold text-slate-800">{title} ({count})</p>
      <div className="mt-1 text-[13px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

export default async function BriefingPage() {
  const user = await requireUser(['CONDUCT_RISK', 'INTERNAL_AUDIT']);
  const briefing = await prisma.briefing.findFirst({ orderBy: { createdAt: 'desc' } });
  const f = briefing.facts;
  const status = STATUS[briefing.status];
  const canAct = user.role === 'CONDUCT_RISK';
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Risk reporting"
        title="Daily morning briefing"
        description="What changed overnight across the bank, with an AI draft of likely causes for you to confirm or correct."
        actions={canAct && <ActionButton url="/api/briefing" icon="refresh">Generate again</ActionButton>}
      />

      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-[13px] text-slate-600">
          <p><span className="text-slate-400">From</span> ConductGuard &lt;briefing@conductguard.demo&gt;</p>
          <p><span className="text-slate-400">To</span> Conduct risk team</p>
          <p className="font-semibold text-slate-800">Morning briefing, {formatClock(briefing.asOf)}</p>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-indigo-50/60 p-4 ring-1 ring-inset ring-indigo-100">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-indigo-950">Likely cause</p>
              <Badge tone={briefing.source === 'AI_MODEL' ? 'indigo' : 'neutral'}>{briefing.source === 'AI_MODEL' ? 'AI draft' : 'Simulated AI draft'}</Badge>
              <Badge tone={status.tone}>{status.text}</Badge>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-800">{briefing.summary}</p>
            {briefing.source === 'SIMULATED' && (
              <p className="mt-2 text-xs text-slate-500">Built from a template over the facts below because no model key is configured. Set ANTHROPIC_API_KEY and generate again for a live AI draft.</p>
            )}
            {briefing.confirmedBy && (
              <p className="mt-2 text-xs text-slate-600">{briefing.status === 'CONFIRMED' ? 'Confirmed' : 'Corrected'} by {briefing.confirmedBy}, {formatDateTime(briefing.confirmedAt)}.</p>
            )}
            {briefing.status === 'CORRECTED' && <p className="mt-1 text-xs text-slate-500">Original draft, kept for the record: {briefing.draft}</p>}
          </div>

          <Section title="New High cases" count={f.newHigh.length}>
            {f.newHigh.map((x) => `${x.name} (${x.branch}, ${x.score})`).join(', ') || 'None.'}
          </Section>
          <Section title="New Medium cases" count={f.newMedium.length}>
            {f.newMedium.map((x) => `${x.name} (${x.branch}, ${x.score})`).join(', ') || 'None.'}
          </Section>
          <Section title="Overdue reviews" count={f.overdue.length}>
            {f.overdue.map((x) => `${x.ref} ${x.title}`).join(', ') || 'None.'}
          </Section>
          <Section title="Branches with a rising Pressure Index" count={f.rising.length}>
            {f.rising.map((b) => `Branch ${b.code} ${b.name}, ${b.previous} to ${b.index}${b.level !== b.previousLevel ? `, now rated ${b.level.toLowerCase()}` : ''}`).join('. ') || 'None.'}{' '}
            <Link href="/pressure" className="font-medium text-indigo-700 hover:underline">Open the Pressure Index</Link>
          </Section>
          <Section title="Threshold change attempts" count={f.thresholdAttempts.length}>
            {f.thresholdAttempts.map((a) => `${a.requestedBy}, ${a.label.toLowerCase()} from ${a.oldValue} to ${a.newValue}, ${a.status.toLowerCase()}`).join('. ') || 'None.'}
          </Section>
        </div>
      </Card>

      {briefing.status === 'PENDING' && canAct && (
        <Card>
          <CardHeader icon="check" title="Reviewer confirmation" subtitle="Check the draft against the facts, then confirm or correct it." />
          <div className="grid gap-5 md:grid-cols-[auto_1fr]">
            <div>
              <ActionButton url={`/api/briefing/${briefing.id}`} body={{ action: 'confirm' }} variant="success" size="md" icon="check">Confirm draft</ActionButton>
            </div>
            <ActionForm url={`/api/briefing/${briefing.id}`} extra={{ action: 'correct' }} submitLabel="Save correction" variant="secondary" fields={[{ name: 'summary', label: 'Or correct it', type: 'textarea', rows: 3, required: true, defaultValue: briefing.summary }]} />
          </div>
        </Card>
      )}
      {briefing.status === 'PENDING' && !canAct && <Callout tone="neutral">The conduct risk team confirms or corrects this draft.</Callout>}
    </div>
  );
}
