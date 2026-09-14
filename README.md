# Webpage Update Tracker

KB국민카드 PC·모바일 페이지의 HEAD/BODY 태그 변경을 직전 저장 진단과 비교하는 로컬 웹 대시보드입니다. HTTP 상태와 사용자가 별도로 추가한 정적 규칙은 태그 변경과 분리해 기록합니다.

## 시작하기

요구 사항은 Node.js 24 이상과 Windows입니다.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:setup
.\start-team-server.bat
```

이후에는 `start-team-server.bat`를 더블클릭하면 됩니다. BAT 파일이 DB를 준비하고 팀 접속 주소를 표시한 뒤 서버를 실행합니다. 같은 사내망의 팀원에게 표시된 `http://IPv4:3000` 주소를 공유하고, 사용하는 동안 BAT 창을 열어 두세요.

본인 PC에서만 열려면 `npm.cmd run dev:local`을 사용합니다. 초기 데이터는 기획서의 23개 항목과 45개 현재 URL이며, 시드는 기존 사용자가 편집한 항목을 덮어쓰지 않습니다.

## 팀 접속 범위

- 기본 `dev`와 `start`는 `0.0.0.0`에 바인딩합니다.
- 방화벽 규칙은 TCP 3000, Node.js 실행 파일, `Domain`·`Private` 네트워크, `LocalSubnet` 원격 주소로 제한합니다.
- 팀원이 접속하지 못할 때만 관리자 권한 PowerShell에서 `npm.cmd run network:allow`를 한 번 실행합니다.
- 팀 공유를 중단하려면 관리자 권한 PowerShell에서 `npm.cmd run network:remove`를 실행합니다.
- 이 제한은 같은 서브넷의 장비를 허용하는 방식이며 팀원 신원을 인증하지는 않습니다. 다른 부서와 서브넷을 공유하거나 VPN·외부망 공개가 필요하면 앱 인증을 먼저 추가해야 합니다.

## 검사 실행

- 대시보드의 `지금 전체 진단`
- CLI 전체 검사: `npm.cmd run scan`
- 매일 오전 9시 예약 등록: `npm.cmd run schedule:install`
- 예약 제거: `npm.cmd run schedule:remove`

예약 진단은 웹 서버가 꺼져 있어도 실행되며, 결과는 `.data/tracker.db`에 기록됩니다. 작업 스케줄러 등록 권한이 필요할 수 있습니다.
검사 프로세스는 TLS 검증을 끄지 않고 Node.js의 `--use-system-ca` 옵션으로 Windows 신뢰 저장소를 사용합니다.

## 판정 기준

- 기존/오픈된 URL은 요청 경로에서 HTTP 200을 반환해야 정상입니다.
- 오픈 대기 URL의 404는 실패가 아니라 `오픈 대기`입니다. 다른 경로로 이동한 200은 오픈으로 보지 않습니다.
- 첫 성공 응답은 `기준선`이며, 이후 성공 진단은 DB에 저장된 직전 성공 진단과 비교합니다. 매일 한 번 예약하면 일반적으로 어제와 오늘의 비교가 됩니다.
- 현재 태그나 문구가 존재한다는 이유만으로 합격·실패를 판정하지 않습니다. 예를 들어 어제 없던 `이런 분께 추천드려요` h2가 오늘 생기면 BODY `추가 1건`, 양일 모두 동일하게 존재하면 `변경 없음`입니다.
- HEAD는 `<title>`과 `<meta>`, BODY는 제목·본문·링크·이미지 태그로 나눠 추가/삭제 건수를 기록합니다. 값 수정은 이전 값 삭제와 새 값 추가로 표시합니다.
- `script`, `style`, class/id와 추적 파라미터는 태그 변경 비교에서 제외합니다.
- 모든 URL 진단 결과는 `EndpointCheck`에 저장되며 비교 대상 진단 ID와 HEAD/BODY 변경 건수도 함께 남습니다. 변경이 없으면 기존 스냅샷을 재사용하고 원본 HTML은 보관하지 않습니다.
- URL을 변경하면 과거 Endpoint를 보존하고 새 Endpoint의 기준선을 생성합니다.
- 초기 대상에는 접속 확인용 HTTP 200 규칙만 등록합니다. 대상 관리의 Meta·텍스트 정적 규칙은 오늘 값 자체를 반드시 검증해야 하는 별도 요구가 있을 때만 사용합니다.

## 실패 원인 확인

- 대시보드 상단은 최근 완료 진단의 URL·변경 URL·HEAD/BODY 변경 건수만 요약합니다.
- `태그 변경 상세`를 펼치면 섹션별 추가·삭제 태그를 볼 수 있습니다.
- `페이지별 최신 진단`의 `실패 원인 보기`를 펼치면 해당 URL의 접속 오류나 규칙 실패 실제 확인값을 볼 수 있습니다.
- `실패 상세 보기` 또는 `실행 이력`의 상세 화면에서는 실행 단위로 모든 실패와 구조화 변경 내용을 확인합니다.
- 오픈 대기 중인 PRELAUNCH URL은 실패 진단에서 제외되고 `오픈 대기`로 별도 표시됩니다.

## 품질 확인

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

Playwright 브라우저가 없다면 최초 1회 `npx.cmd playwright install chromium`을 실행해야 합니다.
이미 실행 중인 개발 서버로 E2E를 검증하려면 `PLAYWRIGHT_BASE_URL`에 서버 주소를 지정할 수 있습니다.
