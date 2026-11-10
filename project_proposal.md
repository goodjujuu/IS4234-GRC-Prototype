4.2 ConductGuard Overview
ConductGuard is an observability platform for conduct risk in retail banking. Its unique proposition is that it monitors the sales pressure created by managers and targets, not only the behaviour of employees.
Existing tools such as EY’s banker surveillance, NICE Actimize and Behavox focus mainly on individual employees, asking which staff are breaking the rules [cite]. As Section 3 showed, this was not enough at Wells Fargo. Dismissing 5,300 employees left the pressure in place. ConductGuard closes this gap by linking each employee’s conduct to the manager and target behind it, so the bank can trace misconduct back to its source.
The solution has three functions:
Conduct Surveillance. This is the core of the platform. It continuously monitors three levels.
Employee Conduct scores each employee’s account activity daily.
Managers and Targets measures the pressure each manager and target places on staff and links it to employee flags. When high pressure and rising flags appear in the same branch, the manager and target are flagged for review, not only the employees.
Threshold Governance protects the detection thresholds, so no one can quietly weaken monitoring as Wells Fargo’s management did.
Alerting and Case Management. When a threshold is passed, the platform alerts the right reviewer and opens a case with a deadline, whether the flag concerns an employee, a manager or a target. Overdue or serious cases escalate automatically, and every action is recorded with evidence.
Risk Reporting. The platform turns these findings into a live dashboard, a daily briefing for the conduct risk team and a monthly summary for the audit committee. Each report highlights high-pressure branches and flagged managers alongside high-risk employees, so warning signs reach the board instead of staying within the business.
ConductGuard serves six user groups.
Employees see their own metrics compared with the peer range, read why any flag was raised, and decide whether to dispute it.
Team leads see only their own team and decide whether a Medium case needs coaching or can be cleared.
The conduct risk team sees the whole bank, reviews High cases and flagged managers, and decides whether to investigate or fix a target.
The Chief Risk Officer decides whether to approve changes to thresholds.
Internal audit has read-only access and checks that reviews and approvals were carried out properly.
The audit committee decides escalated cases and appeals, and uses the monthly summary to direct board attention.
The following subsections describe each function in turn.
4.1.1 Function 1: Conduct Surveillance
Conduct Surveillance tracks metrics at three levels, the employee, the manager and target, and the detection thresholds. Every metric is tied to a specific warning sign from the Wells Fargo case, so each flag can be explained to the reviewer and to the employee affected.

ConductGuard uses data that banks already hold.
Account openings, funding and usage come from the core banking system.
Contact detail changes come from the customer records audit log.
Complaints and their reasons come from the complaints system.
Sales targets, target changes and dismissals come from Human Resources and sales performance systems.
Anonymous pressure reports come from the speak-up channel.
Data is loaded once a day. The prototype uses synthetic data with fictional employees and branches.

4.2.1 Employee Conduct Metrics
At the first level, the platform tracks seven metrics for each employee, using account activity the bank already records.
Metric
Definition
Why it is tracked
Accounts opened
Number of accounts opened per week
Unusually high volume can signal sales pressure
Unused account rate
Share of new accounts with no genuine customer activity within 90 days
Most unauthorised accounts were never used by the customer
Internal transfer funding rate
Share of new accounts funded only by moving money from the same customer’s existing account
Staff moved customer money to make new accounts look funded
Early closure rate
Share of new accounts closed within 60 days
Customers closed accounts they never asked for once they found them
Contact detail changes
Customer email or phone changes made by the employee around the time an account was opened
Staff used false contact details so customers would not learn of new accounts
Customer complaint rate
Complaints linked to the employee’s accounts, with “did not authorise” complaints weighted highest
Complaints were never traced back to the employees involved
Same-day multiple products
Customers given several products by the same employee on the same day
A common pattern under cross-selling pressure


Each metric is compared with peers in the same role and branch, because a high number only matters if it stands out from similar colleagues. The results are combined into a risk score from 0 to 100. Unused accounts, internal transfer funding and “did not authorise” complaints carry the highest weights, because they are the strongest signs of unauthorised accounts. The score also rises with the number of customers affected, so it reflects how much harm was caused as well as how likely misconduct is.
Risk level
Score
Action
Low
0 to 39
Shown on the dashboard only
Medium
40 to 69
Case opened for the team lead
High
70 to 100
Case opened for the conduct risk team and reported to the audit committee


4.2.2 Manager and Target Metrics
At the second level, the platform measures the pressure that managers and targets place on staff. This is what makes Integrity Lens unique. These metrics combine into a Pressure Index from 0 to 100 for each branch and manager.
Metric
Definition
Why it is tracked
Target miss rate
Share of branch staff missing their sales targets
When most staff cannot meet a target, the target is the problem, not the staff
Target increases
Size and frequency of recent increases to branch targets
Wells Fargo kept raising targets even as staff struggled to meet them
End-of-month sales spikes
Sharp rises in accounts opened in the last days of a sales period
Staff rushed to hit targets before deadlines
Pressure reports
Number of anonymous reports from staff about pressure at the branch
Staff warnings about pressure were ignored
Team flag rate
Share of the manager’s staff rated Medium or High
Widespread flags in one team point to the manager, not individuals
Manager response time
How quickly the manager acts on flags raised in their team
Managers tolerated or encouraged the behaviour
Sales misconduct dismissals
Number of staff dismissed for sales misconduct at the branch
About 5,300 dismissals were never treated as a pattern

The key link is between the two levels. When a branch has a high Pressure Index and rising employee flags, the platform flags the manager and the target for review, not only the employees. A branch is rated High when its Pressure Index is 70 or more, or when at least 30 percent of its staff are rated High.
4.2.3 Threshold Governance Metrics
Every flag in Levels 1 and 2 depends on thresholds, which are the limits that decide when an employee or branch is rated Medium or High. Whoever controls these limits controls what the bank can see. Raising a threshold from 70 to 85, for example, would quietly remove many employees from review without any misconduct actually stopping.
Every flag in Levels 1 and 2 depends on thresholds, which are the limits that decide when an employee or branch is rated Medium or High. Whoever controls these limits controls what the bank can see. Raising a threshold from 70 to 85, for example, would quietly remove many employees from review without any misconduct actually stopping.
This happened at Wells Fargo. The business lines controlled their own monitoring, and management paused it and later narrowed it to only the top 0.01 percent of employees (Independent Directors of the Board of Wells Fargo & Company, 2017). Fewer flags made the problem look smaller when the bank had simply stopped looking.
Threshold Governance makes sure no one can weaken detection quietly. It does this in three ways.
1. Controlling who can change thresholds. Only the conduct risk team can propose a change to thresholds or weights, and the Chief Risk Officer must approve it. No one can approve their own proposal, and branch managers and team leads cannot make changes at all. Every change is written to a permanent log recording who made it, the old and new values and the reason. The log cannot be edited afterwards.
2. Detecting signs that detection is being weakened. Thresholds are not the only way to hide problems. Flags can also be dismissed without proper review. The platform therefore tracks four warning signs.
Warning sign
Example
What it may indicate
Threshold change attempted
A branch manager tries to raise the High threshold from 70 to 85
An attempt to reduce the number of flagged staff
Unapproved change
A threshold change that skipped approval
A breach of the two-person rule. The target is zero
Sudden drop in flags
Flags fall by half in one month while sales volumes stay the same
Detection was turned down, not that misconduct stopped
Unusually fast reviews
A team lead clears twenty cases in one hour
Flags are being dismissed without real checks

3. Alerting an independent party. Every warning sign, and every threshold change whether approved or blocked, triggers an alert to internal audit, not to the business line involved. As the third line of defence, internal audit is independent of both sales and the conduct risk team, so the people being monitored can never switch off their own monitoring.

4.3 Alerting and Case Management
Conduct Surveillance shows where the risk is. Alerting and Case Management makes sure someone acts on it. Every time a threshold is passed, the platform alerts a named reviewer, opens a case with a deadline, and tracks it until it is closed with a recorded outcome. This prevents what happened at Wells Fargo, where complaints and warning signs were received but never followed through.


4.3.1 Alerts
Each alert goes to a specific reviewer based on what was flagged and how serious it is. Employees are also notified whenever their own risk level changes, so no one is flagged without knowing.
What is flagged
Alert sent to
Review deadline
Employee rated Medium
Team lead
5 working days
Employee rated High
Conduct risk team
48 hours
Branch or manager rated High on the Pressure Index
Conduct risk team
5 working days
Dismissal for sales misconduct
Conduct risk team
5 working days
Speak-up reporter later flagged or dismissed
Audit committee
Immediate
Threshold change attempt or control breach
Internal audit
Immediate

Cases about managers and targets go to the conduct risk team rather than the branch, because a branch cannot independently review the pressure it creates.
4.3.2 Case Workflow
The platform opens each case automatically and attaches the evidence, including the metrics that passed the threshold and the specific accounts behind them. The case is assigned to the named reviewer and the deadline starts. The reviewer examines the evidence and any explanation from the employee, then records an outcome with a written reason.
There are three outcomes for employee cases. The case can be cleared, the employee can receive coaching, or the case can be referred for investigation. Manager and target cases have a fourth outcome, a target review, where the target is sent for adjustment. This lets the bank fix the cause of the pressure and not only the behaviour it produces.
4.3.3 Escalation
Cases cannot sit unresolved. A Medium case not reviewed within 5 working days moves to the conduct risk team, and a High case not reviewed within 48 hours moves to the Chief Risk Officer. A second High case for the same employee or branch within six months goes to the audit committee, as does any case involving a speak-up reporter. This makes sure repeated or ignored problems reach the board, unlike the 5,300 dismissals at Wells Fargo that were never treated as a pattern.
4.3.4 Employee Disputes
When a case is opened, the employee receives a plain-language explanation of which metrics passed the threshold and why they matter. The employee can submit a dispute with supporting evidence, which the reviewer must consider before deciding. If the employee disagrees with the outcome, they can appeal to the audit committee.
Disputes also improve the platform. An upheld dispute is recorded as a false alarm. If false alarms build up for a particular metric or branch, the conduct risk team can propose adjusting the weights. That change must still pass through Threshold Governance, so disputes can refine detection but never quietly weaken it.
4.3.5 Audit Trail
Every action on a case is recorded with the time, the person who acted and the evidence used, from opening to closure. The record cannot be edited and can be exported for internal audit or regulators. Internal audit can therefore check that every flag was reviewed on time and properly decided.


4.5 Risk Reporting
Conduct Surveillance finds the risk, and Case Management makes sure each flag is acted on. Risk Reporting makes sure the right people see the overall picture. At Wells Fargo, complaints, whistleblower reports and about 5,300 dismissals were known within the business, but the board was not fully informed until 2014, more than a decade after the misconduct began (Independent Directors of the Board of Wells Fargo & Company, 2017). ConductGuard prevents this by reporting at three levels, a live dashboard for daily work, a morning briefing for the conduct risk team, and a monthly summary for the audit committee.

4.5.1 Live Dashboard
The dashboard gives reviewers a real-time view of where risk sits. A heat map shows risk by branch and team, with the highest-risk employees and branches listed first. Reviewers can drill down from a branch to an individual employee, see how their metrics have changed over time compared with peers, and view the specific accounts behind each flag. Branch views show the Pressure Index next to employee risk, so reviewers can see at a glance whether risky behaviour is concentrated where pressure is high. Each user sees only what their role allows. Team leads see their own team, while the conduct risk team and internal audit see the whole bank.
4.5.2 Daily Morning Briefing
Every morning, the conduct risk team receives an email briefing that summarises what changed overnight. It lists new Medium and High cases, overdue reviews, branches with a rising Pressure Index, and any threshold change attempts. Each briefing also includes a short AI-written summary that explains likely causes in plain language. For example, it might say “Branch 12 moved to High after unused accounts doubled following a target increase last month.”
Because AI can be wrong, the summary is clearly labelled as an AI draft, and a reviewer must confirm or correct it before anyone acts on it. The AI only receives aggregated data without employee names, which protects staff privacy. This follows the human-in-the-loop approach in Singapore’s Model AI Governance Framework, where AI supports decisions but a person makes them.
4.5.3 Monthly Audit Committee Summary
Each month, the audit committee receives a summary designed to bring warning signs to board level. It covers escalated cases and disputes, the branches and managers with the highest Pressure Index, dismissals for sales misconduct, complaints linked to employees, speak-up reports, and every threshold change, whether approved or blocked. Each item links to its full case record and audit trail, so the committee can see the evidence behind it. This meets the Monetary Authority of Singapore’s expectation that the board receives regular summaries of complaints and whistleblowing (Monetary Authority of Singapore, n.d.), and it ensures that a pattern like Wells Fargo’s dismissals is visible to the board.
4.5.4 Effectiveness Metrics
ConductGuard also reports on how well the platform itself is working, so management and internal audit can check that monitoring is effective and not just active. Our group set five targets.
At least 95 percent of flags are reviewed within their deadline.
The average time to resolve a case stays within each level’s deadline.
The false alarm rate falls over time, both overall and by branch.
The bank-wide unused account rate falls over time.
There are zero unapproved threshold changes.
These metrics appear in both the dashboard and the monthly summary. A rising false alarm rate shows that weights need refining, and a falling unused account rate shows that the platform is reducing the behaviour it was built to detect.


4.6 Feasibility and Limitations
ConductGuard is feasible because it relies on data banks already hold and on transparent statistical rules rather than complex models. Employee conduct analytics are already used in regulated banks, such as OCBC’s Employee Conduct Trigger Programme (OCBC, 2024). The main costs are connecting source systems and training reviewers, so a pilot in a few branches is realistic before a wider rollout.
The platform also has limitations.
A high score is not proof of misconduct. Every flag therefore has a human reviewer and a dispute route.
Some branches may naturally score higher. A branch serving older customers, for example, may have more unused accounts. Comparing with peers and tracking false alarms by branch reduces this bias.
Staff and managers may learn to game the metrics. Weights are reviewed regularly through Threshold Governance.
Monitoring may feel intrusive. ConductGuard collects only conduct-related data, lets employees see everything held about them, and does not use scores for performance pay.
The AI summary can be wrong. A human must confirm it before anyone acts.
The prototype is not production-ready. It demonstrates the workflow with synthetic data only.

