import Link from 'next/link';
import { CaseFacts, DecisionPanel } from '@/components/CaseDecision';
import { CaseTimeline } from '@/components/CaseRows';
import { Section } from '@/components/ConductView';
import { Avatar, Card, PageHeader, RiskBadge, cx } from '@/components/ui';
import { CASE_KINDS, OUTCOMES, TIER_LABELS, formatDate, formatDateTime, formatHours, percent, timeLeft } from '@/lib/format';
import { PARTS } from '@/lib/pressure';

const OUTCOME_HELP = {
  CLEARED: 'No pressure problem found. The case closes with no action.',
  COACHING: 'Coach the manager on how they set targets and respond to flags.',
  INVESTIGATION: 'Refer the manager for a formal investigation.',
  TARGET_REVIEW: 'Send the branch target for adjustment, which fixes the cause of the pressure.',
};

// Plain-language reading of each Pressure Index part, from the snapshot stored on the case.
function partDetail(key, p, weeklyTarget) {
  return {
    missing: `${p.missing} of ${p.staff} staff (${percent(p.pctMissing)}) are missing a target of ${weeklyTarget} accounts a week.`,
    teamFlags: `${percent(p.flaggedShare)} of the team are rated Medium or High${p.flagsRising ? ', and flags are rising' : ''}.`,
    target: p.targetIncrease ? `The branch target rose ${percent(p.targetIncrease)} in the last 180 days.` : 'No target increase in the last 180 days.',
    spike: `Accounts opened in the last 3 days of each month run at ${p.spikeRatio.toFixed(1)} times an even spread.`,
    speakUp: `${p.speakUps} anonymous pressure reports from this branch in 90 days.`,
    response: `The manager takes ${formatHours(p.avgHours)} on average to act on a flag in their team.`,
    dismissals: `${p.dismissed} staff dismissed for sales misconduct in 90 days.`,
  }[key];
}

function PressureBreakdown({ p, weeklyTarget }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {[...PARTS].sort((a, b) => b.max - a.max).map((part) => {
        const pts = p.parts?.[part.key] ?? 0;
        return (
          <div key={part.key} className="grid gap-1 px-3.5 py-2.5 sm:grid-cols-[1fr_160px_44px] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-800">{part.label}</p>
              <p className="text-[12px] text-slate-500">{partDetail(part.key, p, weeklyTarget)}</p>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${(pts / part.max) * 100}%` }} />
            </div>
            <p className="text-right text-[13px] font-semibold tabular-nums text-slate-900">+{Math.round(pts)}<span className="font-normal text-slate-400">/{part.max}</span></p>
          </div>
        );
      })}
    </div>
  );
}

function TeamList({ team }) {
  return (
    <Card padded={false}>
      <ul className="divide-y divide-slate-100">
        {team.map((t) => (
          <li key={t.employeeId}>
            <Link href={`/employees/${t.employeeId}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
              <Avatar name={t.name} />
              <span className="flex-1 text-sm font-medium text-slate-900">{t.name}</span>
              <span className="w-8 text-right text-sm tabular-nums text-slate-700">{t.score}</span>
              <RiskBadge level={t.level} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// The review screen for a manager and target case or a dismissal pattern case.
export function BranchCase({ c, now, canAct, team, dismissals, pressureNow, config }) {
  const closed = c.status === 'CLOSED';
  const p = c.evidence?.pressure;
  const isPressure = c.kind === 'BRANCH_PRESSURE';
  const facts = [
    ['Branch', `Branch ${c.branch.code} ${c.branch.name}`, `Target ${c.branch.weeklyTarget} accounts a week`],
    ['Manager', c.employee?.name || pressureNow?.managerName || 'Not recorded', isPressure ? 'Under review' : 'Branch manager'],
    isPressure ? ['Pressure Index when raised', `${p?.index} of 100`, `High from ${config.pressure_flag}`] : ['Pressure Index today', pressureNow ? `${pressureNow.index} of 100` : 'Not available', pressureNow && `Rated ${pressureNow.rating.toLowerCase()}`],
    closed ? ['Decided', formatDate(c.closedAt), OUTCOMES[c.outcome]] : ['Decision due', formatDateTime(c.deadlineAt), timeLeft(c.deadlineAt, now), true],
  ];
  const highCount = team.filter((t) => t.level === 'HIGH').length;
  const flagged = team.filter((t) => t.level !== 'LOW').length;

  return (
    <div className="space-y-6">
      <PageHeader
        level="manager"
        eyebrow={`${c.ref}, ${CASE_KINDS[c.kind].toLowerCase()}`}
        title={isPressure ? `Review: Branch ${c.branch.code} manager and target` : `Review: dismissal at Branch ${c.branch.code}`}
        description={isPressure
          ? 'Check whether the manager and the sales target are creating pressure behind the employee flags, then record your decision.'
          : 'Check whether this dismissal is part of a wider pattern at the branch, then record your decision.'}
        actions={<Link href="/pressure" className="text-sm font-medium text-indigo-700 hover:underline">Open the Pressure Index</Link>}
      />

      <CaseFacts c={c} now={now} facts={facts} />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {isPressure && p && (
            <Section title="Why this case was raised" subtitle={`The branch Pressure Index reached ${p.index}, at or above the High threshold of ${config.pressure_flag}, while employee flags were rising. When pressure and flags rise together, the manager and target are reviewed, not only the employees.`}>
              <PressureBreakdown p={p} weeklyTarget={c.branch.weeklyTarget} />
              <p className="mt-2 text-xs text-slate-500">Each bar shows the points a part added out of the most it can add. As calculated when the case opened, {formatDateTime(c.openedAt)}.</p>
            </Section>
          )}

          {!isPressure && (
            <Section title="Why this case was raised" subtitle="Every dismissal for sales misconduct opens a review of the branch, so dismissals are treated as a possible pattern and not one person's failure.">
              <Card>
                <p className="text-[13px] leading-relaxed text-slate-700">{c.summary}</p>
                {c.evidence?.dismissal?.reason && <p className="mt-2 text-[13px] text-slate-600"><span className="font-medium">Reason recorded by HR.</span> {c.evidence.dismissal.reason}</p>}
              </Card>
            </Section>
          )}

          {dismissals.length > 0 && (
            <Section title={`Sales misconduct dismissals at this branch (${dismissals.length})`} subtitle="Several dismissals at one branch point to the conditions there, not only to the individuals.">
              <Card padded={false}>
                <ul className="divide-y divide-slate-100">
                  {dismissals.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
                      <span className="w-28 text-slate-500">{formatDate(d.dismissedAt)}</span>
                      <span className="font-medium text-slate-900">{d.employee?.name}</span>
                      <span className="text-slate-600">{d.reason}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}

          <Section title="The team today" subtitle={`${flagged} of ${team.length} staff are rated Medium or High, and ${highCount} are High. Select a name to open their profile.`}>
            <TeamList team={team} />
          </Section>

          <Section title="Audit trail" subtitle="Every action on this case with its time and who took it. It cannot be edited.">
            <Card><CaseTimeline events={c.events} format={formatDateTime} /></Card>
          </Section>
        </div>

        <div className={cx('space-y-4')}>
          <DecisionPanel
            c={c}
            canAct={canAct}
            steps={isPressure
              ? ['Check which parts of the Pressure Index are high.', 'Look at the team flags and any dismissals.', 'Decide whether the manager, the target or both need action.']
              : ['Read why the employee was dismissed.', 'Check other dismissals and flags at the branch.', 'Decide whether the branch needs action.']}
            help={OUTCOME_HELP}
          />
          <p className="px-1 text-xs text-slate-500">Cases about managers and targets go to {TIER_LABELS.CONDUCT_RISK.toLowerCase()} because a branch cannot independently review the pressure it creates.</p>
        </div>
      </div>
    </div>
  );
}
