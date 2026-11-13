-- Retire the CRO role without deleting cases or rewriting their existing history.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Case" WHERE "tier" = 'CHIEF_RISK_OFFICER') THEN
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'AUDIT_COMMITTEE') THEN
      RAISE EXCEPTION 'An audit committee reviewer is required to reassign CRO cases';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "DemoClock" WHERE "id" = 1) THEN
      RAISE EXCEPTION 'The demo clock is required to timestamp CRO case reassignment';
    END IF;
  END IF;
END $$;

-- Preserve status, deadlines, outcomes and evidence, and record the previous reviewer.
WITH previous AS (
  SELECT "id", "tier", "assignee" FROM "Case"
  WHERE "tier" = 'CHIEF_RISK_OFFICER'
), reassigned AS (
  UPDATE "Case" AS c
  SET "tier" = 'AUDIT_COMMITTEE',
      "assignee" = (SELECT "name" FROM "User" WHERE "role" = 'AUDIT_COMMITTEE' ORDER BY "email" DESC LIMIT 1),
      "inCommitteeSummary" = true
  FROM previous AS p
  WHERE c."id" = p."id"
  RETURNING c."id", p."tier" AS "previousTier", p."assignee" AS "previousAssignee"
)
INSERT INTO "CaseEvent" ("id", "caseId", "action", "actor", "note", "evidence", "timestamp")
SELECT 'cro-retirement-' || "id", "id", 'ESCALATED', 'System (role retirement)',
       'Chief Risk Officer role retired. Case reassigned to the audit committee; status, outcome and deadline preserved.',
       jsonb_build_object('previousTier', "previousTier", 'previousAssignee', "previousAssignee", 'newTier', 'AUDIT_COMMITTEE'),
       (SELECT "now" FROM "DemoClock" WHERE "id" = 1)
FROM reassigned;

-- Notify the committee about reassigned cases that still require action.
INSERT INTO "Notification" ("id", "userId", "title", "body", "link", "read", "createdAt")
SELECT 'cro-retirement-' || c."id" || '-' || u."id", u."id",
       c."ref" || ' reassigned to the audit committee',
       'The Chief Risk Officer role was retired. Review this case under its existing deadline.',
       '/cases/' || c."id", false, e."timestamp"
FROM "Case" AS c
JOIN "CaseEvent" AS e ON e."id" = 'cro-retirement-' || c."id"
CROSS JOIN "User" AS u
WHERE c."status" <> 'CLOSED' AND u."role" = 'AUDIT_COMMITTEE';

DELETE FROM "Notification" AS n USING "User" AS u
WHERE n."userId" = u."id" AND u."role" = 'CHIEF_RISK_OFFICER';

DELETE FROM "User" WHERE "role" = 'CHIEF_RISK_OFFICER';

COMMIT;
