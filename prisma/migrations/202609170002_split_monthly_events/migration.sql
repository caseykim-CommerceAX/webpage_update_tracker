-- September and October events are separate current targets, not a current/previous URL pair.
UPDATE "Target"
SET "name" = '이벤트 9월',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  SELECT "targetId"
  FROM "Endpoint"
  WHERE "url" IN (
    'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09',
    'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09'
  )
);

UPDATE "Endpoint"
SET "referenceUrl" = NULL,
    "lifecycle" = 'PRELAUNCH',
    "enabled" = true,
    "retiredAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "url" IN (
  'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09',
  'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09'
);

INSERT INTO "Target" (
  "id", "displayOrder", "name", "category", "monitorMode", "enabled", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(16))),
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "Target"),
  '이벤트 10월',
  september."category",
  'STATUS_ONLY',
  september."enabled",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Target" AS september
WHERE september."name" = '이벤트 9월'
  AND NOT EXISTS (SELECT 1 FROM "Target" WHERE "name" = '이벤트 10월')
LIMIT 1;

INSERT INTO "Rule" (
  "id", "targetId", "type", "label", "selector", "attribute", "expectedValue",
  "expectedStatuses", "enabled", "displayOrder", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(16))),
  october."id",
  rule."type",
  rule."label",
  rule."selector",
  rule."attribute",
  rule."expectedValue",
  rule."expectedStatuses",
  rule."enabled",
  rule."displayOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Rule" AS rule
JOIN "Target" AS september ON september."id" = rule."targetId"
JOIN "Target" AS october ON october."name" = '이벤트 10월'
WHERE september."name" = '이벤트 9월'
  AND NOT EXISTS (
    SELECT 1 FROM "Rule" AS existing
    WHERE existing."targetId" = october."id"
      AND existing."displayOrder" = rule."displayOrder"
  );

INSERT INTO "Endpoint" (
  "id", "targetId", "platform", "url", "referenceUrl", "lifecycle",
  "launchedAt", "enabled", "retiredAt", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(16))), october."id", 'DESKTOP',
  'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10',
  NULL, 'PRELAUNCH', NULL, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Target" AS october
WHERE october."name" = '이벤트 10월'
  AND NOT EXISTS (
    SELECT 1 FROM "Endpoint"
    WHERE "url" = 'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10'
  );

INSERT INTO "Endpoint" (
  "id", "targetId", "platform", "url", "referenceUrl", "lifecycle",
  "launchedAt", "enabled", "retiredAt", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(16))), october."id", 'MOBILE',
  'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-10',
  NULL, 'PRELAUNCH', NULL, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Target" AS october
WHERE october."name" = '이벤트 10월'
  AND NOT EXISTS (
    SELECT 1 FROM "Endpoint"
    WHERE "url" = 'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-10'
  );

UPDATE "Endpoint"
SET "targetId" = (SELECT "id" FROM "Target" WHERE "name" = '이벤트 10월' LIMIT 1),
    "referenceUrl" = NULL,
    "lifecycle" = 'PRELAUNCH',
    "enabled" = true,
    "retiredAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "url" IN (
  'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10',
  'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-10'
)
  AND EXISTS (SELECT 1 FROM "Target" WHERE "name" = '이벤트 10월');
