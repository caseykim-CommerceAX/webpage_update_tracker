# Webpage Update Tracker

KB국민카드 PC·모바일 페이지의 라이브 여부와 HTML 변경을 매일 진단하는 정적 대시보드입니다. 진단 결과는 SQLite나 별도 서버 없이 실행별 JSON으로 저장하고, GitHub Actions가 매일 오전 9시 진단과 GitHub Pages 배포를 담당합니다.

## 로컬에서 확인하기

Node.js 24 이상이 필요합니다. PowerShell에서는 `npm` 대신 `npm.cmd`를 사용합니다.

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run start:local
```

브라우저에서 `http://127.0.0.1:3000`을 엽니다. 개발 모드는 `npm.cmd run dev:local`로 실행합니다.

대시보드에 처음 진입하면 접근 암호를 요청합니다. 한 번 통과하면 현재 브라우저 탭이 열려 있는 동안에는 다시 묻지 않고, 탭을 닫은 뒤 새로 접속하면 다시 입력해야 합니다.

> 이 접근 화면은 정적 GitHub Pages에서 대시보드를 우연히 열어보는 것을 막기 위한 1차 장치입니다. 서버 인증이 아니므로 개발자 도구로 우회할 수 있고, 공개 저장소의 JSON에는 직접 접근할 수 있습니다. 민감한 데이터나 비밀값을 저장하지 마세요.

실제 URL을 한 번 진단하려면 다음 명령을 사용합니다. 이 명령은 `data/`의 JSON을 갱신하므로 실행 전에 작업 트리가 깨끗한지 확인하는 편이 좋습니다.

```powershell
npm.cmd run scan
```

## JSON 구조

- `data/targets.json`: 대상, 현재·이전 URL, 판정 방식, 보조 규칙
- `data/state.json`: URL별 최초 라이브 일자, 최근 성공 비교 기준, 최신 진단
- `data/run-index.json`: 실행 이력 요약
- `data/runs/<run-id>.json`: 실행별 전체 URL 진단 결과와 구조화 diff

전체 원본 HTML은 저장하지 않습니다. 비교용 정규화 토큰과 라이브 판정에 사용한 OG meta·추천 h2 원문 조각만 저장합니다. 이전 SQLite의 실행 3건과 URL 진단 135건도 위 JSON 구조로 이전되어 있습니다.

## GitHub Pages 배포

1. 프로젝트를 GitHub 저장소의 `main` 브랜치에 push합니다.
2. 저장소의 `Settings → Pages`에서 Source를 `GitHub Actions`로 선택합니다.
3. `Settings → Actions → General → Workflow permissions`에서 워크플로가 저장소 내용을 쓸 수 있도록 허용합니다. 조직 정책이 `contents: write`를 허용해야 진단 JSON 자동 커밋이 가능합니다.
4. `Actions → Diagnose and deploy dashboard → Run workflow`를 한 번 실행합니다.
5. 완료 후 `https://<계정>.github.io/<저장소명>/`으로 접속합니다.

일반 GitHub Pages 사이트와 저장소의 JSON은 공개됩니다. 대시보드 접근 화면은 이를 비공개로 전환하지 않으므로 JSON에 비밀번호, 토큰 또는 비공개 정보를 넣지 마세요.

`.github/workflows/pages.yml`은 다음 작업을 수행합니다.

- 코드가 `main`에 push되면 정적 대시보드만 다시 빌드·배포
- 매일 `Asia/Seoul` 오전 9시에 전체 URL 진단
- Actions의 `Run workflow`로 수동 전체 진단
- 새 실행 JSON을 `main`에 자동 커밋한 뒤 최신 대시보드 배포

GitHub 예약 실행은 부하에 따라 정각보다 늦게 시작될 수 있습니다. Actions 실행 환경에서 KB카드 URL 접근이 가능한지도 첫 수동 실행 로그로 확인해야 합니다.

## 대상 수정

정적 사이트에는 쓰기 API가 없으므로 대시보드에서 대상을 편집하지 않습니다. `data/targets.json`을 수정하고 `main`에 push합니다.

URL을 교체할 때는 이력과 비교 기준을 분리하기 위해 다음 원칙을 지킵니다.

- 기존 Endpoint는 삭제하지 않고 `retiredAt`을 채운 이전 URL로 유지
- 새 URL은 새로운 고유 `id`를 가진 현재 Endpoint로 추가
- 이전 URL도 계속 진단해야 하면 `enabled: true` 유지
- 대상 전체를 제외하려면 Target의 `enabled`를 `false`로 변경

## 판정 기준

- 콘텐츠 대상은 HEAD의 `meta[property="og:site_name"]`와 BODY `h2`의 `이런 분께 추천 드려요` 포함 여부로 판정합니다. 문구의 띄어쓰기 차이는 무시합니다.
- 두 신호가 모두 있으면 `라이브 완료`, 하나만 있으면 `체크 필요`, 둘 다 없으면 `라이브 전`, HTML을 확인하지 못하면 `판정 불가`입니다.
- 상태 전용 대상은 요청 경로에서 HTTP 200이면 `라이브 완료`입니다.
- PRELAUNCH URL이 아직 정상 경로에서 200이 아니면 실패가 아니라 `오픈 대기`입니다.
- 다른 pathname으로 리다이렉트된 200 응답은 오픈으로 보지 않습니다.
- 첫 성공 응답은 `기준선`이며 이후 성공 진단은 URL별 직전 성공 진단과 비교합니다.
- HEAD는 title/meta, BODY는 heading/text/link/image 토큰으로 나눠 추가·삭제 건수를 기록합니다.
- `script`, `style`, `noscript`, `template`, SVG, class/id, UTM 등 추적 파라미터는 diff에서 제외합니다.

## 화면 기능

- 대시보드: 최근 전체 진단 요약과 URL별 최신 상태
- 진단 대상 설정: `targets.json`에 등록된 현재·이전 URL 확인
- 실행 이력: 실행별 처리·변경·실패 수와 상세 결과
- URL별 진단 로그: URL별 전체 실행 결과, 대상·채널·상태·상태 변경 필터
- 실행 상세: 라이브 판정 실제 태그, 실패 원인, HEAD/BODY 구조화 diff

대시보드의 `GitHub에서 전체 진단` 링크는 Actions 워크플로 화면을 엽니다. GitHub에 로그인하고 저장소 실행 권한이 있는 사용자가 `Run workflow`를 눌러야 합니다.

## 품질 확인

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Playwright 브라우저가 없다면 최초 1회 `npx.cmd playwright install chromium`을 실행합니다. E2E는 정적 빌드를 만든 뒤 임시 정적 파일 서버로 주요 화면과 클라이언트 필터를 검증합니다.
