# 아키텍처

> 이 문서는 에이전트가 코드만 읽어서는 파악할 수 없는 구조적 결정과 제약을 기록한다.

## 콘텐츠 시스템

### content/ vs craft/ 분리

두 디렉토리는 **서로 다른 프로세서와 라우트**를 사용한다:

| 항목      | content/                              | craft/                                       |
| --------- | ------------------------------------- | -------------------------------------------- |
| 용도      | 블로그 글                             | 실험적/크리에이티브 콘텐츠                   |
| 프로세서  | `createMDXProcessor()`                | `createCraftMDXProcessor()`                  |
| 라우트    | `/article/[slug]`                     | `/craft/[slug]`                              |
| 표시 형식 | `formatForDisplay()` (상대 시간 포함) | `formatForCraftDisplay()` (상대 시간 미포함) |

프론트매터 스키마는 동일하지만 (`MetadataSchema`), 포맷 메서드가 생성하는 href 경로가 다르다 (`/article/` vs `/craft/`).

### MDXProcessor 지연 평가

`MDXProcessor`는 불변 체이닝 패턴을 사용한다:

- 각 메서드(`sortByDateDesc`, `limit`, `filterByCategory`)는 **새 인스턴스**를 반환
- 연산은 내부 `operations` 배열에 누적되며, **즉시 실행되지 않는다**
- `getArticles()`, `formatForDisplay()`, `map()` 호출 시에만 실행

```typescript
// 올바른 사용
createMDXProcessor()
  .sortByDateDesc()
  .limit(5)
  .formatForDisplay({ includeRelativeDate: true });

// 주의: 이 시점에서는 아직 실행되지 않음
const processor = createMDXProcessor().sortByDateDesc();
// 여기서 실행됨
const articles = processor.getArticles();
```

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
