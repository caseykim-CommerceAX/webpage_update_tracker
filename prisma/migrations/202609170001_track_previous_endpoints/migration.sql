-- Keep previously used URLs as independently tracked endpoints.
UPDATE "Endpoint"
SET "enabled" = true,
    "lifecycle" = 'EXISTING',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "retiredAt" IS NOT NULL;

-- The September event URLs become tracked previous URLs.
UPDATE "Endpoint"
SET "enabled" = true,
    "lifecycle" = 'EXISTING',
    "retiredAt" = COALESCE("retiredAt", CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "url" IN (
  'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09',
  'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09'
);

-- Add the October event URLs as the current prelaunch endpoints.
INSERT INTO "Endpoint" (
  "id", "targetId", "platform", "url", "referenceUrl", "lifecycle",
  "launchedAt", "enabled", "retiredAt", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(16))),
  previous."targetId",
  previous."platform",
  CASE previous."platform"
    WHEN 'DESKTOP' THEN 'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10'
    ELSE 'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-10'
  END,
  previous."url",
  'PRELAUNCH',
  NULL,
  true,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Endpoint" AS previous
JOIN "Target" AS target ON target."id" = previous."targetId"
WHERE target."name" = '이벤트'
  AND previous."url" IN (
    'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09',
    'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Endpoint" AS current
    WHERE current."targetId" = previous."targetId"
      AND current."platform" = previous."platform"
      AND current."url" = CASE previous."platform"
        WHEN 'DESKTOP' THEN 'https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10'
        ELSE 'https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-10'
      END
  );

-- Materialize every reference URL as its own tracked previous endpoint.
INSERT INTO "Endpoint" (
  "id", "targetId", "platform", "url", "referenceUrl", "lifecycle",
  "launchedAt", "enabled", "retiredAt", "createdAt", "updatedAt"
)
SELECT
  lower(hex(randomblob(16))),
  current."targetId",
  current."platform",
  current."referenceUrl",
  NULL,
  'EXISTING',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Endpoint" AS current
WHERE current."referenceUrl" IS NOT NULL
  AND current."referenceUrl" <> current."url"
  AND NOT EXISTS (
    SELECT 1
    FROM "Endpoint" AS previous
    WHERE previous."targetId" = current."targetId"
      AND previous."platform" = current."platform"
      AND previous."url" = current."referenceUrl"
  );
