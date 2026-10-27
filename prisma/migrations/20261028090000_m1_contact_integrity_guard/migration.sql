-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "email" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "pinSetAt" TIMESTAMP(3),
ADD COLUMN     "pinStatus" TEXT NOT NULL DEFAULT 'NOT_SET';

-- AlterTable
ALTER TABLE "Banker" ADD COLUMN     "mobile" TEXT;

-- CreateTable
CREATE TABLE "ContactChangeRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "bankerId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "blockReason" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactChangeRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactChangeRequest" ADD CONSTRAINT "ContactChangeRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactChangeRequest" ADD CONSTRAINT "ContactChangeRequest_bankerId_fkey" FOREIGN KEY ("bankerId") REFERENCES "Banker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
