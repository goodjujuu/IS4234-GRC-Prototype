-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "incentiveAmount" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "ConductAlert" ADD COLUMN     "dismissReason" TEXT,
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "dismissedBy" TEXT;

-- AlterTable
ALTER TABLE "ConfigChangeLog" ADD COLUMN     "prevHash" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "anonymous" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "reporterId" TEXT,
ADD COLUMN     "retaliationNote" TEXT,
ADD COLUMN     "routedTo" TEXT NOT NULL DEFAULT 'Second-line Risk & Audit Committee',
ADD COLUMN     "trackingCode" TEXT;

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveEvent" (
    "id" TEXT NOT NULL,
    "bankerId" TEXT NOT NULL,
    "accountId" TEXT,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncentiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Threshold" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Threshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThresholdChangeRequest" (
    "id" TEXT NOT NULL,
    "thresholdKey" TEXT NOT NULL,
    "oldValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "flagsBefore" INTEGER NOT NULL,
    "flagsAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ThresholdChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsRun" (
    "id" TEXT NOT NULL,
    "alertsRaised" INTEGER NOT NULL,
    "bankersScanned" INTEGER NOT NULL,
    "branchesScanned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Threshold_key_key" ON "Threshold"("key");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Banker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveEvent" ADD CONSTRAINT "IncentiveEvent_bankerId_fkey" FOREIGN KEY ("bankerId") REFERENCES "Banker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveEvent" ADD CONSTRAINT "IncentiveEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
