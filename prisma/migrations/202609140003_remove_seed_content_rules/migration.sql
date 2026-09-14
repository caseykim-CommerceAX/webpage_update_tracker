-- 기획서의 예시는 현재값 필수 규칙이 아니라 전일 대비 변경 예시다.
-- 잘못 생성했던 정적 OG/추천 문구 판정과 그 결과만 제거하고 HTTP 판정은 유지한다.
DELETE FROM "RuleResult"
WHERE "ruleId" IN (
  SELECT "id"
  FROM "Rule"
  WHERE (
    "type" = 'META_ATTRIBUTE'
    AND "label" = 'KB국민카드 OG 태그'
    AND "selector" = 'meta[property="og:site_name"]'
    AND "attribute" = 'content'
    AND "expectedValue" = 'KB국민카드'
  ) OR (
    "type" = 'TEXT_CONTAINS'
    AND "label" = '추천 문구'
    AND "selector" = 'h2'
    AND "expectedValue" = '이런 분께 추천드려요'
  )
);

DELETE FROM "Rule"
WHERE (
  "type" = 'META_ATTRIBUTE'
  AND "label" = 'KB국민카드 OG 태그'
  AND "selector" = 'meta[property="og:site_name"]'
  AND "attribute" = 'content'
  AND "expectedValue" = 'KB국민카드'
) OR (
  "type" = 'TEXT_CONTAINS'
  AND "label" = '추천 문구'
  AND "selector" = 'h2'
  AND "expectedValue" = '이런 분께 추천드려요'
);

-- 삭제한 오판정이 과거 실행의 실패 집계에 남지 않도록 다시 계산한다.
UPDATE "Run"
SET "failureCount" = (
  SELECT COUNT(*)
  FROM "EndpointCheck" AS checkRow
  WHERE checkRow."runId" = "Run"."id"
    AND (
      checkRow."availabilityStatus" IN ('UNAVAILABLE', 'ERROR')
      OR EXISTS (
        SELECT 1
        FROM "RuleResult" AS result
        WHERE result."checkId" = checkRow."id"
          AND result."status" IN ('FAIL', 'ERROR')
      )
    )
);

UPDATE "Run"
SET "status" = CASE
  WHEN "failureCount" > 0 THEN 'COMPLETED_WITH_ERRORS'
  ELSE 'COMPLETED'
END
WHERE "status" IN ('COMPLETED', 'COMPLETED_WITH_ERRORS');
