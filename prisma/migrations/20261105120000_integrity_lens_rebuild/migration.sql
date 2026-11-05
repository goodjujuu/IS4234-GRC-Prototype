-- Integrity Lens rebuild: the earlier schema held only synthetic demo data, so it is replaced outright.
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "IncentiveEvent" CASCADE;
DROP TABLE IF EXISTS "ContactChangeRequest" CASCADE;
DROP TABLE IF EXISTS "ConsentRequest" CASCADE;
DROP TABLE IF EXISTS "CaseEvent" CASCADE;
DROP TABLE IF EXISTS "Case" CASCADE;
DROP TABLE IF EXISTS "ConductAlert" CASCADE;
DROP TABLE IF EXISTS "Report" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "Banker" CASCADE;
DROP TABLE IF EXISTS "Branch" CASCADE;
DROP TABLE IF EXISTS "ConfigChangeLog" CASCADE;
DROP TABLE IF EXISTS "Threshold" CASCADE;
DROP TABLE IF EXISTS "ThresholdChangeRequest" CASCADE;
DROP TABLE IF EXISTS "AnalyticsRun" CASCADE;

-- CreateTable
CREATE TABLE "DemoClock" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "now" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoClock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "weeklyTarget" INTEGER NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "branchId" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "employeeId" TEXT,
    "branchId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRecord" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "firstGenuineActivityAt" TIMESTAMP(3),
    "fundingSource" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "contactChangeAt" TIMESTAMP(3),

    CONSTRAINT "AccountRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetChange" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "oldTarget" INTEGER NOT NULL,
    "newTarget" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "setBy" TEXT NOT NULL,

    CONSTRAINT "TargetChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScore" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignee" TEXT,
    "outcome" TEXT,
    "closeReason" TEXT,
    "inCommitteeSummary" BOOLEAN NOT NULL DEFAULT false,
    "evidence" JSONB,
    "employeeId" TEXT,
    "branchId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "firstActionAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "evidence" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DISPUTE',
    "metricKey" TEXT,
    "statement" TEXT NOT NULL,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakUpReport" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reporterSeal" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakUpReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dismissal" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dismissal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ThresholdChangeRequest" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "oldValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "flagsBefore" INTEGER NOT NULL,
    "flagsAfter" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ThresholdChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigChangeLog" (
    "id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "change" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "signedOffBy" TEXT,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatcherAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatcherAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "facts" JSONB NOT NULL,
    "draft" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedBy" TEXT,
    "confirmNote" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRecord_ref_key" ON "AccountRecord"("ref");

-- CreateIndex
CREATE INDEX "AccountRecord_employeeId_openedAt_idx" ON "AccountRecord"("employeeId", "openedAt");

-- CreateIndex
CREATE INDEX "AccountRecord_branchId_openedAt_idx" ON "AccountRecord"("branchId", "openedAt");

-- CreateIndex
CREATE INDEX "AccountRecord_openedAt_idx" ON "AccountRecord"("openedAt");

-- CreateIndex
CREATE INDEX "Complaint_employeeId_receivedAt_idx" ON "Complaint"("employeeId", "receivedAt");

-- CreateIndex
CREATE INDEX "RiskScore_asOf_idx" ON "RiskScore"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "RiskScore_employeeId_asOf_key" ON "RiskScore"("employeeId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "Case_ref_key" ON "Case"("ref");

-- CreateIndex
CREATE INDEX "Case_status_deadlineAt_idx" ON "Case"("status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakUpReport_trackingCode_key" ON "SpeakUpReport"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigChangeLog_seq_key" ON "ConfigChangeLog"("seq");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecord" ADD CONSTRAINT "AccountRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecord" ADD CONSTRAINT "AccountRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetChange" ADD CONSTRAINT "TargetChange_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakUpReport" ADD CONSTRAINT "SpeakUpReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dismissal" ADD CONSTRAINT "Dismissal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dismissal" ADD CONSTRAINT "Dismissal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

