ALTER TABLE "EndpointCheck" ADD COLUMN "headLiveMarkerHtml" TEXT;
ALTER TABLE "EndpointCheck" ADD COLUMN "bodyLiveMarkerHtml" TEXT;

-- 전체 원본 HTML은 보관하지 않는다. 이 필드는 이후 진단부터 실제 판정에 사용한
-- OG meta와 추천 문구 h2의 원문 조각만 저장한다. 과거 이력은 정확한 원문을
-- 복구할 수 없으므로 NULL로 유지한다.
