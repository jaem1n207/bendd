# 아키텍처

> 이 문서는 에이전트가 코드만 읽어서는 파악할 수 없는 구조적 결정과 제약을 기록한다.

## 콘텐츠 시스템

### content/ vs craft/ 분리

두 디렉토리는 **서로 다른 읽기 함수와 라우트**를 사용한다:

| 항목      | content/                                        | craft/                                   |
| --------- | ----------------------------------------------- | ---------------------------------------- |
| 용도      | 블로그 글                                       | 실험적/크리에이티브 콘텐츠               |
| 읽기 함수 | `readArticles()`                                | `readCraftArticles()`                    |
| 라우트    | `/article/[slug]`                               | `/craft/[slug]`                          |
| 표시 형식 | `formatArticlesForDisplay()` (시리즈 정보 포함) | `formatCraftsForDisplay()` (시리즈 없음) |

프론트매터 스키마는 동일하지만 (`MetadataSchema`), 포맷 함수가 생성하는 href
경로가 다르다 (`/article/` vs `/craft/`).

### MDX 순수 함수 API

콘텐츠 API는 숨겨진 상태나 지연 실행이 없는 순수 함수 조합을 사용한다:

- `readArticles()`와 `readCraftArticles()`가 각 디렉토리의 콘텐츠를 읽는다.
- `sortByDateDesc()`, `findBySlug()` 등은 입력 배열을 명시적으로 받는다.
- `formatArticlesForDisplay()`는 전체 글 컬렉션을 함께 받아 시리즈 정보를 계산한다.
- `formatCraftsForDisplay()`는 craft 전용 route와 표시 모델을 만든다.

```typescript
const articles = readArticles();
const sorted = sortByDateDesc(articles);
const post = findBySlug(articles, slug);
const displayItems = formatArticlesForDisplay(sorted, articles);
```

각 함수의 데이터 출처와 실행 시점이 호출부에 드러나므로 클래스 인스턴스의
operations queue나 lazy evaluation을 가정하지 않는다.

### MDX 보안 설정

`src/mdx/custom-mdx.tsx`에서 CVE-2026-0969 관련 설정:

```
blockJS: false           // MagicMove 등 커스텀 컴포넌트에 JS 표현식 전달 필요
blockDangerousJS: true   // eval, Function, process, require 접근 차단
```

모든 MDX 콘텐츠는 로컬 파일에서만 로드되므로 `blockJS: false`가 안전하다. 이 설정을 변경하지 않는다.

## 컴포넌트 레이어 의존성

### Import 규칙

도메인 컴포넌트 간 의존은 반드시 **barrel export**(index.ts)를 통해야 한다:

```
src/components/{domain}/index.ts  <- 이것만 외부에서 import
src/components/{domain}/ui/       <- 직접 import 금지
src/components/{domain}/model/    <- 직접 import 금지
```

### MDX 컴포넌트 등록

`src/mdx/custom-mdx.tsx`의 `components` 객체에서 MDX 태그를 React 컴포넌트에 매핑한다. 새 MDX 컴포넌트를 추가하면 이 매핑도 업데이트해야 한다.

## 상태 관리

### Zustand 패턴

- `persist` 미들웨어 사용 (localStorage)
- storage key: 예) `sound-enabled`
- 새 스토어 생성 시 동일 패턴을 따른다

### next-themes + giscus 동기화

테마 변경 시 `useThemeManager` 훅이 giscus iframe에 `postMessage`로 테마를 동기화한다. 테마 전환 로직을 수정할 때 이 동기화가 유지되는지 확인해야 한다.

## 라우팅

- **App Router** 기반, `typedRoutes: true` 활성화
- 메인 네비게이션: `/` (홈), `/article` (블로그), `/craft` (크리에이티브)
- `/photo` 라우트는 코드에 존재하지만 네비게이션에서 숨겨져 있다 (비활성)
- 동적 라우트: `/article/[slug]`, `/craft/[slug]`

### OG 이미지 생성

`/api/og` 엔드포인트가 **Edge Runtime**에서 동적으로 OG 이미지를 생성한다:

- `Sec-CH-Prefers-Color-Scheme` 헤더로 클라이언트 색상 스킴 감지
- Inter 폰트를 ArrayBuffer로 로드
- CDN에서 자동 캐시

## 보안

### CSP 헤더 허용 목록

`next.config.mjs`에서 Content-Security-Policy를 설정한다:

- `script-src`: self, vercel.live, cdn.vercel-insights.com, va.vercel-scripts.com, giscus.app
- `frame-src`: self, \*.codesandbox.io, vercel.live, giscus.app
- `img-src`: \* (외부 이미지 허용)

새 외부 서비스를 추가할 때 CSP 허용 목록도 함께 업데이트해야 한다. 그렇지 않으면 브라우저가 리소스를 차단한다.

### 기타 보안 헤더

- `X-Frame-Options: DENY` (iframe 삽입 차단)
- `Strict-Transport-Security` (HTTPS 강제)
- `X-Content-Type-Options: nosniff`

## WebMCP

WebMCP is implemented as a progressive enhancement. The root layout imports a
Client Component wrapper that mounts `WebMCPProvider` with `ssr: false`, and the
provider exits immediately unless the browser exposes `navigator.modelContext`.

The provider registers route-relevant tools only during idle time and aborts
the previous registration on route changes. Content search does not build a
global index during page load. It fetches `/api/webmcp/content-index` only when
the `find_content` or `open_content` tool runs, then reuses the in-memory result
for the current browser session.

The WebMCP surface is intentionally limited to safe visible actions:

- internal navigation
- route/action introspection
- content metadata search
- current article/craft context snippets
- heading scroll
- code block copy
- current URL copy
- theme and sound settings
- shuffle letters playground execution

External links and `mailto:` links are not opened automatically by WebMCP tools.
Cross-origin iframes do not receive `allow="tools"`.
