import Link from 'next/link';
import { ActionForm } from '@/components/actions';
import Icon from '@/components/Icon';
import { Badge, Callout, Card, CardHeader, PageHeader, SectionLabel, TableWrap, tdClass, thClass } from '@/components/ui';
import { CHANGE_TONE, formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const GROUPS = [
  ['LEVEL', 'Risk levels'],
  ['WEIGHT', 'Metric weights'],
  ['WATCH', 'Warning signs'],
];

const LEVEL_UNITS = { level_medium: 'score', level_high: 'score', pressure_flag: 'index', branch_high_share: 'percent of staff' };

// A team lead sees the thresholds that apply to their team, read-only. The API also
// refuses any change they send, logs it and alerts internal audit.
async function TeamLeadThresholds() {
  const config = await prisma.scoringConfig.findMany({ where: { group: 'LEVEL' } });
  const order = ['level_medium', 'level_high', 'pressure_flag', 'branch_high_share'];
  const levels = order.map((k) => config.find((c) => c.key === k)).filter(Boolean);
  return (
    <div className="space-y-6">
      <PageHeader
        level="monitoring"
        eyebrow="Threshold Governance"
        title="Thresholds"
        description="See the current thresholds that decide when an employee or branch on your team is rated Medium or High."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {levels.map((c) => (
          <Card key={c.key}>
            <p className="text-[13px] font-medium text-slate-600">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{c.value}<span className="ml-1 text-xs font-normal text-slate-400">{LEVEL_UNITS[c.key]}</span></p>
            <p className="mt-2 text-[12px] leading-snug text-slate-500">{c.description}</p>
          </Card>
        ))}
      </div>
      <Callout tone="neutral" icon="lock">
        These values are read-only for team leads. Only the conduct risk team can propose a change, and the Chief Risk Officer must approve it.
      </Callout>
    </div>
  );
}

const STEPS = [
  { icon: 'sliders', who: 'Conduct risk team', text: 'Proposes a new value with a reason. Nothing changes yet.' },
  { icon: 'checkCircle', who: 'Chief Risk Officer', text: 'Approves or rejects it, seeing how many of today\'s flags it would weaken.' },
  { icon: 'shield', who: 'Internal audit', text: 'Is alerted to every proposal and decision, and each is written to the permanent log.' },
];

// The conduct risk team proposes changes: current values first, then the form, then
// what is waiting and the full change log.
async function ConductRiskThresholds() {
  const [config, requests] = await Promise.all([
    prisma.scoringConfig.findMany(),
    prisma.thresholdChangeRequest.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  const byKey = new Map(config.map((c) => [c.key, c]));
  const levels = ['level_medium', 'level_high', 'pressure_flag', 'branch_high_share'].map((k) => byKey.get(k)).filter(Boolean);
  const weights = config.filter((c) => c.group === 'WEIGHT' && c.key.startsWith('weight_')).sort((a, b) => b.value - a.value);
  const harm = config.filter((c) => c.group === 'WEIGHT' && c.key.startsWith('harm_'));
  const watch = config.filter((c) => c.group === 'WATCH');
  const maxWeight = Math.max(1, ...weights.map((w) => w.value));
  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');
  const levelFirst = [...config].sort((a, b) => GROUPS.findIndex((g) => g[0] === a.group) - GROUPS.findIndex((g) => g[0] === b.group));
  const labelFor = (key) => byKey.get(key)?.label || key;

  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Threshold Governance" title="Thresholds and Weights" description="Propose a change to a threshold or weight for the Chief Risk Officer to approve, and check every change that was proposed, approved or blocked." />

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.who} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Icon name={s.icon} className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Step {i + 1}</p>
                <p className="text-sm font-semibold text-slate-900">{s.who}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
          <Icon name="lock" className="h-3.5 w-3.5 text-slate-400" />
          No one can approve their own proposal. Branch managers and team leads cannot make changes, and any attempt is blocked and logged.
        </p>
      </Card>

      <section>
        <SectionLabel>Risk levels</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((c) => (
            <Card key={c.key}>
              <p className="text-[13px] font-medium text-slate-600">{c.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{c.value}<span className="ml-1 text-xs font-normal text-slate-400">{LEVEL_UNITS[c.key]}</span></p>
              <p className="mt-2 text-[12px] leading-snug text-slate-500">{c.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader icon="chart" title="Metric weights" subtitle="How many of the 100 score points each indicator can add." />
            <ul className="space-y-3">
              {weights.map((w) => (
                <li key={w.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-medium text-slate-800">{w.label.replace(/ weight$/, '')}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{w.value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-violet-500" style={{ width: `${(w.value / maxWeight) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {harm.map((c) => (
                <div key={c.key}>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{c.value}</p>
                  <p className="text-[12px] leading-snug text-slate-500">{c.description}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader icon="alert" title="Warning sign settings" subtitle="When the platform alerts internal audit that detection may be weakening." />
            <div className="grid gap-3 sm:grid-cols-2">
              {watch.map((c) => (
                <div key={c.key} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[13px] font-medium text-slate-800">{c.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{c.value}{c.key === 'flag_drop_pct' ? '%' : ''}</p>
                  <p className="text-[12px] leading-snug text-slate-500">{c.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="self-start lg:sticky lg:top-6">
          <CardHeader icon="sliders" title="Propose a change" subtitle="Nothing changes until the Chief Risk Officer approves it." />
          <ActionForm
            url="/api/thresholds/requests"
            submitLabel="Propose change"
            variant="accent"
            resultTone="amber"
            fields={[
              { name: 'configKey', label: 'Setting', type: 'select', defaultValue: 'level_high', options: levelFirst.map((c) => ({ value: c.key, label: `${c.label} (now ${c.value})` })) },
              { name: 'newValue', label: 'New value', type: 'number', step: 'any', required: true },
              { name: 'reason', label: 'Reason', type: 'textarea', rows: 3, required: true },
            ]}
          />
          <Callout tone="neutral" icon="chart" className="mt-4">
            To adjust a weight, use the false alarm rate on the <Link href="/overview" className="font-medium text-indigo-700 hover:underline">Live dashboard</Link> as evidence.
          </Callout>
        </Card>
      </div>

      <Card>
        <CardHeader icon="clock" title={`Awaiting the Chief Risk Officer (${pending.length})`} />
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing is waiting.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => {
              const hides = r.flagsBefore - r.flagsAfter;
              return (
                <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{labelFor(r.configKey)}</p>
                      <span className="text-sm tabular-nums text-slate-600">{r.oldValue} <Icon name="arrowRight" className="inline h-3 w-3 text-slate-400" /> {r.newValue}</span>
                      <Badge tone="amber">Pending</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Proposed by {r.requestedBy}, {formatDateTime(r.createdAt)}</p>
                    <p className="mt-1.5 text-[13px] text-slate-600">{r.reason}</p>
                  </div>
                  <div className="md:w-72">
                    {hides > 0 ? (
                      <Callout tone="red" icon="alert" title="Suppression check">Would lower the risk level of {hides} of today&rsquo;s {r.flagsBefore} flags.</Callout>
                    ) : (
                      <Callout tone="green" icon="check" title="Suppression check">Would not weaken any of today&rsquo;s {r.flagsBefore} flags.</Callout>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader icon="hash" title={`Change log (${decided.length})`} subtitle="Every approved, rejected and blocked change. The log is hash-chained, so any edit to it is detected." />
        <ol className="divide-y divide-slate-100">
          {decided.map((r) => (
            <li key={r.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr_auto] sm:items-start sm:gap-4">
              <span className="text-xs tabular-nums text-slate-500">{formatDateTime(r.createdAt)}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-900">
                  {labelFor(r.configKey)}, <span className="tabular-nums">{r.oldValue} to {r.newValue}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Proposed by {r.requestedBy}. {r.status === 'BLOCKED' ? 'Branch managers cannot change thresholds, so it was blocked and internal audit was alerted.' : `Decided by ${r.reviewedBy}. ${r.reviewNote || ''}`}
                </p>
                {r.reason && <p className="mt-0.5 text-[12px] italic text-slate-500">&ldquo;{r.reason}&rdquo;</p>}
              </div>
              <Badge tone={CHANGE_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

const STATUS_LABEL = { APPROVED: 'Approved', REJECTED: 'Rejected', BLOCKED: 'Blocked', PENDING: 'Pending' };

export default async function ThresholdsPage() {
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT']);
  if (user.role === 'TEAM_LEAD') return <TeamLeadThresholds />;
  if (user.role === 'CONDUCT_RISK') return <ConductRiskThresholds />;
  const [config, requests] = await Promise.all([
    prisma.scoringConfig.findMany(),
    prisma.thresholdChangeRequest.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  const labelFor = new Map(config.map((c) => [c.key, c.label]));
  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');
  const levelFirst = [...config].sort((a, b) => GROUPS.findIndex((g) => g[0] === a.group) - GROUPS.findIndex((g) => g[0] === b.group));

  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Threshold Governance" title="Thresholds and Weights" description="See the current thresholds and weights, propose or approve a change, and check every change that was proposed, approved or blocked." />
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
        <Callout tone="neutral" icon="lock" className="self-start">{user.role === 'CHIEF_RISK_OFFICER' ? 'You approve or reject proposals below. You cannot propose changes yourself.' : 'Internal audit tests these approvals and has read-only access.'}</Callout>
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
