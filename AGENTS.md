<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Webpage Update Tracker — Persistent Project Context

이 문서는 대화 컨텍스트가 초기화되거나 새 스레드에서 작업을 재개할 때 가장 먼저 읽어야 하는 영속 컨텍스트다. 현재 코드와 충돌하는 내용이 있으면 코드를 확인해 이 문서를 함께 갱신한다.

## 1. Project Goal and Current Scope

- KB국민카드 웹페이지의 PC·모바일 URL을 매일 검사하는 로컬 우선 PoC다.
- 직전 저장 진단 대비 HEAD/BODY 태그 변경을 핵심으로 보고, HTTP 상태와 등록 규칙을 별도 판정으로 SQLite에 기록해 한국어 웹 대시보드에서 보여준다.
- 초기 데이터는 `기획서_Webpage_update_Tracker.md`의 23개 항목과 45개 현재 URL이다.
- 현재 범위에는 URL/규칙 편집, 전체 수동 진단, 실패 원인과 실제 확인값 진단, 실행 이력, HEAD/BODY 구조화 diff, 반응형 UI, Windows 작업 스케줄러 스크립트가 포함된다.
- 외부 알림, 인증, 브라우저 렌더링 기반 수집, 클라우드 배포는 아직 범위 밖이다.

## 2. Technology and Important Decisions

- Node.js 24+, Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4를 사용한다.
- 저장소는 `better-sqlite3` 기반의 동기식 typed repository다. Prisma ORM은 사용하지 않는다.
  - 처음에는 Prisma를 계획했지만 사내 self-signed CA 때문에 Prisma 엔진 다운로드가 실패해 직접 SQLite 계층으로 전환했다.
  - `prisma/` 디렉터리 이름은 초기 SQL 마이그레이션과 seed 파일 위치로만 남아 있다.
- DB는 `.data/tracker.db`이며 Git에 포함하지 않는다. 스키마는 앱이 최초 DB 연결 시 자동 적용되고 `npm.cmd run db:setup`은 누락된 초기 대상만 seed한다.
- 검사 프로세스는 TLS 검증을 끄지 않는다. `node --use-system-ca --import tsx`로 Windows 신뢰 저장소를 사용한다.
- 웹앱은 현재 `127.0.0.1`에만 바인딩하며 인증이 없다. 외부 또는 사내망 공개 전에는 인증과 권한 검사가 필수다.

## 3. Source-of-Truth Map

- `src/lib/tracker/runner.ts`: 실행 잠금, 엔드포인트 검사, 상태/스냅샷 저장의 핵심 흐름
- `src/lib/tracker/fetcher.ts`: User-Agent, 제한 시간, 재시도, 인코딩, HTTP 수집
- `src/lib/tracker/canonicalize.ts`: 의미 있는 DOM 토큰과 구조화 diff
- `src/lib/tracker/rules.ts`: 태그 diff와 분리된 HTTP 및 선택형 정적 규칙 평가
- `src/lib/db.ts`: SQLite 연결과 마이그레이션 적용
- `src/lib/target-service.ts`: 대상 생성/수정, URL 교체 시 이력 보존
- `src/lib/queries.ts`: 대시보드와 실행 상세용 배치 조회
- `src/app/api/`: 대상 편집, 검사 시작, 실행 진행 상태 API
- `src/app/page.tsx`, `src/app/targets/`, `src/app/runs/`: 대시보드와 관리/이력 UI
- `src/components/check-diagnostics.tsx`: 접속·규칙 실패 원인과 실제 확인값 표시
- `prisma/migrations/202609140001_init/migration.sql`, `202609140002_check_comparisons/migration.sql`, `202609140003_remove_seed_content_rules/migration.sql`: 현재 DB 스키마, 진단 비교 필드, 오해로 생성된 정적 규칙 정리
- `prisma/seed.ts`: 기획서의 초기 23개 항목
- `scripts/scan.ts`: 수동/예약 검사 CLI
- `scripts/install-schedule.ps1`, `scripts/remove-schedule.ps1`: 매일 09:00 Windows 예약 등록/제거
- `README.md`: 사용자가 따라야 하는 설치와 운영 방법

## 4. Behavioral Invariants

- 가용성, 규칙, 콘텐츠 변경은 하나의 상태로 합치지 않고 별도로 저장한다.
- `PRELAUNCH` URL이 아직 200이 아니면 실패가 아니라 `PENDING`이다.
- 신규 URL이 이전 경로 등 다른 pathname으로 리다이렉트되면 200이어도 오픈으로 보지 않는다.
- PRELAUNCH URL이 동일한 경로에서 처음 200을 반환하면 `launchedAt`을 기록하고 이후에는 일반 기존 페이지처럼 취급한다.
- 콘텐츠 추적의 첫 성공 응답은 `BASELINE`이며 변경으로 알리지 않는다.
- 이후 성공 진단은 가장 최근 성공 `EndpointCheck`와 그 스냅샷을 비교한다. 모든 진단 행은 `comparedCheckId`로 비교 대상을 가리키며 HEAD/BODY 추가·삭제 건수를 저장한다.
- 동일하면 새 스냅샷을 중복 저장하지 않지만 `UNCHANGED` 진단 행과 비교 관계는 반드시 저장한다.
- 원본 HTML은 저장하지 않는다. 제목, meta, 본문 텍스트, 링크, 이미지로 만든 정규화 토큰만 저장한다.
- HEAD는 title/meta, BODY는 heading/text/link/image 토큰으로 분류한다. 값 수정은 삭제 1건과 추가 1건으로 집계한다.
- 현재 태그/문구의 존재 여부 자체는 변경 판정이 아니다. 예를 들어 추천 h2가 양일 모두 존재하면 `UNCHANGED`, 전일에 없고 오늘 추가됐을 때만 BODY 추가로 판정한다.
- Meta/텍스트 정적 규칙은 전일 대비 diff와 별도인 선택 기능이다. 초기 시드에는 추가하지 않는다.
- `script`, `style`, `noscript`, `template`, SVG, class/id, UTM 등 추적 파라미터는 diff에서 제외한다.
- URL 수정은 기존 Endpoint를 덮어쓰지 않는다. 기존 행을 retire하고 새 Endpoint를 만들어 과거 이력과 기준선을 분리한다.
- 대상 삭제는 hard delete가 아니라 비활성화로 처리한다.
- 동시에 하나의 Run만 실행할 수 있으며 30분 넘게 멈춘 Run은 다음 실행 시 실패로 정리한다.

## 5. Seed-specific Rules

- 모든 초기 항목의 규칙은 접속 확인용 HTTP 200만 등록한다. OG meta와 추천 h2는 현재값 필수 규칙이 아니라 전일 대비 HEAD/BODY diff의 예시다.
- BeV Ⅲ: PC·모바일 모두 PRELAUNCH이며 오픈 후 HTTP와 DOM 변경을 검사한다.
- 서비스: PC PRELAUNCH이며 오픈 후 HTTP와 DOM 변경을 검사한다.
- 이벤트: PC·모바일 PRELAUNCH, `STATUS_ONLY`, HTTP 상태만 검사한다.
- 기획서의 “업데이트 전 URL”은 `referenceUrl`로만 표시하고 정기 검사하지 않는다.

## 6. Commands

PowerShell에서는 실행 정책 문제를 피하기 위해 `npm` 대신 `npm.cmd`를 사용한다.

```powershell
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev
npm.cmd run scan
npm.cmd run schedule:install
npm.cmd run schedule:remove
```

필수 검증:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Playwright 브라우저가 준비된 환경에서는 `npm.cmd run test:e2e`도 실행한다.

## 7. Last Verified State

2026-09-14 기준:

- `lint`, `typecheck`, 프로덕션 `build` 통과
- Vitest 6개 파일, 14개 테스트 통과
- Playwright E2E 2개 통과: 주요 화면 이동·활성 메뉴와 390px 모바일 수평 오버플로 확인
- Playwright 캡처로 1440px·390px 대시보드의 요약 → 태그 변경 상세 → 페이지별 진단 계층과 레이아웃 확인
- 주요 앱/API 경로의 로컬 HTTP 200 확인
- ALL 카드 PC·모바일 라이브 검사: HTTP 200, 첫 실행 `BASELINE`, 연속 실행 `UNCHANGED`
- BeV Ⅲ PC·모바일 라이브 검사: 실패 0, `PENDING` 2
- API가 백그라운드 검사 프로세스를 시작하고 완료 상태를 폴링하는 흐름 확인
- 작업 스케줄러 PowerShell 스크립트 문법 확인; 실제 OS 예약 등록은 자동으로 수행하지 않았다.
- `EndpointCheck`는 직전 성공 진단 ID와 HEAD/BODY 추가·삭제 건수를 저장하며 기존 DB 이력도 마이그레이션에서 역산한다.
- 오해로 생성했던 OG/추천 문구 정적 규칙과 오판정 결과는 마이그레이션으로 제거하며 HTTP 결과와 구조화 diff 이력은 보존한다.
- 대시보드 상단은 최근 전체 진단의 URL·변경 URL·HEAD/BODY 건수만 요약하고, 태그 diff와 실패 원인은 하단 상세 및 실행 상세에서 펼친다.

## 8. Fresh-thread Resume Procedure

새 대화 스레드에서는 다음 순서로 현재 상태를 복구한다.

1. 이 `AGENTS.md` 전체를 읽고 Next.js 작업이면 위 자동 생성 블록이 지시한 로컬 Next 문서도 읽는다.
2. `README.md`, `package.json`, 사용자가 요청한 영역의 source-of-truth 파일을 확인한다.
3. Git 저장소가 있으면 `git status --short`와 최근 diff를 확인한다. 사용자 변경을 되돌리거나 덮어쓰지 않는다.
4. `.data/tracker.db`의 존재를 가정하지 않는다. 새 clone이면 `npm.cmd run db:setup`으로 생성한다.
5. 수정 전 관련 테스트를 확인하고, 수정 후 최소한 lint, typecheck, test, build를 실행한다.
6. 라이브 URL 검사는 외부 상태를 바꾸지 않지만 실제 사이트 상태에 의존하므로 필요한 표본만 실행한다.
7. 구조, 명령, 판정 규칙 또는 검증 상태가 달라지면 코드와 함께 이 문서를 갱신한다.

## 9. Repository Hygiene

- 커밋해야 함: 소스, 테스트, `package-lock.json`, `.env.example`, migration, seed, README, 이 문서
- 커밋하지 않음: `.env`, `.data/tracker.db`, `node_modules`, `.next`, 로그, 테스트 결과, `*.tsbuildinfo`
- Next.js가 이 파일의 `BEGIN/END:nextjs-agent-rules` 블록을 관리한다. 해당 블록은 삭제하거나 내부를 임의 수정하지 말고 프로젝트 컨텍스트는 블록 밖에 유지한다.
