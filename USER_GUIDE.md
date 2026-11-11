# ConductGuard User Guide

ConductGuard is a conduct risk observability platform for retail banking. It scores employee sales conduct, links it to the pressure created by managers and targets, protects the thresholds that decide what is flagged, and routes every flag to a named reviewer with a deadline. All data is synthetic.

## Accessing the Application

- **Hosted link.** [add the Vercel link here]
- **Browser.** Any current version of Chrome, Edge, Safari or Firefox on a laptop or desktop.
- **Password.** Every demo account uses `demo1234`. The login page also lists each account as a one-click button, so no typing is needed.
- **Demo clock.** The application runs on a fixed demo date of Monday 9 November 2026, with the daily data load at 6:00 am. Deadlines and time left are measured against this clock.

## Demo Accounts

The login page lists one account per role, in the order of the walkthrough below. Highlighted accounts carry the main scenario, and the others add depth if time permits.

| # | Name | Role | What the role does |
| --- | --- | --- | --- |
| 1 | Maya Lindqvist | Employee, Branch 12 | Sees her own score, disputes a flag and reports pressure |
| 2 | Daniel Okafor | Team lead, Branch 12 manager | Reviews Medium flags on his own team |
| 3 | Priya Raman | Conduct risk team | Monitors the whole bank and reviews High, manager and target cases |
| 4 | Rosalind Keane | Chief Risk Officer | Approves or rejects threshold changes |
| 5 | Samuel Ito | Internal audit | Checks independently that detection is not being weakened |
| 6 | Margaret Flynn | Audit committee | Oversees conduct risk for the board and decides appeals |

Use **Switch user** at the bottom of the sidebar to return to the login page.

## Walkthrough

The scenario follows one problem from the branch up to the board. Branch 12 had its weekly target raised from 5 to 12 accounts, about 80 percent of its staff now miss it, and unused accounts have nearly doubled.

### 1. Employee – Maya Lindqvist

1. On **My Dashboard**, note her High score, the open flag with its named reviewer and deadline, and the indicators that are well above peers.
2. Select **See why and respond** to open **Disputes and Appeals**. Choose an indicator, write a short statement and select **Submit dispute**.
3. Open **Protected Speak-Up**, describe the pressure at the branch and select **Send report**. The report carries no name.

### 2. Team Lead – Daniel Okafor

1. On **My Team**, note that Maya's High flag sits with the conduct risk team, because a branch cannot review the pressure it creates.
2. Open **Thresholds**. Under **Request a change**, choose the High risk threshold, enter 85, give a reason and select **Submit request**. The change is blocked, written to the permanent log and sent to internal audit.

### 3. Conduct Risk Team – Priya Raman

1. On **Morning Briefing**, select **Generate again** so the briefing includes Daniel's blocked attempt.
2. Read the AI summary of likely causes, then select **Confirm, it is accurate** or **Correct it**. The summary is only a draft until a reviewer does this.
3. Open **Pressure Index**. Branch 12 is rated High. Expand it to see its seven pressure signs, then select **Review case**.
4. On the manager and target case, read why it was raised, choose **Target review** as the outcome, give a reason and select **Record decision**. This sends the target for adjustment.
5. Optionally, open **Cases**, select Maya's case under **High risk employees** and decide her dispute. To prepare step 4, open **Thresholds** and propose a change, such as the unused account rate weight from 25 to 30.

### 4. Chief Risk Officer – Rosalind Keane (if time permits)

1. On **Thresholds**, open the proposal from Priya and read the suppression check, which shows how many of today's flags the change would weaken.
2. Enter a note and select **Approve** or **Reject**. She cannot approve a proposal of her own.

### 5. Internal Audit – Samuel Ito (if time permits)

1. On **Warning Signs**, find the alert for Daniel's blocked threshold change and select **Acknowledge**.
2. Under **Permanent change log**, select **Run checks** to confirm the hash-chained log has not been edited.

### 6. Audit Committee – Margaret Flynn

1. On **Monthly Summary**, review the escalated cases, the branches with the highest Pressure Index, dismissals, speak-up reports and every threshold change, including Daniel's blocked attempt.
2. Open a case under **Cases with their audit trail** to see every action with its time and who took it.
3. Open **Speak-Up Reports** to read Maya's anonymous report. Only the audit committee can read report text.

## Other Features

- **Exports.** On **Cases**, the conduct risk team, internal audit and the audit committee can export cases as a spreadsheet or a printable audit report.
- **Appeals.** An employee whose case closes with an outcome other than cleared can appeal, and the audit committee decides it under **Appeals**.
- **Personal data.** Employees can see every record held about them under **My Personal Data**.

## Resetting the Demo Data

Actions in the walkthrough change the data. To return to the starting state on a local copy, run `npm run seed`. On the hosted version, ask the group to reset the database before a new run.

## Running Locally

Requires Node.js 20 or later and a Postgres database.

```bash
npm install
cp .env.example .env        # set DATABASE_URL and SESSION_SECRET
npx prisma migrate deploy
npm run seed
npm run dev
```

Then open http://localhost:3000.

## Known Limitations

- Scores are indicators, not proof, and every flag has a named reviewer and a route to dispute and appeal.
- The AI summary is simulated from a template unless an Anthropic model key is configured, and it is labelled as such.
- Data is synthetic, the briefing is shown on screen instead of being sent, and the daily scoring runs when the data is loaded instead of on a schedule.
- Demo logins share one password and are not a production access model.
