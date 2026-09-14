ALTER TABLE "Endpoint" ADD COLUMN "liveCompletedAt" DATETIME;

ALTER TABLE "EndpointCheck" ADD COLUMN "liveStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "EndpointCheck" ADD COLUMN "headLiveMarkerFound" BOOLEAN;
ALTER TABLE "EndpointCheck" ADD COLUMN "bodyLiveMarkerFound" BOOLEAN;

CREATE INDEX "EndpointCheck_liveStatus_idx" ON "EndpointCheck"("liveStatus");

-- 기존 콘텐츠 스냅샷에서도 라이브 판정 신호를 복구한다.
UPDATE "EndpointCheck"
SET
  "headLiveMarkerFound" = CASE WHEN EXISTS (
    SELECT 1
    FROM "Snapshot" AS snapshot, json_each(snapshot."tokensJson") AS item
    WHERE snapshot."id" = "EndpointCheck"."snapshotId"
      AND json_extract(item.value, '$.kind') = 'meta'
      AND json_extract(item.value, '$.key') = 'og:site_name'
  ) THEN 1 ELSE 0 END,
  "bodyLiveMarkerFound" = CASE WHEN EXISTS (
    SELECT 1
    FROM "Snapshot" AS snapshot, json_each(snapshot."tokensJson") AS item
    WHERE snapshot."id" = "EndpointCheck"."snapshotId"
      AND json_extract(item.value, '$.kind') = 'heading'
      AND json_extract(item.value, '$.key') = 'h2'
      AND REPLACE(json_extract(item.value, '$.value'), ' ', '') LIKE '%이런분께추천드려요%'
  ) THEN 1 ELSE 0 END
WHERE "snapshotId" IS NOT NULL;

UPDATE "EndpointCheck"
SET "liveStatus" = CASE
  WHEN "headLiveMarkerFound" = 1 AND "bodyLiveMarkerFound" = 1 THEN 'LIVE_COMPLETE'
  WHEN "headLiveMarkerFound" = 1 OR "bodyLiveMarkerFound" = 1 THEN 'CHECK_REQUIRED'
  ELSE 'BEFORE_LIVE'
END
WHERE "snapshotId" IS NOT NULL;

-- 상태 전용 대상은 HTTP 200 도달을 라이브 완료로 본다.
UPDATE "EndpointCheck"
SET "liveStatus" = 'LIVE_COMPLETE'
WHERE "availabilityStatus" = 'LIVE'
  AND EXISTS (
    SELECT 1
    FROM "Endpoint" AS endpoint
    JOIN "Target" AS target ON target."id" = endpoint."targetId"
    WHERE endpoint."id" = "EndpointCheck"."endpointId"
      AND target."monitorMode" = 'STATUS_ONLY'
  );

UPDATE "EndpointCheck"
SET "liveStatus" = 'BEFORE_LIVE'
WHERE "availabilityStatus" = 'PENDING';

-- 보유 이력 중 최초 라이브 완료 감지 시각을 URL별 라이브 일자로 복구한다.
UPDATE "Endpoint"
SET "liveCompletedAt" = (
  SELECT MIN(checkRow."createdAt")
  FROM "EndpointCheck" AS checkRow
  WHERE checkRow."endpointId" = "Endpoint"."id"
    AND checkRow."liveStatus" = 'LIVE_COMPLETE'
);
