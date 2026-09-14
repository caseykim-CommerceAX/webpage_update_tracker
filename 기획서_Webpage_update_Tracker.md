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

# 2. 업데이트를 체크합니다.

## 1) 기존 페이지가 존재하는 경우

1. <head> 태그 수정이 있는지 체크
    
    → og 태그 존재하는지 체크
    
    ```html
    <meta property="og:site_name" content="KB국민카드">
    ```
    
2. <body> 태그 수정이 있는지 체크
    
    → `이런 분께 추천 드려요</h2>` 값이 있는지 체크
    
    ```html
    <h2 class="tit tit--h2">ALL 카드, 이런 분께 추천드려요</h2>
    ```
    

## 2) 기존 페이지가 존재하지 않는 경우 (`23. 이벤트`)

→ HTTP Status 값 체크

# 3. 테스트 케이스

## [TC1] <head> 태그 수정이 있는 경우

1. `TRUE` 판정
    - [https://card.kbcard.com/cards/products/credit-cards/kb-all-card](https://card.kbcard.com/cards/products/credit-cards/kb-all-card)
    - 위 URL 검사 시 `TRUE` 판정
2. `FASLE` 판정
    - [https://card.kbcard.com/cards/products/credit-cards/american-express-blue-kb-kookmin-card](https://card.kbcard.com/cards/products/credit-cards/american-express-blue-kb-kookmin-card)
    - 위 URL 검사 시 `FALSE` 판정

## [TC2] <body> 태그 수정이 있는 경우

1. `TRUE` 판정
    - [https://card.kbcard.com/cards/products/credit-cards/kb-all-card](https://card.kbcard.com/cards/products/credit-cards/kb-all-card)
    - 위 URL 검사 시 `TRUE` 판정
2. `FASLE` 판정
    - [https://card.kbcard.com/cards/products/credit-cards/american-express-blue-kb-kookmin-card](https://card.kbcard.com/cards/products/credit-cards/american-express-blue-kb-kookmin-card)
    - 위 URL 검사 시 `FALSE` 판정

## [TC3] 신규 페이지가 라이브된 경우

1. `HTTP 200` 판정
    - [https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001?mainCC=a&eventNum=1002030](https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001?mainCC=a&eventNum=1002030)
    - 위 URL 검사 시 `HTTP 200` 판정
2. `HTTP 404` 판정
    - https://card.kbcard.com/benefits/events/ongoing/kb-new-card-annual-fee-cashback-2026-10
    - 위 URL 검사 시 `HTTP 404` 판정

# 4. 스케줄링

- 하루에 1회 로직이 실행됩니다.