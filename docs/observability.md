# 관측 설정과 운영 점검

## 연결

운영 배포 커밋 `ecf202d`를 기준으로 구현했다. 기존 Vercel Analytics와
Speed Insights는 유지한다. OG 이미지는 Sentry 추가 후 Hobby Edge 1MB 한도를
넘으므로 Node.js 함수에서 생성한다. 로컬 폰트는 파일 시스템에서 읽는다. Hobby의 custom event·짧은 로그 보존 제약을
Sentry SDK와 GA4로 보완한다.

1. `.env.example`을 참고해 로컬 `.env.local`과 Vercel 환경 변수를 설정한다.
   DSN과 GA4 ID는 공개 값이다. Sentry 토큰은 소스나 채팅에 넣지 않는다.
2. Sentry: Next.js 프로젝트 `bendd`의 DSN을 사용한다. Browser/Node/Edge를
   초기화한다. 초기 설정은 오류만 수집하고 tracing, replay, SDK logs를 끈다.
   `NEXT_PUBLIC_VERCEL_ENV`는 Production/Preview별로 지정한다. Release는
   공개 커밋 변수가 없으면 Sentry 빌드 플러그인의 Git revision 주입을 사용한다.
3. Source maps는 `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`을 모두
   설정했을 때만 업로드한다. 토큰은 별도로 안전하게 설정한다.
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
  정기 실행이나 알림 서비스는 이 스크립트만으로 활성화되지 않는다.

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

- [Sentry Next.js manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [GA4 manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Web Vitals](https://github.com/GoogleChrome/web-vitals)
- [Vercel Web Analytics limits](https://vercel.com/docs/analytics/limits-and-pricing)

## 로컬 검증 기록

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
