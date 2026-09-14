# 기획서

*2026.09.14(월) 이송영 작성*

# 1. PoC 대상 페이지 URL을 순회합니다.

| **1. ALL 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-all-card | https://m.kbcard.com/cards/credit-cards/kb-all-card |
| --- | --- | --- |
| **2. ALL point 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-all-point-card | https://m.kbcard.com/cards/credit-cards/kb-all-point-card |
| **3. YOU Prime 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-you-prime-card | https://m.kbcard.com/cards/credit-cards/kb-you-prime-card |
| **4. YOU With 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-you-with-card | https://m.kbcard.com/cards/credit-cards/kb-you-with-card |
| **5. YOU Wish 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-you-wish-card | https://m.kbcard.com/cards/credit-cards/kb-you-wish-card |
| **6. YOU Wish up 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-you-wish-up-card | https://m.kbcard.com/cards/credit-cards/kb-you-wish-up-card |
| **7. NEED Edu카드** | https://card.kbcard.com/cards/products/credit-cards/kb-need-edu-card | https://m.kbcard.com/cards/credit-cards/kb-need-edu-card |
| **8. NEED Global 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-need-global-card | https://m.kbcard.com/cards/credit-cards/kb-need-global-card |
| **9. NEED Pay 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-need-pay-card | https://m.kbcard.com/cards/credit-cards/kb-need-pay-card |
| **10. WE:SH Travel** | https://card.kbcard.com/cards/products/credit-cards/kb-wesh-travel-card | https://m.kbcard.com/cards/credit-cards/kb-wesh-travel-card |
| **11. My WE:SH 카드** | https://card.kbcard.com/cards/products/credit-cards/kb-my-wesh-card | https://m.kbcard.com/cards/credit-cards/kb-my-wesh-card |
| **12. 굿데이올림카드** | https://card.kbcard.com/cards/products/credit-cards/kb-good-day-ollim-card | https://m.kbcard.com/cards/credit-cards/kb-good-day-ollim-card |
| **13. 스카이패스 티타늄카드** | https://card.kbcard.com/cards/products/credit-cards/kb-skypass-titanium-card | https://m.kbcard.com/cards/credit-cards/kb-skypass-titanium-card |
| **14. American Express Blue Card** | https://card.kbcard.com/cards/products/credit-cards/american-express-blue-kb-kookmin-card | https://m.kbcard.com/cards/credit-cards/american-express-blue-kb-kookmin-card |
| **15. HERITAGE Classic(할인형)** | https://card.kbcard.com/cards/products/premium-cards/kb-heritage-classic-discount-type | https://m.kbcard.com/cards/premium-cards/kb-heritage-classic-discount-type |
| **16. HERITAGE Classic(스카이패스형)** | https://card.kbcard.com/cards/products/premium-cards/kb-heritage-classic-skypass-type | https://m.kbcard.com/cards/premium-cards/kb-heritage-classic-skypass-type |
| **17. BeV Ⅲ 카드** | https://card.kbcard.com/cards/products/premium-cards/kb-bev3-card | https://m.kbcard.com/cards/premium-cards/kb-bev3-card |
| ㄴ 업데이트 전 URL | https://card.kbcard.com/cards/products/premium-cards/bev3-card | https://m.kbcard.com/cards/premium-cards/bev3-card |
| **18. Youth Club 체크카드** | https://card.kbcard.com/cards/products/check-cards/kb-youth-club-check-card | https://m.kbcard.com/cards/check-cards/kb-youth-club-check-card |
| **19. 노리2 체크카드(KB Pay)** | https://card.kbcard.com/cards/products/check-cards/kb-nori2-check-card-kbpay-type | https://m.kbcard.com/cards/check-cards/kb-nori2-check-card-kbpay-type |
| **20. 트래블러스 체크카드** | https://card.kbcard.com/cards/products/check-cards/kb-travelers-check-card | https://m.kbcard.com/cards/check-cards/kb-travelers-check-card |
| **21. 국민행복카드** | https://card.kbcard.com/cards/products/credit-cards/kb-kookmin-haengbok-card | https://m.kbcard.com/cards/credit-cards/kb-kookmin-haengbok-card |
| **22. 서비스** | https://card.kbcard.com/benefits/vip-lounge/kb-prime-plus | - |
| ㄴ 업데이트 전 URL | https://card.kbcard.com/benefits/vip-lounge/prime-plus | - |
| **23. 이벤트** | https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-09 | https://m.kbcard.com/benefits/events/kb-new-card-annual-fee-cashback-2026-09 |

# 2. 라이브 여부를 체크합니다.

이 대시보드의 최우선 목적은 각 PC·모바일 페이지의 현재 HTML에서 라이브 완료 신호를 확인하는 것입니다. 전일 대비 변경 여부가 아니라 현재 진단 결과를 기준으로 판정합니다.

콘텐츠 판정 대상은 다음 두 신호를 확인합니다.

1. `<head>`에 `<meta property="og:site_name">` OG 태그가 존재
2. `<body>`의 `h2` 태그에 `이런 분께 추천 드려요` 문구가 포함
   - `추천드려요`처럼 띄어쓰기만 다른 경우도 같은 문구로 인식

판정 상태는 다음과 같습니다.

- 두 신호가 모두 확인되면 `라이브 완료`
- 두 신호 중 하나만 확인되면 `체크 필요`
- 두 신호가 모두 없으면 `라이브 전`
- 접속 오류 등으로 HTML을 확인하지 못하면 `판정 불가`

URL별로 두 신호가 처음 모두 확인된 시각을 `라이브 일자`로 저장합니다. 이후 진단에서 HTML이 동일하거나 일부 신호가 사라지더라도 최초 라이브 일자는 이력으로 보존합니다.

모든 진단은 DB 이력으로 보존하고 대시보드에서 시간순으로 조회할 수 있어야 합니다. 라이브 상태가 바뀐 기록만 필터링해 `라이브 전` → `체크 필요` → `라이브 완료` 시점을 확인할 수 있어야 하며, 각 진단 상세에는 판정에 실제 사용한 OG meta와 추천 h2의 원문 태그를 표시합니다. 전체 원본 HTML은 저장하지 않습니다.

`23. 이벤트`처럼 상태만 추적하는 대상은 기존 기획대로 요청 경로의 HTTP 200 응답을 `라이브 완료`로 판정합니다.

# 3. 업데이트를 체크합니다.

## 1) 기존 페이지가 존재하는 경우

전일 진단 결과를 기준선으로 저장하고, 오늘 진단 결과와 비교해 추가·삭제·값 변경이 있는지 체크합니다.
아래의 “존재 여부 체크”는 오늘 값만 보고 합격/실패를 판정한다는 뜻이 아니라, 전일과 오늘 사이에 해당 값의 존재 여부가 달라졌는지를 판정한다는 뜻입니다.

1. `<head>` 태그 수정이 있는지 체크
    
    → 전일에는 없던 OG 태그가 오늘 추가되거나, 기존 값이 변경·삭제되었는지 체크
    
    ```html
    <meta property="og:site_name" content="KB국민카드">
    ```
    
2. `<body>` 태그 수정이 있는지 체크
    
    → 전일에는 없던 `이런 분께 추천 드려요</h2>` 값이 오늘 추가되거나, 기존 값이 변경·삭제되었는지 체크
    
    ```html
    <h2 class="tit tit--h2">ALL 카드, 이런 분께 추천드려요</h2>
    ```

현재 진단에 해당 태그나 문구가 존재한다는 사실만으로는 변경으로 판정하지 않습니다. 전일과 오늘의 값이 같으면 `변경 없음`, 달라졌을 때만 `변경 감지`로 판정합니다.
    

## 2) 기존 페이지가 존재하지 않는 경우 (`23. 이벤트`)

→ HTTP Status 값 체크

# 4. 테스트 케이스

## [TC1] `<head>` 태그 수정이 있는 경우

1. `변경 감지` 판정
    - 전일 스냅샷에는 `og:site_name` meta 태그가 없음
    - 오늘 스냅샷에 해당 태그가 추가됨
    - HEAD 태그 `추가 1건`으로 판정
2. `변경 없음` 판정
    - 전일과 오늘 스냅샷에 동일한 `og:site_name` meta 태그가 존재함
    - 현재 태그가 존재하더라도 값이 같으면 변경 없음으로 판정

## [TC2] `<body>` 태그 수정이 있는 경우

1. `변경 감지` 판정
    - 전일 스냅샷에는 `이런 분께 추천드려요` 문구가 포함된 h2 태그가 없음
    - 오늘 스냅샷에 해당 h2 태그가 추가됨
    - BODY 태그 `추가 1건`으로 판정
2. `변경 없음` 판정
    - 전일과 오늘 스냅샷에 동일한 h2 태그와 문구가 존재함
    - 현재 문구가 존재하더라도 값이 같으면 변경 없음으로 판정

## [TC3] 신규 페이지가 라이브된 경우

1. `HTTP 200` 판정
    - [https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001?mainCC=a&eventNum=1002030](https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001?mainCC=a&eventNum=1002030)
    - 위 URL 검사 시 `HTTP 200` 판정
2. `HTTP 404` 판정
    - https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10
    - 위 URL 검사 시 `HTTP 404` 판정

# 5. 스케줄링

- 하루에 1회 로직이 실행됩니다.
- 오늘 결과는 DB에 저장된 직전 성공 진단(일일 실행 기준 전일 결과)과 비교합니다.
