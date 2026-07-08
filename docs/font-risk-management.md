# Font Risk Management

## Summary

bendd.me는 Korean/English technical writing의 기본 sans font로
Pretendard Variable을 사용한다. Gaegu를 실제 페이지에 적용해본 결과,
사이트의 개인적인 분위기는 강해졌지만 긴 한글 본문에서 글자 형태가
고르지 않고 문장 단위 스캔 비용이 커졌다. 본문 폰트는 장식이 아니라
읽기 인프라이므로, 최종 선택은 손글씨 계열이 아니라 한영 혼용 본문에
적합한 Pretendard Variable이다.

현재 정책은 다음과 같다.

- 전역 sans 폰트는 root layout의 `--font-sans` Pretendard Variable을 사용한다.
- 전역 mono 폰트는 root layout의 `--font-mono`를 사용한다.
- Pretendard는 `src/app/fonts/PretendardVariable.woff2`에서 `next/font/local`로 self-host한다.
- Pretendard license는 `src/app/fonts/Pretendard-LICENSE.txt`에 함께 보관한다.
- Article/Craft 상세 본문은 별도 decorative content-only 웹폰트를 로드하지 않는다.
- 본문 layout safeguard는 유지한다: 충분한 line-height, Korean line break, long-token wrapping, code/table/control font isolation.
- 런타임에는 `fonts.googleapis.com` 또는 `fonts.gstatic.com`으로 직접 요청하지 않는다.

## Why Gaegu Was Reverted

Gaegu는 사용자의 reference image와 정서적으로 가까웠지만, 긴 본문에서 다음 문제가 컸다.

- 글자 획과 폭이 불규칙해서 한국어 문장을 빠르게 훑기 어렵다.
- 제목과 TL;DR에서는 개성이 보이지만, 본문에서는 모든 문장이 같은 강도의 장식처럼 보인다.
- 작은 화면이나 긴 문단에서 줄 간격을 넓혀도 문자 판별 부담이 남는다.
- 영어, 숫자, code-ish token, 링크가 섞인 기술 글에서는 글꼴 리듬이 깨진다.
- 사용자는 블로그 본문을 오래 읽어야 하므로 aesthetic gain보다 readability loss가 더 크다.

따라서 Gaegu는 제품 폰트로 채택하지 않고, 이번 실험에서 얻은 performance/accessibility 방어선만 유지한다.

## Risk Register

### 1. Readability And Cognitive Load

**Issue:** 장식적 폰트, 손글씨 폰트, contrast가 약한 폰트는 짧은 문구에서는 분위기를 만들지만 긴 글에서는 문자 판별과 문장 스캔 비용을 높인다.

**Response:** Article/Craft 상세 본문은 손글씨/장식 폰트가 아니라 전역
`--font-sans` Pretendard Variable을 사용한다.

**Why:** bendd.me의 상세 페이지는 긴 한국어 technical writing이 핵심이다.
Pretendard는 한글과 라틴 문자가 함께 나오는 문장에서도 밀도 차이가 작고,
장식적 손글씨 폰트보다 문장 스캔 비용이 낮다.

**User impact:** 사용자는 문단을 더 빠르게 훑고, 긴 글에서도 피로를 덜 느낀다. 특히 모바일, 저시력, 집중도가 떨어진 상황에서 차이가 커진다.

### 2. FOIT

**Issue:** `font-display: block` 또는 기본 브라우저 정책은 webfont가 준비될 때까지 텍스트를 숨길 수 있다. 이 경우 사용자는 빈 화면을 보거나 콘텐츠가 늦게 나타난다고 느낀다.

**Response:** Pretendard는 `next/font/local`로 self-host하고
`display: 'swap'`을 사용한다. fallback stack은 `system-ui`,
`Apple SD Gothic Neo`, `Malgun Gothic`, `sans-serif` 순서로 둔다.

**Why:** 본문은 가장 먼저 읽혀야 하는 콘텐츠다. 텍스트가 보이지 않는 상태는 허용하지 않는다.

**User impact:** 느린 네트워크에서도 본문이 즉시 읽힌다.

### 3. FOUT And Visual Jank

**Issue:** `font-display: swap`은 fallback text를 먼저 보여주고 나중에 webfont로 바꾼다. fallback과 webfont metrics가 다르면 줄바꿈, 높이, 문단 위치가 흔들릴 수 있다.

**Response:** Pretendard는 전역 sans contract 하나로만 로드한다.
Article/Craft 전용 추가 webfont를 만들지 않고, article body에는 stable
line-height를 둔다. `next/font/local`의 fallback metric adjustment를
사용해 fallback과 webfont 사이의 metric 차이를 줄인다.

**Why:** page-specific custom font를 추가하면 route마다 swap event가
늘어난다. 전역 sans 하나로 통일하면 font swap이 중복되지 않고 typography
contract도 단순해진다.

**User impact:** 읽던 위치가 덜 흔들리고, 스크롤 중 문단 위치가 바뀌는 느낌이 줄어든다.

### 4. CLS From Font Metrics

**Issue:** 폰트마다 ascent, descent, line gap, x-height가 다르다. fallback과 webfont의 metrics가 다르면 layout shift가 생길 수 있다.

**Response:** Pretendard를 root font contract로 승격하고, Article/Craft
body는 `line-height: 1.9`로 여유를 확보한다. `font-synthesis-weight:
none`으로 없는 weight를 browser가 임의 합성하지 않게 한다.

**Why:** Pretendard는 장식용 실험 폰트가 아니라 제품 typography의 기본
sans다. 따라서 root에서 한 번 관리하고, 상세 본문은 그 contract를 그대로
상속하는 편이 metrics drift를 줄인다.

**User impact:** Core Web Vitals 리스크가 줄고, 사용자가 읽던 위치를 잃을 가능성이 낮아진다.

### 5. Large CJK Font Payloads

**Issue:** 한글 폰트는 glyph coverage가 커서 Latin-only font보다 payload가 커지기 쉽다. weight를 늘리면 비용은 더 커진다.

**Response:** weight별 static file을 여러 개 로드하지 않고 단일
Pretendard variable WOFF2만 self-host한다. 파일 크기는 약 2MB이므로
`preload: false`로 critical path를 과하게 점유하지 않게 한다.

**Why:** Article/Craft 상세 페이지는 본문이 길고 이미지, MDX component,
code block도 함께 렌더링된다. 큰 CJK font를 preload하면 LCP 후보 이미지,
CSS, JS와 네트워크 우선순위가 충돌할 수 있다. Variable 한 파일로 weight
coverage를 확보하되, browser가 CSS discovery 이후 필요할 때 받게 한다.

**User impact:** 저속 네트워크, 모바일 데이터, 저사양 기기에서 초기 표시가 더 안정적이다.

### 6. Critical Path Preload Abuse

**Issue:** 큰 폰트를 preload하면 브라우저가 CSS, JS, image보다 font를 과하게 우선시할 수 있다. 반대로 필요한 font를 너무 늦게 발견하면 swap이 늦어진다.

**Response:** Pretendard local font는 root layout에서만 선언하고
`preload: false`를 사용한다. Page component나 MDX component에서 font
loader를 반복 호출하지 않는다.

**Why:** page-specific decorative font를 preload하면 critical path 비용이
증가한다. Pretendard는 product typography이지만 CJK payload가 크기 때문에
무조건 preload하기보다 fallback text를 즉시 보여주는 쪽을 택한다.

**User impact:** 초기 렌더링 경합이 줄어들고, 본문이 빠르게 표시된다.

### 7. Third-Party Runtime Requests And Privacy

**Issue:** Google Fonts를 browser runtime에서 직접 호출하면 추가 DNS/TLS 연결, privacy leakage, regional latency, CSP 관리 비용이 생긴다.

**Response:** `next/font/local`과 `next/font/google` self-hosting만 사용한다.
E2E에서는 font request가 현재 origin에서만 발생하는지 확인한다.

**Why:** font는 매 페이지에서 반복 요청될 수 있는 인프라 자원이다. 런타임 third-party dependency를 줄이면 privacy와 reliability가 모두 좋아진다.

**User impact:** 외부 provider 상태나 지역 네트워크 이슈에 덜 흔들리고, 방문 정보가 font CDN으로 직접 전달되지 않는다.

### 8. Glyph Coverage And Fallback Mismatch

**Issue:** font가 일부 문자만 지원하면 emoji, 한자, 특수 기호, 영어 token에서 fallback이 섞인다. 섞인 font는 크기와 baseline이 달라 보일 수 있다.

**Response:** 본문은 Pretendard 기반 sans stack을 사용한다. emoji, 일부 한자,
특수 기호는 browser/platform fallback에 맡기고, code와 UI control은 별도
font family로 격리한다.

**Why:** 기술 글은 한글, 영어, 숫자, code token, emoji, 링크가 섞인다.
Pretendard가 한영 본문 대부분을 담당하고, emoji/symbol은 platform
fallback이 담당하게 분리하면 mixed-script 문장이 더 안정적이다.

**User impact:** mixed-script 문장이 더 자연스럽고, 일부 문자만 갑자기 다른 크기로 보이는 문제가 줄어든다.

### 9. Synthetic Bold Or Italic

**Issue:** browser가 없는 weight/style을 fake bold 또는 fake italic으로 합성하면 획이 뭉개지고 metrics가 달라질 수 있다.

**Response:** Article body safeguard에 `font-synthesis-weight: none`을 둔다.
Pretendard Variable은 `100 900` weight range를 선언해 browser가 굵기를
합성하지 않고 variable axis로 해결하게 한다.

**Why:** 기술 글에서는 강조, 링크, inline code, heading이 자주 등장한다. 합성 굵기는 작은 가독성 저하를 누적시킨다.

**User impact:** bold emphasis가 과하게 번지거나 문장 폭이 흔들리는 위험이 줄어든다.

### 10. Code, Tables, And Interactive Controls

**Issue:** 본문 font를 article 전체에 적용하면 code, table, button, select 같은 UI에도 같은 font가 흘러 들어갈 수 있다. code는 mono가 아니면 읽기 어렵고, control은 platform expectation과 달라진다.

**Response:** `code`, `pre`, `kbd`, `samp`는 `--font-mono`를 강제한다. `table`, form controls, interactive role elements는 `--font-sans`로 유지한다.

**Why:** prose와 UI/control은 읽는 방식이 다르다. prose는 흐름을 읽고, code/table/control은 정확히 비교하고 조작한다.

**User impact:** code copy, table scan, button/select 조작이 기존처럼 예측 가능하다.

### 11. Visual MDX Components

**Issue:** `.not-prose` MDX component를 통째로 reset하면 caption이나 DeepDive body처럼 본문 성격의 텍스트까지 article typography에서 빠질 수 있다.

**Response:** `.not-prose` 전체 reset은 사용하지 않는다. 대신 실제 위험이 있는 code/table/control selector만 좁게 reset한다.

**Why:** MDX component 내부에도 본문 텍스트와 UI control이 섞일 수 있다. class 하나로 전부 제외하면 의도한 typography contract가 깨진다.

**User impact:** caption과 DeepDive 설명은 본문과 같은 리듬으로 읽히고, 실제 control만 UI 폰트를 유지한다.

### 12. Accessibility Preferences

**Issue:** 일부 사용자는 browser zoom, OS text rendering, 고대비 모드, dyslexia-friendly 환경, 저시력 보조 설정에 의존한다. 장식적 폰트는 이런 환경에서 더 취약할 수 있다.

**Response:** 손글씨 본문 custom font는 제거하고, Pretendard plus
system-friendly fallback stack을 유지한다. E2E 접근성 테스트를 계속
실행한다.

**Why:** 글꼴은 사용자가 직접 바꾸기 어렵다. 사이트가 기본값에서 충분히 읽히는 쪽이 더 안전하다.

**User impact:** 다양한 디스플레이, 확대 비율, 접근성 설정에서도 본문 품질이 안정적이다.

## Current Implementation

Current code lives in `src/components/layout/mdx.tsx` and `src/components/layout/mdx-layout.module.css`.

- `RootLayout` loads Pretendard from `src/app/fonts/PretendardVariable.woff2`
  with `next/font/local`.
- `RootLayout` sets `preload: false`, `display: 'swap'`, `weight: '100 900'`,
  and the `--font-sans` CSS variable.
- `MdxLayout` does not import a page-specific content font from
  `next/font/google`.
- `article[data-content-font="pretendard"]` marks the current contract.
- `contentArticle` uses `var(--font-sans), system-ui, sans-serif`.
- `contentArticle` keeps Korean text readable with `word-break: keep-all`, `overflow-wrap: break-word`, and `line-height: 1.9`.
- `code/pre/kbd/samp` use `var(--font-mono)`.
- `table`, native controls, and interactive role elements use `var(--font-sans)`.

## Regression Tests

`tests/mdx-rendering.spec.ts` protects the contract:

- Article detail body uses Pretendard and does not contain Gaegu.
- Craft detail body uses the same Pretendard contract.
- Font requests stay on the same origin.
- Pretendard `@font-face` exists and no Gaegu `@font-face` rule is present in runtime stylesheets.
- Code does not inherit the prose font.
- Visual MDX text such as captions and DeepDive body text inherits the article content font.
- Article body line-height remains at least 1.7x font size.

## Decision Rule For Future Font Changes

Do not add or replace an Article/Craft content font unless all of the following
are true:

- The font improves long-form Korean readability, not just mood.
- A representative long article is reviewed on desktop and mobile.
- Code, table, control, and visual MDX text behavior is verified.
- Runtime third-party font requests remain absent.
- Payload, preload, `font-display`, fallback metrics, license, and low-end device behavior are documented.
- The E2E typography contract is updated before merging.

If a font mainly creates aesthetic value, prefer using it in bounded decorative surfaces instead of long-form body text.
