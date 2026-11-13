-- Remove only the retired configuration workflows. Keep operational conduct data.
BEGIN;

-- Match notifications to obsolete alerts before deleting those alerts.
DELETE FROM "Notification" AS n
USING "WatcherAlert" AS a
WHERE a."type" IN ('THRESHOLD_CHANGE', 'LOG_TAMPERING')
  AND n."title" = 'Warning sign: ' || a."title"
  AND n."body" = a."detail"
  AND n."link" = '/watchers';

DELETE FROM "Notification"
WHERE "title" = 'Threshold change awaiting your approval'
  AND "link" = '/thresholds';

DELETE FROM "WatcherAlert"
WHERE "type" IN ('THRESHOLD_CHANGE', 'LOG_TAMPERING');

-- Preserve briefing text, reviewer decisions and all remaining facts.
UPDATE "Briefing"
SET "facts" = "facts" - 'thresholdAttempts'
WHERE "facts" ? 'thresholdAttempts';

-- No CASCADE: fail rather than remove an unexpected dependency.
DROP TABLE "ThresholdChangeRequest";
DROP TABLE "ConfigChangeLog";

COMMIT;
