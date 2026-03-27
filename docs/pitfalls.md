# 에이전트 함정 (Pitfalls)

> 이 문서는 AI 에이전트가 코드에서 자동으로 발견할 수 없어 반복적으로 실수하는 패턴을 모았다.
> 각 항목은 "왜 실수하는가 / 올바른 방법 / 잘못된 방법"으로 구성된다.

## P1: createMDXComponent 래퍼 생략

MDX 컴포넌트를 일반 React 컴포넌트처럼 직접 export하면 prop 검증이 누락된다.

```tsx
// 올바름
export const MDXCallout = createMDXComponent(Callout, CalloutSchema);
// 잘못됨
export const MDXCallout = Callout;
```

## P2: 프론트매터 글자 수 초과

`MetadataSchema`에 엄격한 제한이 있다. 초과하면 빌드 실패.

- title: 최대 38자 / summary: 최대 40자 / description: 최대 150자

## P3: content/ vs craft/ 혼동

블로그 글은 `content/`, 실험적 콘텐츠는 `craft/`에 배치한다. 각각 다른 프로세서와 라우트를 사용하므로 잘못된 디렉토리에 파일을 넣으면 라우트가 깨진다.

## P4: npm/yarn 사용

이 프로젝트는 pnpm만 사용한다. `npm install`이나 `yarn add`를 실행하면 lockfile 충돌이 발생한다.

```bash
# 올바름
pnpm install / pnpm add <package>
# 잘못됨
npm install / yarn add <package>
```

## P5: 상대 경로 import

`@/` alias를 항상 사용한다. tsconfig.json의 paths에 `@/*` -> `./src/*`가 설정되어 있다.

```typescript
// 올바름
import { cn } from '@/lib/utils';
// 잘못됨
import { cn } from '../../../lib/utils';
```

## P6: 도메인 컴포넌트 하위 디렉토리 직접 import

barrel export(index.ts)만 사용해야 한다. 내부 구조에 의존하면 리팩토링 시 깨진다.

```typescript
// 올바름
import { SoundSwitcher } from '@/components/sound';
// 잘못됨
import { SoundSwitcher } from '@/components/sound/ui/sound-switcher';
```

## P7: Zustand 스토어 생성 시 persist 누락

기존 스토어는 `persist` 미들웨어로 localStorage에 상태를 유지한다. 새 스토어에서 이 패턴을 빠뜨리면 새로고침 시 상태가 초기화된다.

## P8: 테마 변경 시 giscus 동기화 누락

`useThemeManager` 훅이 `postMessage`로 giscus iframe에 테마를 동기화한다. 테마 로직을 직접 수정하면 giscus 댓글이 이전 테마에 머무르는 문제가 발생한다.

## P9: MDX 보안 설정 변경

`custom-mdx.tsx`의 `blockJS: false`는 MagicMove 등 커스텀 컴포넌트에 필요한 설정이다. `blockDangerousJS: true`는 보안을 위해 유지해야 한다. CVE-2026-0969 참조.

## P10: 동적 import 없이 client 컴포넌트 사용

루트 레이아웃은 Server Component다. client-only 컴포넌트(`useEffect`, `useState` 사용)는 `dynamic(() => import(...), { ssr: false })`로 가져와야 한다. 그렇지 않으면 hydration 불일치 에러가 발생한다.

## P11: OG 이미지를 정적 파일로 가정

OG 이미지는 `/api/og` 엔드포인트에서 Edge Runtime으로 동적 생성된다. 정적 이미지 파일로 교체하려 하지 않는다.

## P12: HSL 대신 hex/RGB 색상 사용

CSS 변수가 HSL 형식(`hue saturation% lightness%`)으로 정의되어 있다. Tailwind의 색상 시스템과 다크모드 전환이 이 형식에 의존한다.

```css
/* 올바름 - globals.css의 CSS 변수 사용 */
--background: 0 0% 100%;
/* 잘못됨 - hex/RGB 직접 사용 */
--background: #ffffff;
```

## P13: 테스트 러너 혼동

- **Vitest**: 유닛 테스트 (`src/**/*.spec.{ts,tsx}`, jsdom 환경)
- **Playwright**: E2E 테스트 (`tests/` 디렉토리, 프로덕션 서버 필요)

Vitest 테스트에서 E2E 패턴(page.goto 등)을 쓰거나, Playwright 테스트를 src/ 안에 두지 않는다.

## P14: CSP 헤더 허용 목록 미갱신

새 외부 서비스(스크립트, iframe, 폰트)를 추가하면 `next.config.mjs`의 CSP 허용 목록도 업데이트해야 한다. 그렇지 않으면 브라우저가 해당 리소스를 차단한다.

## P15: 커밋 메시지 영어 작성

이 프로젝트는 Conventional Commits + 한국어 메시지를 사용한다. 영어 커밋 메시지는 일관성을 깨뜨린다.

```bash
# 올바름
feat(article): 블로그 글 검색 기능 추가
# 잘못됨
feat(article): add blog search feature
```

## P16: lint-staged 범위 오해

pre-commit hook에서 lint-staged는 **타입 체크**(`pnpm check-types`)와 **MDX/MD 포맷팅**(`prettier --write`)만 실행한다. ESLint 자동 수정은 포함되지 않으므로 필요시 `pnpm lint:fix`를 수동 실행한다.

## P17: (제거됨) MDXProcessor 즉시 실행 기대

MDXProcessor 클래스가 순수 함수 API로 대체되어 이 함정은 더 이상 해당하지 않는다. 모든 함수가 즉시 실행되며 숨겨진 상태가 없다.

## P18: use-sound import 경로 수정

`tsconfig.json`에 `"use-sound": ["./node_modules/use-sound/"]` path alias가 설정되어 있다. 이 alias를 제거하거나 수정하면 빌드가 깨진다.

## P19: 비활성 라우트 활성화

`/photo` 라우트는 코드에 존재하지만 네비게이션에서 의도적으로 숨겨져 있다. 이 라우트를 노출시키려면 네비게이션 아이템 설정을 먼저 확인한다.

## P20: 스크롤 리스너 passive 옵션 누락

`window.addEventListener('scroll', handler)`에 `{ passive: true }` 옵션을 설정하지 않으면 브라우저가 JS 실행을 기다린 후 스크롤하여 INP가 악화된다. TOC 스크롤 핸들러에서 이 문제가 발생했다. 새 스크롤/터치 리스너 추가 시 반드시 `{ passive: true }`를 포함한다.

```typescript
// 올바름
window.addEventListener('scroll', handler, { passive: true });
// 잘못됨
window.addEventListener('scroll', handler);
```

## P21: Analytics track() 동기 호출

`@vercel/analytics`의 `track()` 함수를 이벤트 핸들러나 useEffect에서 직접 호출하면 메인 스레드를 차단한다. `requestIdleCallback`으로 감싸서 유휴 시간에 실행한다.

```typescript
// 올바름
const rIC =
  globalThis.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 0));
rIC(() => {
  track('event_name', { data });
});
// 잘못됨
track('event_name', { data });
```

## P22: querySelectorAll 결과를 스크롤 핸들러에서 캐싱

`querySelectorAll`은 **static NodeList**를 반환한다. React가 리렌더링하여 DOM 노드를 추가/교체하면 캐시된 NodeList는 stale 참조를 유지하고 새 노드를 포함하지 않는다. 특히 `ssr: false` 동적 임포트 컴포넌트에서 초기 마운트 시 빈 NodeList가 캐시되면, 이후 React가 렌더링한 새 요소에 대해 `classList.remove`가 동작하지 않아 클래스가 누적된다.

```typescript
// 올바름 — prevActiveHash dedup이 있으므로 해시 변경 시에만 실행됨
function activateLink(hash: string | null) {
  if (hash === prevActiveHash) return;
  const links = container.querySelectorAll<HTMLAnchorElement>('a');
  links.forEach(link => link.classList.remove('active'));
  // ...
}

// 잘못됨 — static NodeList를 캐시하면 React 리렌더링 후 stale 참조
let cachedLinks: NodeListOf<HTMLAnchorElement> | null = null;
function getLinks() {
  if (!cachedLinks) cachedLinks = container.querySelectorAll('a');
  return cachedLinks;
}
```

## P23: Vercel INTERNAL_UNEXPECTED_ERROR 디버깅

Vercel 배포가 `INTERNAL_UNEXPECTED_ERROR`와 함께 500을 반환하면 코드 버그가 아닌 **Vercel 인프라 일시적 장애**일 수 있다. 다음 순서로 진단한다:

1. **로컬 빌드+서빙 확인**: `pnpm build && pnpm start`로 로컬에서 동일 페이지 접근. 200이면 코드 문제 아님
2. **변경 파일 분석**: 클라이언트 전용 변경인데 서버 500이면 인프라 가능성 높음
3. **함수 로그 확인**: `vercel logs <url>` — 로그가 비어있으면 함수 실행 전 크래시
4. **이전 커밋 배포**: `git checkout <prev-sha> && vercel --prod --yes` — 이전 커밋도 500이면 코드 무관
5. **재배포 대기**: Vercel 인프라 문제는 수 분~수십 분 내 자동 복구되는 경우가 많음

```bash
# 진단 명령어
curl -sI https://bendd.me/article/some-slug | grep x-vercel-error
# INTERNAL_UNEXPECTED_ERROR → 인프라 문제 가능성

# 로컬 검증
pnpm build && pnpm start
# localhost:3000에서 200이면 코드 문제 아님

# 재배포
vercel --prod --yes
```

**주의**: `x-vercel-error: INTERNAL_UNEXPECTED_ERROR`는 Next.js 애플리케이션 에러가 아니라 Vercel 플랫폼 수준 에러다. 코드 변경으로 해결하려 하지 않는다.
