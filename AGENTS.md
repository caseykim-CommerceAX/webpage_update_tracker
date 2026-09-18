<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Webpage Update Tracker — Persistent Project Context

이 문서는 대화 컨텍스트가 초기화되거나 새 스레드에서 작업을 재개할 때 가장 먼저 읽어야 하는 영속 컨텍스트다. 현재 코드와 충돌하는 내용이 있으면 코드를 확인해 이 문서를 함께 갱신한다.

## 1. Project Goal and Current Scope

- KB국민카드 웹페이지의 PC·모바일 URL을 매일 검사해 라이브 여부와 HEAD/BODY 변경을 기록하는 정적 대시보드다.
- 진단 데이터는 DB가 아니라 Git에 커밋되는 JSON이며, GitHub Actions가 매일 `Asia/Seoul` 오전 9시 7분에 진단하고 GitHub Pages에 배포한다.
- 현재 구성은 24개 대상, 47개 현재 URL, 3개 이전 URL이다. 9월·10월 이벤트는 독립 대상이며 이전 URL도 별도 Endpoint로 계속 진단한다.
- 대시보드, 실행 이력·상세, URL별 전체 진단 로그, 클라이언트 필터, 실패 근거, 구조화 diff, 반응형 UI가 포함된다.
- 모든 화면 앞에는 탭 단위의 1차 접근 암호 화면이 표시된다. 이는 공개 정적 파일을 숨기지 않는 편의상 접근 장벽이며 실제 보안 경계가 아니다.
- 정적 사이트에는 쓰기 API가 없다. 대상 수정은 `data/targets.json`, 수동 전체 진단은 GitHub Actions의 `Run workflow`를 사용한다.

## 2. Technology and Deployment Decisions

- Node.js 24+, Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4를 사용한다.
- `next.config.ts`의 `output: "export"`와 `trailingSlash: true`로 `out/` 정적 파일을 생성한다.
- GitHub Pages 프로젝트 경로는 빌드 시 `PAGES_BASE_PATH=/<repository>`로 설정한다. `next/link`는 basePath를 자동 적용한다.
- `.github/workflows/pages.yml`은 push 시 빌드·배포하고, schedule/workflow_dispatch 시 진단 JSON을 먼저 생성·커밋한 후 배포한다.
- GitHub Pages에는 Node 서버, Route Handler, Server Action이 없다. 브라우저에 GitHub 토큰을 노출하는 진단/편집 기능을 만들지 않는다.
- 일반 GitHub Pages 사이트와 결과 JSON은 공개 정보로 간주한다. 비밀값을 데이터나 클라이언트 번들에 넣지 않는다.
- 루트 레이아웃의 `DashboardAccessGate`는 SHA-256 digest를 비교하고 `sessionStorage`에 현재 탭의 통과 여부를 저장하는 1차 접근 화면이다. 서버 인증이 아니며 공개 JSON이나 정적 파일을 보호하지 않는다.
- 검사 프로세스는 TLS 검증을 끄지 않으며 `node --use-system-ca --import tsx`로 실행한다.
- 로컬 `start`는 `scripts/serve-static.mjs`로 `out/`을 제공한다. `start-team-server.bat`도 정적 빌드 후 이 서버를 실행한다.

## 3. JSON Source of Truth

- `data/targets.json`: 대상·Endpoint·보조 규칙 설정. ID는 이력 연결 키이므로 기존 ID를 임의 변경하지 않는다.
- `data/state.json`: Endpoint별 `launchedAt`, `liveCompletedAt`, 최신 진단, 마지막 변경 시각, 직전 성공 정규화 토큰.
- `data/run-index.json`: 최근순 Run 요약 목록.
- `data/runs/<run-id>.json`: Run과 해당 실행의 전체 URL 결과, 규칙 결과, 판정 근거, 구조화 diff.
- 새 Run 저장 순서는 실행 문서 → 상태 문서 → 인덱스다. 진단 중 `data/scan.lock`을 사용하고 30분 지난 잠금은 정리한다.
- 과거 SQLite의 실행 3건과 URL 진단 135건은 JSON으로 이전되어 Git에 포함된다. 기준 전환 전 복구 커밋은 `6901738`이다.

## 4. Source-of-Truth Map

- `src/lib/tracker/runner.ts`: 실행 잠금, 병렬 검사, JSON 상태·Run 저장
- `src/lib/json-store.ts`, `src/lib/json-types.ts`: JSON 경로, 원자적 쓰기, 문서 타입
- `src/lib/tracker/fetcher.ts`: User-Agent, 제한 시간, 재시도, 인코딩, HTTP 수집
- `src/lib/tracker/canonicalize.ts`: 의미 있는 DOM 토큰과 구조화 diff
- `src/lib/tracker/live-status.ts`: OG 태그와 추천 h2 기반 라이브 판정
- `src/lib/tracker/rules.ts`: HTTP 및 선택형 정적 규칙 평가
- `src/lib/queries.ts`: JSON을 대시보드 ViewModel로 변환
- `src/app/page.tsx`, `src/app/targets/`, `src/app/runs/`: 정적 대시보드와 설정/이력 UI
- `src/components/dashboard-access-gate.tsx`: 모든 화면 앞의 클라이언트 접근 암호 확인과 탭 세션 유지
- `src/app/checks/page.tsx`, `src/components/check-history.tsx`: URL별 진단 이력과 클라이언트 필터
- `scripts/scan.ts`: 로컬/GitHub Actions 진단 CLI
- `scripts/serve-static.mjs`, `scripts/run-e2e.mjs`: 정적 결과 제공과 E2E 서버 수명주기
- `.github/workflows/pages.yml`: 정각 부하를 피한 09:07 KST 진단, JSON 커밋, Pages 배포
- `README.md`: 설치, GitHub 설정, 운영 절차

## 5. Behavioral Invariants

- 가용성, 규칙, 콘텐츠 변경은 하나의 상태로 합치지 않고 별도로 저장한다.
- 콘텐츠 대상은 `meta[property="og:site_name"]`과 BODY h2의 `이런 분께 추천 드려요`를 판정한다. 띄어쓰기 차이는 무시한다.
- 두 신호가 모두 있으면 `LIVE_COMPLETE`, 하나면 `CHECK_REQUIRED`, 둘 다 없으면 `BEFORE_LIVE`, HTML을 확인할 수 없으면 `UNVERIFIED`다.
- `STATUS_ONLY` 대상은 요청 pathname에서 HTTP 200이면 `LIVE_COMPLETE`다.
- 최초 `LIVE_COMPLETE` 시각은 `liveCompletedAt`에 한 번만 기록한다.
- PRELAUNCH가 아직 200이 아니면 `PENDING`이다. 다른 pathname으로 이동한 200은 오픈으로 보지 않는다.
- PRELAUNCH가 정상 경로에서 처음 200이면 `launchedAt`을 기록하고 이후 일반 URL처럼 처리한다.
- 콘텐츠 추적의 첫 성공은 `BASELINE`, 같은 hash는 `UNCHANGED`, 다른 hash는 `CHANGED`다.
- 모든 성공 진단은 바로 직전 성공 진단 ID·시각을 비교 대상으로 기록한다. 동일한 경우 정규화 토큰은 상태 JSON에서 최신 진단 ID만 갱신해 재사용한다.
- 전체 원본 HTML은 저장하지 않는다. 정규화 토큰과 라이브 판정에 실제 사용한 OG meta·추천 h2 원문만 저장한다.
- HEAD는 title/meta, BODY는 heading/text/link/image로 분류하며 값 수정은 삭제 1건과 추가 1건이다.
- `script`, `style`, `noscript`, `template`, SVG, class/id, UTM 등 추적 파라미터는 diff에서 제외한다.
- URL 교체 시 기존 Endpoint ID를 삭제하거나 덮어쓰지 않는다. 기존 항목에 `retiredAt`을 채우고 새 ID의 현재 Endpoint를 추가한다.
- 이전 Endpoint도 `enabled: true`이면 현재 URL과 함께 검사한다. 대상 비활성화는 현재·이전 URL 모두 제외한다.
- 동시에 하나의 진단만 실행한다. GitHub Actions concurrency와 `data/scan.lock`이 중복 실행을 방지한다.
- URL별 로그 왼쪽 선은 라이브 완료(초록), 그 밖의 상태 변경(주황), 판정 불가·오류(빨강)다.

## 6. Seed-specific Rules

- 초기 대상의 보조 규칙은 HTTP 200 하나다. OG meta와 추천 h2는 Rule이 아니라 시스템 내장 라이브 신호다.
- BeV Ⅲ PC·모바일과 서비스 PC는 PRELAUNCH 콘텐츠 대상이다.
- 이벤트 9월·10월은 각각 PC·모바일 PRELAUNCH Endpoint를 가진 독립 `STATUS_ONLY` 대상이다.
- 기획서 업데이트 전 URL 3개는 `retiredAt`이 있는 독립 Endpoint로 정기 검사한다.

## 7. Commands

PowerShell에서는 실행 정책 문제를 피하기 위해 `npm` 대신 `npm.cmd`를 사용한다.

```powershell
npm.cmd install
npm.cmd run dev:local
npm.cmd run scan
npm.cmd run build
npm.cmd run start:local
```

필수 검증:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Playwright 브라우저가 준비된 환경에서는 `npm.cmd run test:e2e`도 실행한다.

## 8. Last Verified State

2026-09-17 JSON 정적 전환 및 1차 접근 화면 기준:

- 기존 SQLite 실행 3건·진단 135건을 실행별 JSON, 상태 JSON, Run 인덱스로 이전했다.
- `better-sqlite3`, 마이그레이션, API Route, 서버 기반 대상 편집과 백그라운드 실행을 제거했다.
- Next.js 정적 export가 `/`, `/targets`, `/runs`, `/checks`, 기존 Run 상세 3개를 생성한다.
- `lint`, `typecheck`, Vitest 7개 파일 21개 테스트를 통과했다.
- basePath 없는 정적 build와 실제 배포 경로인 `PAGES_BASE_PATH=/webpage_update_tracker` build를 모두 통과했다. 배포용 번들에는 암호 원문 없이 SHA-256 digest만 포함된다.
- Playwright E2E 3개를 통과했다: 잘못된 암호 거부와 정상 암호 통과, 탭 세션 유지, 주요 화면 이동, 390px 수평 오버플로, 대상 검색, Actions 수동 진단 링크, URL 로그 클라이언트 필터.
- JSON 무결성 확인 결과 대상 24개, 현재 URL 47개, 이전 URL 3개, 상태 Endpoint 50개, 기존 Run 3개, 기존 진단 135개이며 누락된 Endpoint 상태가 없다.
- GitHub 예약 실행은 매시 정각의 지연·드롭 가능성을 낮추기 위해 `09:07 Asia/Seoul`로 설정한다.

## 9. Fresh-thread Resume Procedure

1. 이 문서 전체와 Next.js 작업에 필요한 `node_modules/next/dist/docs/` 문서를 읽는다.
2. `README.md`, `package.json`, `.github/workflows/pages.yml`, 요청 영역의 source-of-truth 파일을 확인한다.
3. `git status --short`와 최근 diff를 확인하고 사용자 변경을 덮어쓰지 않는다.
4. `data/targets.json`, `data/state.json`, `data/run-index.json`과 인덱스가 가리키는 Run 파일의 존재를 확인한다.
5. 수정 후 lint, typecheck, test, build를 실행하고 가능하면 E2E도 실행한다.
6. 라이브 URL 검사는 결과 JSON을 변경하므로 사용자가 요청하거나 검증에 반드시 필요할 때만 실행한다.
7. 구조, 명령, 판정 규칙, 검증 상태가 달라지면 코드와 함께 이 문서를 갱신한다.

## 10. Repository Hygiene

- 커밋: 소스, 테스트, `package-lock.json`, `.env.example`, `.github/workflows/`, `data/*.json`, README, 이 문서
- 커밋 제외: `.env`, `.data/`, `node_modules`, `.next`, `out`, 로그, 테스트 결과, `*.tsbuildinfo`, 일시적인 `data/scan.lock`
- GitHub Actions가 만든 진단 JSON 커밋은 정상 운영 데이터다. 삭제·수정 시 Run 인덱스, 상태, 실행 문서의 관계를 함께 검증한다.
- Next.js가 이 파일의 `BEGIN/END:nextjs-agent-rules` 블록을 관리한다. 블록 내부를 임의 수정하지 않는다.
