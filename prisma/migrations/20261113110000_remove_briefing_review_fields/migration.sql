-- Remove fields used only by the retired manual AI summary review workflow.
-- Preserve each briefing's current summary, facts, source, and timestamps.
BEGIN;

ALTER TABLE "Briefing"
  DROP COLUMN "draft",
  DROP COLUMN "status",
  DROP COLUMN "confirmedBy",
  DROP COLUMN "confirmNote",
  DROP COLUMN "confirmedAt";

COMMIT;
