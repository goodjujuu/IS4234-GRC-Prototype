import { ActionForm } from '@/components/actions';
import { Badge, Callout, Card, CardHeader, PageHeader, TableWrap, tdClass, thClass } from '@/components/ui';
import { CHANGE_TONE, formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const GROUPS = [
  ['LEVEL', 'Risk levels'],
  ['WEIGHT', 'Metric weights'],
  ['WATCH', 'Warning signs'],
];

export default async function ThresholdsPage() {
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT']);
  const [config, requests] = await Promise.all([
    prisma.scoringConfig.findMany(),
    prisma.thresholdChangeRequest.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  const labelFor = new Map(config.map((c) => [c.key, c.label]));
  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');
  const levelFirst = [...config].sort((a, b) => GROUPS.findIndex((g) => g[0] === a.group) - GROUPS.findIndex((g) => g[0] === b.group));
  const isTeamLead = user.role === 'TEAM_LEAD';
  const canUseForm = isTeamLead || user.role === 'CONDUCT_RISK';

  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Threshold Governance" title="Thresholds and weights" description="Current scoring thresholds and weights, with every proposed, approved and blocked change." />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader icon="sliders" title="Current settings" />
          <div className="space-y-4">
            {GROUPS.map(([group, title]) => (
              <div key={group}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
                <ul className="divide-y divide-slate-100">
                  {config.filter((c) => c.group === group).sort((a, b) => b.value - a.value).map((c) => (
                    <li key={c.key} className="flex items-start justify-between gap-4 py-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-800">{c.label}</p>
                        <p className="text-xs text-slate-500">{c.description}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        {canUseForm ? (
          <Card className="self-start">
            <CardHeader icon="sliders" title={isTeamLead ? 'Change a setting' : 'Propose a change'} subtitle={isTeamLead ? 'Every attempt is logged.' : 'Nothing changes until the Chief Risk Officer approves it.'} />
            <ActionForm
              url="/api/thresholds/requests"
              submitLabel={isTeamLead ? 'Apply change' : 'Propose change'}
              variant="accent"
              resultTone="amber"
              fields={[
                { name: 'configKey', label: 'Setting', type: 'select', defaultValue: 'level_high', options: levelFirst.map((c) => ({ value: c.key, label: `${c.label} (now ${c.value})` })) },
                { name: 'newValue', label: 'New value', type: 'number', step: 'any', required: true },
                { name: 'reason', label: 'Reason', type: 'textarea', rows: 2, required: true },
              ]}
            />
          </Card>
        ) : (
          <Callout tone="neutral" icon="lock" className="self-start">{user.role === 'CHIEF_RISK_OFFICER' ? 'You approve or reject proposals below. You cannot propose changes yourself.' : 'Internal audit tests these approvals and has read-only access.'}</Callout>
        )}
      </div>

      <Card>
        <CardHeader icon="clock" title={`Awaiting the Chief Risk Officer (${pending.length})`} subtitle="The approver sees how many of today's flags the change would weaken before deciding." />
        {pending.length === 0 && <p className="text-sm text-slate-500">Nothing is waiting.</p>}
        <div className="space-y-4">
          {pending.map((r) => {
            const hides = r.flagsBefore - r.flagsAfter;
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">{labelFor.get(r.configKey)}, {r.oldValue} to {r.newValue}</p>
                <p className="mt-0.5 text-xs text-slate-500">Proposed by {r.requestedBy}, {formatDateTime(r.createdAt)}</p>
                <p className="mt-1.5 text-[13px] text-slate-600">{r.reason}</p>
                {hides > 0 ? (
                  <Callout tone="red" icon="alert" className="mt-2" title="Suppression check">This change would lower the risk level of {hides} of today&rsquo;s {r.flagsBefore} flags.</Callout>
                ) : (
                  <p className="mt-2 text-[13px] text-slate-500">This change would not weaken any of today&rsquo;s flags.</p>
                )}
                {user.role === 'CHIEF_RISK_OFFICER' ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ActionForm url={`/api/thresholds/requests/${r.id}`} extra={{ action: 'reject' }} submitLabel="Reject" variant="danger" fields={[{ name: 'note', label: 'Reviewer note', type: 'text' }]} compact />
                    <ActionForm url={`/api/thresholds/requests/${r.id}`} extra={{ action: 'approve' }} submitLabel="Approve" variant="success" fields={[{ name: 'note', label: 'Justification', type: 'text' }]} compact />
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] font-medium text-slate-600">Waiting for the Chief Risk Officer.</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader icon="check" title={`Approved, rejected and blocked (${decided.length})`} />
        <TableWrap>
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr><th className={thClass}>Setting</th><th className={thClass}>Change</th><th className={thClass}>By</th><th className={thClass}>Decision</th></tr></thead>
            <tbody>
              {decided.map((r) => (
                <tr key={r.id}>
                  <td className={tdClass}>{labelFor.get(r.configKey)}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{r.oldValue} to {r.newValue}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{r.requestedBy}</td>
                  <td className={tdClass}><Badge tone={CHANGE_TONE[r.status]}>{r.status}</Badge><span className="ml-2 text-slate-500">{r.status === 'BLOCKED' ? 'Branch managers cannot change thresholds.' : `${r.reviewedBy}. ${r.reviewNote || ''}`}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
