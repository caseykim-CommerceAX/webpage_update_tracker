ALTER TABLE "EndpointCheck" ADD COLUMN "comparedCheckId" TEXT;
ALTER TABLE "EndpointCheck" ADD COLUMN "headAddedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EndpointCheck" ADD COLUMN "headRemovedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EndpointCheck" ADD COLUMN "bodyAddedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EndpointCheck" ADD COLUMN "bodyRemovedCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "EndpointCheck_comparedCheckId_idx" ON "EndpointCheck"("comparedCheckId");

-- 기존 이력도 어떤 직전 성공 진단과 비교됐는지 복구한다.
UPDATE "EndpointCheck"
SET "comparedCheckId" = (
  SELECT previous."id"
  FROM "EndpointCheck" AS previous
  WHERE previous."endpointId" = "EndpointCheck"."endpointId"
    AND previous."snapshotId" IS NOT NULL
    AND previous."createdAt" < "EndpointCheck"."createdAt"
  ORDER BY previous."createdAt" DESC
  LIMIT 1
)
WHERE "changeStatus" IN ('UNCHANGED', 'CHANGED');

-- 기존 구조화 diff를 HEAD/BODY 변경 건수로 역산한다.
UPDATE "EndpointCheck"
SET
  "headAddedCount" = COALESCE((
    SELECT COUNT(*)
    FROM "Snapshot" AS snapshot, json_each(snapshot."diffJson", '$.added') AS item
    WHERE snapshot."id" = "EndpointCheck"."snapshotId"
      AND json_extract(item.value, '$.kind') IN ('title', 'meta')
  ), 0),
  "headRemovedCount" = COALESCE((
    SELECT COUNT(*)
    FROM "Snapshot" AS snapshot, json_each(snapshot."diffJson", '$.removed') AS item
    WHERE snapshot."id" = "EndpointCheck"."snapshotId"
      AND json_extract(item.value, '$.kind') IN ('title', 'meta')
  ), 0),
  "bodyAddedCount" = COALESCE((
    SELECT COUNT(*)
    FROM "Snapshot" AS snapshot, json_each(snapshot."diffJson", '$.added') AS item
    WHERE snapshot."id" = "EndpointCheck"."snapshotId"
      AND json_extract(item.value, '$.kind') NOT IN ('title', 'meta')
  ), 0),
  "bodyRemovedCount" = COALESCE((
    SELECT COUNT(*)
    FROM "Snapshot" AS snapshot, json_each(snapshot."diffJson", '$.removed') AS item
    WHERE snapshot."id" = "EndpointCheck"."snapshotId"
      AND json_extract(item.value, '$.kind') NOT IN ('title', 'meta')
  ), 0)
WHERE "changeStatus" = 'CHANGED';
