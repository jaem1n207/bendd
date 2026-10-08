# 관측 설정과 운영 점검

로컬 장애 대응 코드의 설치·업데이트·롤백·Mac 교체는
[로컬 장애 대응 운영 문서](incident-response.md)를 따른다.

## 연결

운영 배포 커밋 `ecf202d`를 기준으로 구현했다. 기존 Vercel Analytics와
Speed Insights는 유지한다. OG 이미지는 Sentry 추가 후 Hobby Edge 1MB 한도를
넘으므로 Node.js 함수에서 생성한다. 로컬 폰트는 파일 시스템에서 읽는다. Hobby의 custom event·짧은 로그 보존 제약을
Sentry SDK와 GA4로 보완한다.

1. 일반 로컬 개발·빌드는 환경 파일 없이 실행할 수 있다. 로컬 계측을 확인할
   때만 `.env.example`을 `.env.local`로 복사한다. Vercel 설정은 아래
   [설정 위치](#설정-위치)를 따른다. DSN과 GA4 ID는 공개 값이다.
   Sentry 토큰은 소스나 채팅에 넣지 않는다.
2. Sentry: Next.js 프로젝트 `bendd`의 DSN을 사용한다. Browser/Node/Edge를
   초기화한다. 초기 설정은 오류만 수집하고 tracing, replay, SDK logs를 끈다.
   `NEXT_PUBLIC_VERCEL_ENV`는 Production/Preview별로 지정한다. Release는
   Sentry 빌드 플러그인의 Git revision 주입을 사용한다. 수동 공개 커밋
   변수로 덮어쓰지 않는다.
3. Source maps는 Vercel Production·Preview 빌드에서 자동 업로드한다.
   `SENTRY_ORG=jaemin`, `SENTRY_PROJECT=bendd`, `SENTRY_AUTH_TOKEN`이
   누락되거나 공백이면 빌드를 중단한다. 조직 Auth Token의 `org:ci` 권한을
   사용하고 Vercel Production·Preview의 Sensitive 환경 변수에 저장한다.
   로컬 개발·GitHub CI는 토큰 없이 빌드하며, 로컬에서 직접 업로드할 때만
   Git에서 제외되는 `.env.local`에 토큰을 설정한다. 토큰은 `NEXT_PUBLIC_` 변수로
   만들지 않는다. 빌드 완료 훅에서 Browser/Node/Edge 산출물을 한 번에 업로드하며,
   공유 client chunk도 포함한다. Debug ID로 JS와 map을 연결하고 release는 빌드
   플러그인의 Git revision을 사용한다. 성공한 업로드 로그와 Sentry 프로젝트의
   Source Maps artifact bundle을 확인한다. 업로드 실패를 무시하는 error handler는
   두지 않는다. 업로드 후 브라우저 map을 제거하며 서버 map은 런타임 진단을 위해
   유지한다. Vercel 변수 변경은 기존 배포를 바꾸지 않으므로 다음 빌드가 필요하다.
4. GA4: `bendd.me` 웹 스트림의 G- 측정 ID를 사용한다. 스트림의 향상된 측정을
   **모두 끈다**. 자동 pageview·scroll·form 이벤트가 수동 이벤트와 겹치거나
   URL/input을 추가 수집하지 않도록 하기 위한 설정이다. Google Signals와
   광고 맞춤설정은 코드에서 끈다.
5. GA4 custom dimensions: `content_path`, `target_path`, `demo_id`,
   `metric_name`, `navigation_path`, `metric_rating`. 숫자 custom metrics:
   `active_read_ms`, `metric_value`, `metric_delta`. `metric_id`는 높은 cardinality를
   피하도록 UI custom dimension으로 등록하지 않는다. 모든 맞춤 정의의 범위는
   이벤트다. `active_read_ms` 단위는 밀리초, `metric_value`와 `metric_delta`는
   일반 수치다. CLS는 점수이고 나머지는 밀리초이므로 `metric_name`별로 분석한다.

GA4 스크립트는 글/Craft 화면의 개인정보 설정에서 **허용한 뒤** 로드한다.
거절/철회하면 앱 이벤트 전송과 대기 이벤트를 중단하고 GA 쿠키를 삭제한다.
다른 탭의 선택도 반영한다. Google Analytics는 쿠키·네트워크 메타데이터를
처리하므로 운영 전 사이트의 개인정보 안내를 이 구성에 맞게 검토한다.
동의하지 않은 방문자를 포함한 전체 트래픽은 기존 Vercel Analytics에서 본다.

## 이벤트 정의

| 이벤트                  | 조건                                         | 횟수/속성                                               |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `page_view`             | 동의한 글/Craft 상세 방문                    | 상세 방문마다 한 번; 쿼리·fragment 제외                 |
| `engaged_read`          | 활성 탭·창에서 30초 이상 + 본문 75% 도달     | 상세 방문마다 한 번; 이해도가 아닌 참여 proxy           |
| `related_article_click` | 상세 페이지에서 다른 내부 글/Craft 링크 클릭 | 상세 방문마다 첫 클릭 한 번; 목적지 경로만              |
| `demo_complete`         | Shuffle Letters 데모의 애니메이션 완료       | 상세 방문·데모마다 한 번; 중단은 제외; 입력 텍스트 제외 |
| `web_vital`             | Web Vitals callback + 전송 시점에 GA4 동의   | CLS/FCP/INP/LCP/TTFB; metric ID와 값이 같으면 중복 제외 |

SPA 상세 이동 시 읽기 시간·진도·중복 상태를 초기화한다. 실제 데모의 완료
callback에서만 이벤트를 발생시키고 unmount 후에는 제외한다. 자동 WebMCP 실행도 완료에 포함되므로
인간의 사용성 지표로 해석할 때 이 한계를 고려한다.

Web Vitals는 document navigation 기준이다. `navigation_path`는 최초 문서
경로이며 SPA 이동마다 새 LCP/TTFB를 측정한 것으로 해석하면 안 된다.
metric ID가 같은 갱신 보고는 별도 사용자 표본이 아니다. 분석 시 ID별 마지막
값을 사용한다. 동의 전에 끝난 측정은 나중에 소급 전송하지 않는다. Web Vitals
observer는 외부 전송 없이 로컬에서 등록하고, 전송 시 동의 여부를 확인한다.

## 검증

- Preview에서 SDK 네트워크 요청을 확인한다. 현재 Production·Preview는 같은
  프로젝트/스트림을 사용한다. Sentry는 environment로 구분하고 GA4 운영 분석은
  호스트 `bendd.me` / `www.bendd.me`로 제한해 Preview 표본을 제외한다.
  대량 QA를 수행한다면 별도 DSN/GA4 스트림을 사용한다.
- Sentry: 실제 오류 화면/서버 오류/OG 실패에 이슈가 생성되고 route, digest,
  release를 확인한다. 브라우저와 서버 보고가 함께 나타날 수 있다.
- 오류 payload에서 user, request body/headers/cookies, extra, breadcrumbs,
  frame vars를 제거한다. URL query/hash, 이메일, 알려진 인증 값도 제거한다.
  임의의 자유 텍스트 전체 익명화를 보장하지 않으므로 입력을 오류 메시지에
  넣지 않는다.
- GA4: 동의 전 요청 없음 → 허용 → 읽기/링크/완료 → 철회 → 새 이벤트 없음 순으로
  확인한다. GA4 Realtime/DebugView에서 중복 여부를 본다. 로컬 테스트에는
  외부 전송 대신 gtag queue를 사용한다.
- `node scripts/check-availability.mjs [https://bendd.me]`는 홈·인기 글·RSS·OG를
  점검한다. 상태뿐 아니라 HTML/RSS marker·PNG signature를 확인한다.
  단발 점검은 알림을 보내지 않는다. 정기 실행은 아래 워크플로에서 담당한다.

## 정기 가용성 점검과 알림

`.github/workflows/availability.yml`은 `main`에 병합된 뒤 GitHub Actions에서
1시간마다(한국 시간 매시 7분) 실행되도록 예약된다. 실제 생성은 지연·누락될 수 있다. MacBook과 Vercel Cron, 별도 서비스
토큰에 의존하지 않는다. 한 실행에서 홈·대표 글·RSS·OG에 각각 최대 10초의
외부 요청을 보내고 HTTP 200·콘텐츠 형식·HTML/RSS marker·PNG signature를
확인한다. 지역별 가용성, 사용자 체감 지연, Sentry 오류나 GA4 참여 분석은
이 점검의 범위가 아니다.

1. **정상**: 실행 로그·Actions Summary·`availability-state` artifact에만 기록한다.
2. **첫 실패**: 경로별 연속 실패 횟수를 기록하고 알림을 보내지 않는다.
3. **같은 경로의 2회 연속 실패**: `jaem1n207`에게 배정한 장애 이슈를 한 번 연다.
   이슈에 경로·HTTP/오류·콘텐츠 판정·응답 시간·점검 실행 링크를 남긴다.
4. **장애 지속**: 열린 이슈가 있으면 추가 댓글·이슈를 만들지 않는다.
5. **전체 경로 복구**: 같은 이슈에 복구 댓글을 한 번 남기고 닫는다.
   댓글 저장 뒤 닫기가 실패해도 다음 실행에서 같은 댓글을 반복하지 않는다.

1시간 주기에서 같은 경로 2회 연속 실패가 필요하므로 지연이 없는 경우에도
장애 발생부터 이슈 생성까지 약 1~2시간 걸릴 수 있다. 정기 실행 지연·누락·Mac 절전이
겹치면 더 길어질 수 있다. 정상 점검은 하루 24회, 30일 기준 약 720회다.

선택한 채널은 GitHub 이슈와 GitHub 알림이다. 실제 이메일·모바일 알림 수신은
사용자의 GitHub 알림 설정에 따른다. 이슈 배정으로 참여 알림 대상이 된다.
정상 실행의 정기 보고나 매 실행 실패 댓글은 보내지 않는다. 장애 자체는
워크플로 실패로 처리하지 않고, GitHub API·권한·상태 파일 오류는 실행을
실패시켜 점검 시스템 문제와 사이트 장애를 구분한다. API 실패를 정상으로
간주하거나 접근 오류를 반복 재시도하지 않는다.

### 상태 보존과 중복 방지

- 직전 완료 실행의 `state.json`을 artifact에서 읽는다. 알림 API가 실패한
  실행도 저장된 상태를 사용할 수 있다. 체크 후 알림 전에 상태를 저장하고,
  artifact 업로드는 실패 시에도 실행한다. 숨김 폴더 `.availability`의 JSON만
  업로드하도록 `include-hidden-files: true`를 지정한다. 보존 기간은 7일이다.
- 최초 실행·artifact 삭제/만료·직전 실행에 artifact가 없는 경우 실패 횟수를
  새로 시작한다. 이전 점검과 간격이 180분을 넘으면 같은 방식으로 초기화한다.
  API 접근 거부·다운로드 실패·손상된 JSON은 초기화로 숨기지 않고 중단한다.
- 열린 `github-actions[bot]` 이슈의 전용 marker로 장애를 식별한다. 상태 기록을
  잃어도 열린 장애 이슈를 중복 생성하지 않으며, 현재 전체 성공을 확인한 뒤
  복구할 수 있다. 사람이 만든 이슈·PR은 수정하지 않는다.
- 실행은 concurrency로 직렬화하고 실행 중인 점검을 취소하지 않는다.
  GitHub의 대기 실행 병합·스케줄 지연으로 점검 간격은 늘어날 수 있다.
- 장애 이슈를 수동으로 닫아도 점검은 꺼지지 않는다. 다음 확정 실패에서 새
  이슈가 열릴 수 있다. 중지는 워크플로 비활성화를 사용한다.

### 운영과 복구

- 필요한 권한은 `contents: read`, `actions: read`, `issues: write`이다.
  실행 단계의 일회성 `GITHUB_TOKEN`만 사용하며 checkout에 인증을 남기지 않는다.
  정기 점검에는 의존성 설치·앱 빌드·Sentry 토큰이 필요하지 않다.
- 수동 실행: GitHub → Actions → Availability → Run workflow → `main`.
  다른 브랜치에는 알림을 보내지 않는다. 새 PR의 테스트는 가짜 GitHub driver와
  응답을 사용하므로 실제 장애 이슈나 댓글을 만들지 않는다.
- 로컬 검사: `pnpm test:availability`와 `node scripts/check-availability.mjs`.
  전자는 외부 요청 없이 상태 전환·HTTP/내용 오류·권한 실패·댓글 중복을 검사한다.
  후자는 실제 사이트를 한 번 확인하지만 알림/상태 저장은 하지 않는다.
- 실패한 실행은 Actions 로그와 마지막 artifact를 확인한다. 권한 오류는
  저장소 Actions 설정을 확인하고, 손상된 artifact만 삭제한 뒤 다시 실행한다.
  과거 artifact로 임의 복구해 연속 실패를 추정하지 않는다.
- 비활성화: Actions → Availability → Disable workflow. 코드 복구는 이 PR을
  revert한다. 이미 생성한 이슈는 남으며 기존 앱/배포에는 변경이 없다.

GitHub schedule은 기본 브랜치에서만 실행되며 정확한 실행 시각을 보장하지
않는다. 공개 저장소는 활동이 60일 없으면 정기 실행이 자동 비활성화될 수
있으므로 Actions의 활성 상태를 운영 점검에 포함한다. 엄격한 가용성 SLA가
필요해지면 별도 모니터링 서비스로 이전한다.
([GitHub schedule 동작](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[artifact](https://docs.github.com/en/actions/tutorials/store-and-share-data),
[이슈 API](https://docs.github.com/en/rest/issues/issues))

## 주간 기준선

같은 요일의 최근 7일을 비교하고 배포 커밋·시각을 함께 기록한다.

- 트래픽: Vercel 방문자/pageview, 유입 경로, 인기 landing 글.
- 참여: 동의한 상세 방문 대비 engaged read·후속 링크·데모 완료율.
  전체 방문자와 GA4 동의 표본을 섞지 않는다.
- 오류: Sentry 신규/회귀 이슈, 경로·release, Vercel 5xx/timeout 비율과 요청 수.
- 지연: Web Vitals ID별 마지막 값을 기준으로 P75, 충분한 표본에서 P95.
  낮은 표본 수를 표시하고 P99를 단정하지 않는다. CLS는 점수, 나머지는 ms.
- 포화: Vercel throttled requests, CPU throttle, 메모리, 팀 공유 사용 한도.
  누적 과금 사용량을 순간 CPU 사용률로 해석하지 않는다.
- 가용성: 외부 점검 결과. 정기 점검을 연결할 경우 2회 연속 실패와 복구 때만 알림.

배포 후 30분은 오류·응답 상태·사용자 성능을 확인하되 트래픽이 낮으면 관측
기간을 늘린다. 문제를 원인별로 좁힌 뒤 최적화하고 같은 표본 조건에서 비교한다.

## 근거

- [Next.js 15 config phase](https://nextjs.org/docs/15/app/api-reference/config/next-config-js#phase)

- [Sentry Next.js manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [GA4 manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Web Vitals](https://github.com/GoogleChrome/web-vitals)
- [Vercel Web Analytics limits](https://vercel.com/docs/analytics/limits-and-pricing)

## 로컬 검증 기록

아래는 날짜별 과거 검증 기록이다. 현재 설정과 운영 절차는
[소스맵 운영 절차](#소스맵-운영-절차)를 따른다.

2026-10-04: 타입·린트·포맷·운영 빌드, 전체 단위 테스트 568개 및 이후 추가한
계측 회귀 검사를 통과했다. 외부 홈·인기 글·RSS·OG 단발 점검도 통과했다.
SDK의 debug/tracing 코드는 build-time에 제거했다. Next.js 빌드 표시 기준,
기준 커밋 대비 공유 First Load JS는 약 37KB, 글 상세는 약 43KB 증가했다.
이는 측정 기능의 비용이며 운영 배포 후 모바일 표본에서 확인한다.

Sentry `jaemin/bendd` 프로젝트 생성과 공개 DSN 확인을 완료했다. DSN은
Git에서 제외되는 로컬 `.env.local`에 저장했다. GA4 `Bendd` 계정(410564082), `bendd.me` 속성(557281548),
웹 스트림(16038543327)을 생성했다. 대한민국 시간대·원화를 사용하며,
향상된 측정은 비활성화했다. 측정 ID `G-JTMKENH49Y`는 `.env.local`에 저장했다.
GA4 맞춤 측정기준 6개(`content_path`, `target_path`, `demo_id`, `metric_name`,
`navigation_path`, `metric_rating`)와 숫자 맞춤 측정항목 3개(`active_read_ms`,
`metric_value`, `metric_delta`)를 등록하고 관리 화면의 저장 결과를 확인했다.
Vercel `jaemins-crafts/bendd`의 Production·Preview에 공개 DSN, GA4 ID,
`SENTRY_ORG`, `SENTRY_PROJECT`와 환경별 `NEXT_PUBLIC_VERCEL_ENV`를 연결했다. 비밀 업로드 토큰은 생성/등록하지 않았다.
실제 발급된 값으로 운영 빌드도 통과했다. 최종 코드의 CI는 전체 테스트
575개(63파일), 타입·린트·포맷·빌드와 CodeQL을 통과했다. OG Node.js 전환 후
Vercel Preview가 READY가 되었고 로컬 폰트의 배포 tracing을 확인했다.

Arc Preview 검증: 동의 전 Google 요청 0건, 허용 후 gtag/collect 요청과
`page_view`, 30초 활성 읽기 후 `engaged_read`를 확인했다. 철회 후 GA 비활성화와
쿠키 삭제를 확인했고 새 글로 이동해도 이벤트가 추가되지 않았다.
Sentry 검사 오류는 `preview` 환경과 PR Git release로 실제 수신했다.
GA4 실시간 보고서에서 활성 사용자 1명과 `page_view`·`engaged_read` 수신을
확인했다. 운영 배포의 활성화와 응답 확인은 별도로 수행한다. 정기 알림은 활성화하지 않았다.
기본 설정 값이 비어 있으면 외부 계측은 시작되지 않는다.

## 개인정보 설정 UI

2026-10-04 브리프: 글·Craft 본문이 보이는 첫 스크롤 이후 세션당 한 번 작은
우측 하단 카드를 표시한다. 스크롤이 필요 없는 짧은 콘텐츠는 보이는 본문에
10초간 머문 뒤 표시한다. 자동 등장은 포커스와 본문 배치를 바꾸지 않는다.
닫기는 선택을 저장하지 않으며, 허용·거부 후에는 자동으로 다시 묻지 않는다.
항상 접근 가능한 ‘쿠키 설정’으로 선택을 다시 바꿀 수 있다.

상세 설정은 같은 모서리에서 위·왼쪽으로 확장하며, 사용자가 직접 열 때만
배경을 어둡게 하고 외부를 inert 처리한다. Escape·바깥 클릭으로 접고
원래 버튼에 포커스를 복귀한다. 허용과 ‘거부하기’는 동등한 버튼을 사용한다.
선택은 즉시 저장하고 같은 자리의 확인 상태로 바꾼 뒤 활성 화면 시간 4초 후
퇴장한다. `visibilitychange`·창 포커스 변경 시 남은 시간을 보존한다.
Motion layout + opacity, 펼침 300ms·접힘 200ms, 곡선 `[0.19, 1, 0.22, 1]`;
동작 줄이기는 이동·확대를 제거하고 100ms 페이드만 유지한다.

2026-10-04 사용자 요청으로 GA4 속성 `557281548`의 이벤트 보관을
2개월에서 14개월로 변경하고 저장·새로고침 후 확인했다. 사용자 보관
14개월과 새 사용자 활동 시 재설정 켜짐은 유지했다. GA4 안내에 따르면
변경은 24시간 후 적용된다. 쿠키 수명과 서버 데이터 보관은 별개다. 태그에 호스트 범위,
`cookie_expires: 63072000`, `cookie_update: true`를 명시한다. `_ga`·`_ga_*`는
마지막 방문부터 2년이며 재방문 시 갱신된다. 브라우저가 더 일찍 삭제할 수
있다. 사용자 데이터 보관도 활동마다 갱신되며, 합산된 표준 보고서는 이
보관 기간의 적용 대상이 아니다. 상세 화면에서 이 차이와 저장 위치·철회
효과, Vercel/Sentry의 별도 관측 범위를 설명한다. GA4 관리 설정을 바꿀
때는 `privacy-details.tsx` 문구도 함께 갱신한다.

Arc 로컬 검증에서 1280px 안내 카드가 Dock을 가리는 것을 재현했다.
1439px 이하에서는 Dock 크기와 최대 확대 비율을 고려해 카드를 위로 띄운다.
높이가 낮아도 설명만 스크롤되고 제목·선택 버튼·설정 버튼은 유지한다.

상세 정보는 번호가 있는 아코디언 네 개로 나누고 기본적으로 접는다.
수집 항목은 목록, 쿠키 종류와 데이터 보관 기간은 정의 목록으로 표시한다.
현재 선택은 본문에서 제거하고 선택 버튼의 `aria-pressed`와 체크·문구로
표시한다. 중첩된 `overflow: auto`와 `overscroll-behavior: contain`이 휠
입력을 막는 것을 재현했으며, 설명의 스크롤 영역을 하나로 정리한다.

## 소스맵 운영 절차

자동 업로드의 실행 환경은 Vercel이다. MacBook 교체와 관계없이 Vercel에
저장된 변수로 동작한다. 코드·의존성 버전·설정 예시는 Git에서 관리하고,
토큰 원본은 접근을 제한한 비밀번호 관리자에서 관리한다.

### 설정 위치

| 변수                           | 용도                          | 저장 위치                                                              |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`       | 앱 오류 수집에 쓰는 공개 주소 | Vercel Production·Preview, 필요하면 로컬 `.env.local`                  |
| `SENTRY_ORG`, `SENTRY_PROJECT` | 업로드 목적지 `jaemin/bendd`  | Vercel Production·Preview                                              |
| `SENTRY_AUTH_TOKEN`            | `org:ci` 조직 업로드 권한     | Vercel Production·Preview의 **Sensitive/Secret** 변수, 비밀번호 관리자 |

`next.config.mjs`는 Next.js의 production build 단계와 Vercel 시스템 변수
`VERCEL=1`, `VERCEL_ENV=production|preview`를 함께 확인한다. Vercel의
시스템 환경 변수 노출을 유지한다. `CI=true`, 공개 환경 이름, `next dev`,
`next start`만으로는 필수 설정 검증이 실행되지 않는다. 로컬에서도 세 업로드
변수가 모두 있으면 업로드하므로, 평소 로컬 개발에는 토큰을 설정하지 않는다.

`.env.example`은 로컬 계측용 공개 변수만 포함한다. DSN·GA4 ID를 비우면
해당 서비스는 수집하지 않는다. 로컬 환경 이름은 `development`로 두어
운영 오류와 구분한다. Git은 `.env`, `.env.*`, `.sentryclirc*`를 제외하며
`.env.example`만 추적한다.

로컬에서 소스맵을 직접 업로드해야 할 때만 `.env.local`에 아래 항목을
임시로 추가한다. 토큰 원본은 비밀번호 관리자에서 입력하고, 업로드 후
세 항목을 제거한다. 공개 계측 변수와 다른 서비스 설정은 유지한다.

```dotenv
SENTRY_ORG=jaemin
SENTRY_PROJECT=bendd
SENTRY_AUTH_TOKEN=
```

GitHub CI는 토큰 없이 빌드하므로 별도 Sentry Secret이 필요하지 않다.
앱의 release는 빌드 플러그인이 주입한다. 이전 로컬 설정에 남아 있는
`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`는 제거한다.

### Sentry CLI 의존성 패치

`sentry@0.45.0`을 Next.js 빌드 플러그인에서 반복 호출하면 CLI 내부
텔레메트리가 호출마다 `SIGTERM` 리스너를 남긴다. Vercel에서는 Node.js의
`MaxListenersExceededWarning`이 발생하며, `SENTRY_CLI_NO_TELEMETRY=1`로도
리스너 등록이 멈추지 않는다.

`patches/sentry@0.45.0.patch`는 CJS·ESM의 라이브러리 호출에서만 CLI 자체
텔레메트리 초기화를 건너뛴다. CLI 명령 실행과 인증, release 생성·확정,
소스맵 업로드, 앱의 Sentry 오류 수집 설정은 유지한다. 리스너 한도를 높이거나
경고 출력을 숨기지 않는다. 단독 CLI 실행은 패치 대상이 아니다.

패치는 `pnpm-workspace.yaml`과 lockfile로 고정하고 CI의 frozen install에서
적용한다. 패치를 처음 추가하거나 변경한 뒤에는 Vercel Preview를 한 번
**기존 빌드 캐시 없이** 재배포한다. 2026-10-05 검증에서는 패치 적용 전
배포의 캐시를 복원할 때 리스너 경고가 남았지만, 같은 커밋을 캐시 없이
재배포하자 경고 없이 업로드가 성공했다. 패키지 설치 성공 로그만으로
빌드에 쓰인 코드가 갱신됐다고 판단하지 않는다.

대시보드 Redeploy에서 기존 Build Cache 사용을 끄고 Preview를 선택한다.
CLI로 재배포할 때도 `--scope jaemins-crafts --target preview`로 팀과 환경을
명시하고, 로그의 캐시 생략·업로드 성공·경고 유무를 확인한다. 이후 자동
배포에서 캐시를 다시 사용해도 경고가 없는지 확인한다. 상시 캐시 비활성화나
Production 재배포는 필요하지 않다.

Sentry 의존성을 갱신할 때 다음 순서로 확인한다.

1. 상위 버전에서 라이브러리 호출의 리스너 누적이 해결됐는지 확인한다.
2. `sentry-cli.spec.ts`의 CJS·ESM 반복 호출 검사를 통과하는지 확인한다.
3. Vercel Preview에서 release 처리·소스맵 업로드 성공과 빌드 경고가 없는지 확인한다.
4. 상위 버전에서 문제가 해결되면 패치와 `patchedDependencies` 등록을 제거하고
   lockfile을 갱신한다. 버전만 바꾸고 기존 패치를 재사용하지 않는다.

### 새 MacBook에서 개발하기

1. 저장소를 받고 `package.json`에 지정된 Node.js 24와 pnpm 버전을 준비한다.
2. `pnpm install --frozen-lockfile`을 실행한다.
3. `.env.example`을 `.env.local`로 복사한다. 로컬 오류 수집·분석이 필요할 때만
   공개 DSN·측정 ID를 채운다. 환경 이름은 `development`를 유지하고
   업로드 토큰은 추가하지 않는다.
4. `pnpm dev` 또는 `pnpm build`를 실행한다. 일반 개발에는 Vercel 연결이나
   Sentry 업로드 토큰 복사가 필요하지 않다.

[Sensitive/Secret 변수](https://vercel.com/docs/environment-variables/sensitive-environment-variables)는
Vercel에서 원본 값을 다시 읽을 수 없으므로 `vercel env pull`을 토큰 백업으로 사용하지 않는다. 로컬 업로드가 꼭 필요하면
비밀번호 관리자에서 토큰을 `.env.local`에 설정하고, 작업 후 로컬 사본을
제거한다. 토큰을 `NEXT_PUBLIC_` 변수·셸 명령 인자·Git·채팅에 넣지 않는다.

### 업로드 토큰 교체하기

1. Sentry `jaemin` 조직에서 `org:ci` 업로드 토큰을 새로 만들고 용도와 발급일을
   식별 가능한 이름으로 남긴다. 원본은 비밀번호 관리자에 저장한다.
2. Vercel `jaemins-crafts/bendd`의 Production·Preview에서
   `SENTRY_AUTH_TOKEN`을 새 값으로 교체한다. Sensitive 설정을 유지한다.
3. 새 Preview 빌드에서 업로드 성공 로그, 해당 release의 artifact bundle과
   Debug ID 연결, 실제 오류의 원본 파일·행 번호 복원을 확인한다.
4. 검증 후 기존 토큰을 폐기한다. 검증 실패 시 기존 토큰으로 변수를 복구한다.
   환경 변수 변경은 기존 배포에 소급 적용되지 않으므로 새 빌드로 확인한다.

### 빌드·업로드 실패 대응

- **설정 누락**: 오류에 표시된 변수 이름을 해당 Vercel 환경에서 확인한다.
  빈 값·공백도 누락으로 처리한다. Production·Preview를 각각 확인한다.
- **401/403**: 조직·프로젝트·토큰 권한을 확인한다. 접근이 거부되면 작업을
  중단하고 관리자 또는 사용자에게 권한을 요청한다.
- **네트워크·Sentry 장애**: 첫 실패 로그와 배포 ID를 남기고 서비스 상태를
  확인한다. 원인을 해소한 뒤 다시 빌드한다. 업로드 실패를 무시하는
  `errorHandler`나 소스맵 비활성화로 배포를 통과시키지 않는다.
- **업로드 성공인데 원본 위치가 없음**: 오류와 artifact의 release·Debug ID가
  같은지 확인한다. 다른 빌드의 map이나 예전 배포 오류와 혼동하지 않는다.

처음 배포하거나 Sentry SDK를 바꾼 뒤에는 Preview에서 위 업로드 검증과
브라우저 `.map` URL의 404, 브라우저 JS의 토큰 미포함을 확인한다.
로컬 회귀 검사는 `pnpm test:unit --run src/lib/monitoring/sentry-build.spec.ts`로
실행한다. 설정 로드 검사는 외부 업로드를 실행하지 않으며, 실제 업로드·오류
복원을 대신하지 않는다.

## 소스맵 업로드 검증

2026-10-04: 사용자 설정 토큰으로 로컬 빌드의 실제 업로드를 확인했다.
검증 release는 `bendd-sourcemap-verification-20261004`이며 운영 Git release와
구분한다. Sentry Source Maps 화면에서 브라우저 106개 artifact(JS/map 53쌍),
서버 74개 artifact(37쌍)를 확인했다. JS와 map의 Debug ID가 일치한다.
빌드 성공 후 `.next/static`의 map은 0개이며, map URL은 404다. 서버 map
37개는 유지한다. 브라우저 JS에 업로드 토큰이 포함되지 않는 것도 확인했다.

사용자 승인으로 Vercel `jaemins-crafts/bendd`의 Production·Preview에
`SENTRY_AUTH_TOKEN`을 Sensitive 변수로 등록하고 두 환경의 등록 결과를
재조회했다. 기존 `SENTRY_ORG=jaemin`, `SENTRY_PROJECT=bendd`도 같은 범위에
있다. 토큰과 Vercel 연결 파일은 Git에서 제외된다. 운영 재배포는 수행하지
않았으며, 변경한 빌드 설정이 배포된 다음 빌드부터 자동 업로드된다.
실제 오류의 원본 파일·행 번호 복원은 Preview 오류 수신으로 별도 확인한다.

2026-10-04 유지보수 검증: 설정·release 회귀 검사 23개와 포맷 검사를
통과했다. 실제 Next 빌드에서 Vercel Preview의 토큰 누락이 컴파일 전에
차단되는 것을 확인했다. `CI=true`, `GITHUB_ACTIONS=true`인 토큰 없는
운영 빌드도 타입·린트 검사를 포함해 통과했다. 기존 린트 경고는 남아 있다.
이 검증에서는 외부 소스맵 업로드와 운영 배포를 실행하지 않았다.

로컬 대응기의 매시 12분 점검은 GitHub 결과가 늦으면 같은 Availability를 main에서 요청한다.
최신 성공 결과의 55분 기준은 1시간 tick의 실행 시간 여유이며 별도의 55분 스케줄이 아니다.
대기 중인 실행과 저장된 request intent를 확인해 중복 요청을 막는다.
기존 bot 이슈·연속 실패 판정·복구 알림은 유지하며 점검 갱신에 Codex를 호출하지 않는다.
읽기 전용 점검·실패한 실행·인증 거부·불명확한 요청은 자동 재시도하지 않는다.
Mac 또는 GitHub 실행 시스템이 중단되면 이 보완도 지연될 수 있다.
상세 운영 규칙은 [장애 대응 문서](incident-response.md#github-예약-지연-보완)를 따른다.

## 2026-10-08 토큰 교체 후 Production 검증

Vercel Production·Preview의 `SENTRY_AUTH_TOKEN`이 교체된 것을 확인했다.
Production 배포 `dpl_F3tnhG2GekD9UAixqbNNLxdZVsRd`는 Git 커밋 `5d945f7`을
빌드했으며 `READY`, 함수 리전 `icn1`이다. 빌드 로그에서
`Successfully uploaded source maps to Sentry`를 확인했다.

이 기록은 Production 업로드 성공을 확인한다. 해당 빌드의 artifact bundle과
실제 오류의 원본 파일·행 번호 복원은 Sentry 화면에서 별도 확인해야 한다.

[Production 배포](https://vercel.com/jaemins-crafts/bendd/F3tnhG2GekD9UAixqbNNLxdZVsRd)
