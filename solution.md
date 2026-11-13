# 4 Technology Solution – ConductGuard

> Current prototype scope, 13 November 2026. Weights and thresholds are fixed and read-only.
> Proposal submission, approval, rejection, justification and related reporting are removed.
> This scope supersedes the proposal workflow described below. The Chief Risk Officer opens
> escalated cases. Configuration checks compare live settings with `DEFAULT_CONFIG`, and
> independent warning signs remain. Hash-chain logic and configuration-log displays are removed.
> A targeted migration removes legacy proposal and configuration-log storage and obsolete records.
> See `USER_GUIDE.md` for the current walkthrough.

## 4.1 Overview

ConductGuard is an observability platform for conduct risk in retail banking.

Its unique proposition is that it targets the sales pressure created by managers and targets, not only the behaviour of employees. Existing solutions such as EY's banker surveillance, NICE Actimize and Behavox focus mainly on individual conduct, asking which employees are breaking the rules. The Wells Fargo case shows that this is not enough. The bank monitored employees and dismissed about 5,300 of them, yet the misconduct continued for over a decade because its real driver was pressure from managers and unrealistic sales targets. Dismissing staff treated the symptom and left the cause in place. ConductGuard closes this gap by linking each employee's conduct to the manager and target behind it, so the bank can trace misconduct back to its source.

The platform has three functions.

| Function | What it does |
| --- | --- |
| **Conduct Surveillance** | The core of the platform. It monitors three levels, which are employee conduct, the pressure from managers and targets, and the thresholds that decide what gets flagged. |
| **Alerting and Case Management** | Opens a case for a named reviewer whenever a threshold is passed, starts a deadline and escalates the case automatically if it is ignored. Every action is recorded with evidence. |
| **Risk Reporting** | Turns the findings into a live dashboard, a morning briefing for the conduct risk team and a monthly summary for the audit committee, so warning signs reach the board instead of staying within the business. |

ConductGuard only reads account activity the bank already records. It does not open accounts, verify customers or provide any customer-facing feature.

## 4.2 Conduct Surveillance

Conduct Surveillance tracks metrics at three levels, the employee, the manager and target, and the monitoring system itself. Every metric is tied to a specific warning sign from the Wells Fargo case, so each flag can be explained to the reviewer and to the employee affected.

Scores and the Pressure Index are recalculated every day at 6:00 am after the overnight data load, using the previous day's activity. They therefore read the same all day and match the morning briefing.

### 4.2.1 Level 1 – Employee Conduct

The platform tracks seven metrics for each employee.

| Metric | Definition | Why it is tracked | Weight |
| --- | --- | --- | --- |
| Accounts opened | Number of accounts opened per week | Unusually high volume can signal sales pressure | 7 |
| Unused account rate | Share of new accounts with no genuine customer activity within 90 days | Most unauthorised accounts were never used by the customer | 25 |
| Internal transfer funding rate | Share of new accounts funded only by moving money from the same customer's existing account | Staff moved customer money to make new accounts look funded | 20 |
| Early closure rate | Share of new accounts closed within 60 days | Customers closed accounts they never asked for once they found them | 10 |
| Contact detail changes | Customer email or phone changes made by the employee around the time an account was opened | Staff used false contact details so customers would not learn of new accounts | 10 |
| Customer complaint rate | Complaints linked to the employee's accounts, with "did not authorise" complaints counted three times | Complaints were never traced back to the employees involved | 20 |
| Same-day multiple products | Customers given several products by the same employee on the same day | A common pattern under cross-selling pressure | 8 |

Each metric is compared with peers in the same role. Two comparisons are made, one across the bank and one within the branch, and the higher of the two counts, so a whole branch under pressure cannot look normal against itself. The results are combined into a risk score from 0 to 100. Unused accounts, internal transfer funding and complaints carry the highest weights because they are the strongest signs of unauthorised accounts. The score also rises with the number of customers affected, so it reflects harm as well as likelihood.

| Risk level | Score | Action |
| --- | --- | --- |
| Low | 0 to 39 | Shown on the dashboard only |
| Medium | 40 to 69 | Case opened for the team lead |
| High | 70 to 100 | Case opened for the conduct risk team and reported to the audit committee |

### 4.2.2 Level 2 – Managers and Targets

The second level measures the pressure that managers and targets place on staff. This is what makes ConductGuard unique. The metrics combine into a Pressure Index from 0 to 100 for each branch and its manager.

| Metric | Definition | Why it is tracked | Points |
| --- | --- | --- | --- |
| Target miss rate | Share of branch staff missing their sales targets | When most staff cannot meet a target, the target is the problem, not the staff | 25 |
| Team flag rate | Share of the manager's staff rated Medium or High | Widespread flags in one team point to the manager, not individuals | 20 |
| Target increases | Size and frequency of recent increases to branch targets | Wells Fargo kept raising targets even as staff struggled to meet them | 15 |
| End-of-month sales spikes | Sharp rises in accounts opened in the last days of a sales period | Staff rushed to hit targets before deadlines | 10 |
| Pressure reports | Number of anonymous reports from staff about pressure at the branch | Staff warnings about pressure were ignored | 10 |
| Manager response time | How quickly the manager acts on flags raised in their team | Managers tolerated or encouraged the behaviour | 10 |
| Sales misconduct dismissals | Number of staff dismissed for sales misconduct at the branch | About 5,300 dismissals were never treated as a pattern | 10 |

The key link is between the two levels. When a branch has a high Pressure Index and rising employee flags, the platform flags the manager and the target for review, not only the employees. A branch is rated High when its Pressure Index is 70 or more, or when at least 30 percent of its staff are rated High.

Pressure reports come from the protected speak-up channel. A report stores a one-way seal instead of a name, so the platform can recognise a reporter who is later flagged or dismissed without revealing who they are.

### 4.2.3 Level 3 – Threshold Governance

Every flag in Levels 1 and 2 depends on thresholds, which are the limits that decide when an employee or branch is rated Medium or High. Whoever controls these limits controls what the bank can see. Raising the High threshold from 70 to 85 would quietly remove many employees from review without any misconduct actually stopping.

This happened at Wells Fargo. The business lines controlled their own monitoring, and management paused it and later narrowed it to only the top 0.01 percent of employees (Independent Directors of the Board of Wells Fargo & Company, 2017). Fewer flags made the problem look smaller when the bank had simply stopped looking. Threshold Governance prevents this in three ways.

1. **Controlling who can change thresholds.** Only the conduct risk team can propose a change to a threshold or weight, and the Chief Risk Officer must approve it. No one can approve their own proposal, and branch managers and team leads cannot make changes at all. Before deciding, the approver sees how many of today's flags the change would weaken. Every change is written to a permanent log recording who made it, the old and new values and the reason. The log is hash-chained, so any later edit is detected.

2. **Detecting signs that detection is being weakened.** Thresholds are not the only way to hide problems, because flags can also be dismissed without proper review. The platform tracks four warning signs.

   | Warning sign | Example | What it may indicate |
   | --- | --- | --- |
   | Threshold change attempted | A branch manager tries to raise the High threshold from 70 to 85 | An attempt to reduce the number of flagged staff |
   | Unapproved change | A threshold change that skipped approval | A breach of the two-person rule, where the target is zero |
   | Sudden drop in flags | Flags fall by half in one month while sales volumes stay the same | Detection was turned down, not that misconduct stopped |
   | Unusually fast reviews | A team lead clears five cases in one hour | Flags are being dismissed without real checks |

3. **Alerting an independent party.** Every warning sign, and every threshold change whether approved or blocked, alerts internal audit, not the business line involved. As the third line of defence, internal audit is independent of both sales and the conduct risk team, so the people being monitored can never switch off their own monitoring.

## 4.3 Alerting and Case Management

Conduct Surveillance shows where the risk is. Alerting and Case Management makes sure someone acts on it. This prevents what happened at Wells Fargo, where complaints and warning signs were received but never followed through.

### 4.3.1 Routing and Deadlines

Each flag opens a case in the queue of a named reviewer, chosen by what was flagged and how serious it is. The case is the alert, so reviewers see what is waiting for them as soon as they open ConductGuard, and the conduct risk team also sees new and overdue cases in its morning briefing.

| What is flagged | Routed to | Review deadline |
| --- | --- | --- |
| Employee rated Medium | Team lead | 5 business days |
| Employee rated High | Conduct risk team | 48 hours |
| Branch or manager rated High on the Pressure Index | Conduct risk team | 5 business days |
| Dismissal for sales misconduct | Conduct risk team | 5 business days |
| Speak-up reporter later flagged or dismissed | Audit committee | Immediate |
| Threshold change attempt or control breach | Internal audit | Immediate |

Cases about managers and targets go to the conduct risk team rather than the branch, because a branch cannot independently review the pressure it creates. Employees see any change to their own risk level on their dashboard, so no one is flagged without knowing.

### 4.3.2 Case Workflow

The platform opens each case automatically and attaches the evidence, which is the metrics that passed the threshold and the specific accounts behind them. This evidence is stored as a snapshot on the case, so it does not change if thresholds change later. The case is assigned to a named reviewer and the deadline starts. The reviewer examines the evidence and any dispute from the employee, then records an outcome with a written reason.

| Outcome | Meaning | Applies to |
| --- | --- | --- |
| Cleared | No concern was found | All cases |
| Coaching | The employee or manager is coached on how they sell or set targets | All cases |
| Investigation | The accounts or the manager are referred for a formal investigation | All cases |
| Target review | The branch target is sent for adjustment, so the cause of the pressure is fixed | Manager and target cases only |

### 4.3.3 Escalation

Cases cannot sit unresolved. A Medium case not reviewed within 5 business days moves to the conduct risk team, and a High case not reviewed within 48 hours moves to the Chief Risk Officer. A second High case for the same employee or branch within six months goes to the audit committee, as does any case involving a speak-up reporter. Repeated or ignored problems therefore reach the board, unlike the 5,300 dismissals at Wells Fargo that were never treated as a pattern.

### 4.3.4 Disputes and Appeals

When a case is opened, the employee receives a plain-language explanation of which metrics passed the threshold and why they matter. The employee can dispute a metric with supporting evidence, and the reviewer must decide the dispute before the case can close. If the employee disagrees with the outcome, they can appeal to the audit committee.

Disputes also improve the platform. An upheld dispute is recorded as a false alarm. If false alarms build up for a particular metric or branch, the conduct risk team can propose adjusting the weights. That change must still pass through Threshold Governance, so disputes can refine detection but never quietly weaken it.

### 4.3.5 Audit Trail

Every action on a case is recorded with the time, the person who acted and the evidence used, from opening to closure. The record cannot be edited and can be exported as a spreadsheet or a printable report for internal audit or regulators. Internal audit can therefore check that every flag was reviewed on time and properly decided.

## 4.4 Risk Reporting

Conduct Surveillance finds the risk, and Case Management makes sure each flag is acted on. Risk Reporting makes sure the right people see the overall picture. At Wells Fargo, complaints, whistleblower reports and about 5,300 dismissals were known within the business, but the board was not fully informed until 2014, more than a decade after the misconduct began (Independent Directors of the Board of Wells Fargo & Company, 2017). ConductGuard reports at three levels.

### 4.4.1 Live Dashboard

The dashboard gives the conduct risk team a current view of where risk sits across the bank. Key totals come first, followed by a heat map of each branch's seven indicators with its Pressure Index and number of High staff beside them, so reviewers can see at a glance whether risky behaviour is concentrated where pressure is high. Branches and employees with the highest risk are listed first. Selecting a branch opens its employees, and selecting an employee opens their profile with the accounts behind each flag. The headline effectiveness metrics are shown alongside.

### 4.4.2 Morning Briefing

Every morning, the conduct risk team opens a briefing page in ConductGuard that summarises what changed overnight. It counts new High and Medium cases, overdue reviews, branches with a rising Pressure Index and threshold change attempts, and lists each item with a link to where it is handled.

The briefing also includes a short AI-written summary of likely causes in plain language, such as "Branch 12 moved to High after unused accounts nearly doubled following a target increase." Because AI can be wrong, the summary is labelled as an AI draft and stays unconfirmed until a reviewer confirms it or corrects it. A corrected summary replaces the draft, and the original is kept for the record. The AI only receives branch-level figures and never employee names, which protects staff privacy. This follows the human-in-the-loop approach in Singapore's Model AI Governance Framework, where AI supports decisions but a person makes them.

### 4.4.3 Monthly Audit Committee Summary

Each month, the audit committee receives a summary designed to bring warning signs to board level. It covers escalated cases and appeals, the branches with the highest Pressure Index, dismissals for sales misconduct, complaints linked to employees, speak-up reports, the effectiveness metrics and every threshold change whether approved or blocked. Each case links to its full record and audit trail, so the committee can see the evidence behind it. This meets the expectation of the Monetary Authority of Singapore that the board receives regular summaries of complaints and whistleblowing (Monetary Authority of Singapore, n.d.), and it ensures that a pattern like Wells Fargo's dismissals is visible to the board.

### 4.4.4 Effectiveness Metrics

ConductGuard also reports on how well the platform itself is working, so management and internal audit can check that monitoring is effective and not just active.

| Metric | What it shows | Target |
| --- | --- | --- |
| Flags reviewed within deadline | Whether reviewers act on time | At least 95 percent |
| Average time to resolve a case | Whether cases are handled promptly | Within each level's deadline |
| False alarm rate | Share of flags overturned through disputes, overall and by branch | Falling over time |
| Bank-wide unused account rate | Whether misconduct is actually decreasing | Falling over time |
| Unapproved threshold changes | Whether detection was weakened without approval | Zero |

The dashboard and the monthly summary show the headline figures, and internal audit sees all five with their trends. A rising false alarm rate shows that weights need refining, and a falling unused account rate shows that the platform is reducing the behaviour it was built to detect.

## 4.5 User Roles and Views

ConductGuard serves six user groups, arranged along the three lines of defence and the board. Each group sees only the pages it needs for the decisions it makes, and every page states its purpose in one sentence.

| Role | Duty | Pages |
| --- | --- | --- |
| Employee | Understand their own score, respond to a flag and report pressure | My Dashboard, Disputes and Appeals, My Personal Data, Protected Speak-Up |
| Team lead | Review Medium flags on their own team within 5 business days | My Team, Reviews, Thresholds, Protected Speak-Up |
| Conduct risk team | Monitor the whole bank, review High, manager, target and dismissal cases, and propose threshold changes | Morning Briefing, Live Dashboard, Cases, Employees, Pressure Index, Thresholds |
| Chief Risk Officer | Approve or reject threshold changes and decide High cases escalated after 48 hours | Thresholds, Escalated Cases |
| Internal audit | Check independently that detection is not weakened and that cases are reviewed on time | Warning Signs, Thresholds, Effectiveness, Cases |
| Audit committee | Oversee conduct risk for the board, decide appeals and escalated cases, and protect people who speak up | Monthly Summary, Escalated Cases, Appeals, Speak-Up Reports |

### 4.5.1 Employee

Employees are the first line. Their pages are written in plain language so a bank employee can use them without training.

- **My Dashboard** shows the conduct risk score from 0 to 100 as a ring coloured by level, with a reminder that a score is an indicator, not proof. A card shows any open flag with its named reviewer and deadline. A bar splits the score into four areas, which are customer response, account setup, sales activity and customers affected. The seven indicators follow as tiles, each comparing the employee with peers and stating the accounts behind it.
- **Disputes and Appeals** lists each flag with the indicators that were above peers when it was raised. The employee can dispute an indicator with a statement and evidence while the case is open, or appeal to the audit committee once it has closed with an outcome other than cleared.
- **My Personal Data** shows every record ConductGuard holds about the employee, grouped by source system. It states that the data is used only for conduct monitoring, never for pay, and that speak-up reports are not linked to their name.
- **Protected Speak-Up** lets the employee report sales pressure at their branch to the audit committee anonymously.

### 4.5.2 Team Lead

Team leads are also the first line, and in the demonstrator the team lead is the branch manager. They see only their own team and use the same score visuals as the employee.

- **My Team** shows how many Medium flags are waiting and when the next is due, splits the team into High, Medium and Low, and lists every team member by score with their main driver and flag. High flags show that they sit with the conduct risk team.
- **Reviews** is the queue of Medium flags, earliest deadline first, with each flag's main drivers and any dispute. The review screen shows why the flag was raised, the accounts behind it, any dispute and the audit trail. A decision panel guides the team lead to check the evidence, decide any dispute and record an outcome with a reason. The case cannot close while a dispute is open.
- **Thresholds** shows the four thresholds that decide when the team is flagged. A team lead can submit a request to change one, but the server blocks it, writes it to the permanent log and alerts internal audit.
- **Protected Speak-Up** works as it does for employees.

### 4.5.3 Conduct Risk Team

The conduct risk team is the second line. It is independent of the sales business, unlike the risk managers at Wells Fargo who answered to the business heads they oversaw. Wells Fargo created a similar central function, the Conduct Management Office, in 2017. Its pages are grouped by the parts of the platform.

- **Morning Briefing** is the team's home page. It opens with today's counts, then the AI summary of likely causes with buttons to confirm or correct it, then the items that need attention today, each linked to where it is handled.
- **Live Dashboard** shows the key totals, the branch heat map with each Pressure Index, the highest-risk employees and the headline effectiveness metrics.
- **Cases** splits the team's work into two queues because each reviews something different. Managers and targets comes first because it deals with the cause of the pressure, and holds manager, target and dismissal cases with a deadline of 5 business days and four outcomes. High risk employees follows, with a deadline of 48 hours and three outcomes. Cases with other reviewers and recent decisions are listed below, and all cases can be exported.
- **Employees** lists every employee in the bank by score, with filters by branch and risk level, and opens each profile.
- **Pressure Index** lists each branch with its manager, its index against the High threshold, its main pressure signs and a link to any open manager and target case. The review screen for that case explains each of the seven signs and the points it added.
- **Thresholds** shows the three steps of a change, the current thresholds, the metric weights and the warning sign settings. The team proposes a change with a reason, sees proposals awaiting the Chief Risk Officer with their suppression check, and reads the full change log.

The team sees the number of speak-up reports per branch in the Pressure Index but not their text, which only the audit committee can read.

### 4.5.4 Chief Risk Officer

The Chief Risk Officer is the approver in the two-person rule.

- **Thresholds** is the home page. Each proposal shows how many of today's flags it would weaken, with approve and reject buttons that each need a note. The Chief Risk Officer cannot propose a change or approve their own proposal.
- **Escalated Cases** lists only the High cases escalated after the 48-hour deadline, using the same review screen as other reviewers.

### 4.5.5 Internal Audit

Internal audit is the third line and has read-only access to the whole bank.

- **Warning Signs** is the home page. It lists every alert, such as a blocked threshold change, with a button to acknowledge it, the flag volume over time, and the hash-chained change log with a button to check that it has not been edited.
- **Thresholds** shows the current values and every change.
- **Effectiveness** shows all five effectiveness metrics against their targets, the bank-wide unused account rate over time and false alarms by branch and by metric.
- **Cases** lists every case for checking, and cases can be exported with their audit trail.

### 4.5.6 Audit Committee

The audit committee brings conduct risk to board level.

- **Monthly Summary** is the home page and covers the items in Section 4.4.3, each linked to its record.
- **Escalated Cases** lists the cases routed to or reported to the committee, such as repeat High cases and cases involving a speak-up reporter.
- **Appeals** lists employee appeals against case outcomes for the committee to uphold or reject, each with a reason.
- **Speak-Up Reports** shows the anonymous reports in full, and the committee is the only group that can read them.

## 4.6 Safeguards and Limitations

| Limitation | Safeguard |
| --- | --- |
| A high score is not proof of misconduct | Every flag has a named reviewer, a dispute route and an appeal to the audit committee |
| Some branches naturally score higher | Scores compare peers in the same role across the bank and within the branch, and false alarms are tracked |
| Staff and managers may game the metrics | Weights are reviewed through Threshold Governance, and the Pressure Index looks at managers and targets as well as staff |
| The AI summary can be wrong | It stays an unconfirmed draft until a reviewer confirms or corrects it, and it never receives employee names |
| Monitoring may feel intrusive | Only conduct data is used, staff can see everything held about them, and scores never set pay |
