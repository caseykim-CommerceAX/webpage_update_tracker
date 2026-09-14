# Webpage Update Tracker

KB국민카드 PC·모바일 페이지의 HTTP 상태, 지정 규칙, 의미 있는 DOM 변경을 매일 확인하는 로컬 웹 대시보드입니다.

## 시작하기

요구 사항은 Node.js 24 이상과 Windows입니다.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:setup
npm.cmd run dev
```

브라우저에서 `http://127.0.0.1:3000`을 엽니다. 초기 데이터는 기획서의 23개 항목과 45개 현재 URL이며, 시드는 기존 사용자가 편집한 항목을 덮어쓰지 않습니다.

## 검사 실행

- 대시보드의 `지금 전체 검사` 또는 항목별 검사 버튼
- CLI 전체 검사: `npm.cmd run scan`
- 매일 오전 9시 예약 등록: `npm.cmd run schedule:install`
- 예약 제거: `npm.cmd run schedule:remove`

예약 검사는 Feed 서버가 꺼져 있어도 실행되며, 결과는 `.data/tracker.db`에 기록됩니다. 작업 스케줄러 등록 권한이 필요할 수 있습니다.
검사 프로세스는 TLS 검증을 끄지 않고 Node.js의 `--use-system-ca` 옵션으로 Windows 신뢰 저장소를 사용합니다.

## 판정 기준

- 기존/오픈된 URL은 요청 경로에서 HTTP 200을 반환해야 정상입니다.
- 오픈 대기 URL의 404는 실패가 아니라 `오픈 대기`입니다. 다른 경로로 이동한 200은 오픈으로 보지 않습니다.
- `script`, `style`, class/id와 추적 파라미터는 전체 변경 비교에서 제외합니다.
- 기준선과 실제 변경 스냅샷만 저장하며 원본 HTML은 보관하지 않습니다.
- URL을 변경하면 과거 Endpoint를 보존하고 새 Endpoint의 기준선을 생성합니다.

## 품질 확인

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

Playwright 브라우저가 없다면 최초 1회 `npx.cmd playwright install chromium`을 실행해야 합니다.
