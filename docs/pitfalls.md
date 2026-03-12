# 에이전트 함정 (Pitfalls)

> 이 문서는 AI 에이전트가 코드에서 자동으로 발견할 수 없어 반복적으로 실수하는 패턴을 모았다.
> 각 항목은 "왜 실수하는가 / 올바른 방법 / 잘못된 방법"으로 구성된다.

## P1: Tailwind bd- prefix 누락

일반적인 Tailwind 프로젝트와 달리 모든 유틸리티 클래스에 `bd-` prefix가 필요하다.

```tsx
// 올바름
<div className="bd-flex bd-gap-2">
// 잘못됨
<div className="flex gap-2">
```

## P2: createMDXComponent 래퍼 생략

MDX 컴포넌트를 일반 React 컴포넌트처럼 직접 export하면 prop 검증이 누락된다.

```tsx
// 올바름
export const MDXCallout = createMDXComponent(Callout, CalloutSchema);
// 잘못됨
export const MDXCallout = Callout;
```

## P3: 프론트매터 글자 수 초과

`MetadataSchema`에 엄격한 제한이 있다. 초과하면 빌드 실패.

- title: 최대 38자 / summary: 최대 40자 / description: 최대 150자

## P4: content/ vs craft/ 혼동

블로그 글은 `content/`, 실험적 콘텐츠는 `craft/`에 배치한다. 각각 다른 프로세서와 라우트를 사용하므로 잘못된 디렉토리에 파일을 넣으면 라우트가 깨진다.

## P5: npm/yarn 사용

이 프로젝트는 pnpm만 사용한다. `npm install`이나 `yarn add`를 실행하면 lockfile 충돌이 발생한다.

```bash
# 올바름
pnpm install / pnpm add <package>
# 잘못됨
npm install / yarn add <package>
```

## P6: 상대 경로 import

`@/` alias를 항상 사용한다. tsconfig.json의 paths에 `@/*` -> `./src/*`가 설정되어 있다.

```typescript
// 올바름
import { cn } from '@/lib/utils';
// 잘못됨
import { cn } from '../../../lib/utils';
```

## P7: 도메인 컴포넌트 하위 디렉토리 직접 import

barrel export(index.ts)만 사용해야 한다. 내부 구조에 의존하면 리팩토링 시 깨진다.

```typescript
// 올바름
import { SoundSwitcher } from '@/components/sound';
// 잘못됨
import { SoundSwitcher } from '@/components/sound/ui/sound-switcher';
```

## P8: Zustand 스토어 생성 시 persist 누락

기존 스토어는 `persist` 미들웨어로 localStorage에 상태를 유지한다. 새 스토어에서 이 패턴을 빠뜨리면 새로고침 시 상태가 초기화된다. storage key에는 `bd-` prefix를 사용한다.

## P9: 테마 변경 시 giscus 동기화 누락

`useThemeManager` 훅이 `postMessage`로 giscus iframe에 테마를 동기화한다. 테마 로직을 직접 수정하면 giscus 댓글이 이전 테마에 머무르는 문제가 발생한다.

## P10: MDX 보안 설정 변경

`custom-mdx.tsx`의 `blockJS: false`는 MagicMove 등 커스텀 컴포넌트에 필요한 설정이다. `blockDangerousJS: true`는 보안을 위해 유지해야 한다. CVE-2026-0969 참조.

## P11: 동적 import 없이 client 컴포넌트 사용

루트 레이아웃은 Server Component다. client-only 컴포넌트(`useEffect`, `useState` 사용)는 `dynamic(() => import(...), { ssr: false })`로 가져와야 한다. 그렇지 않으면 hydration 불일치 에러가 발생한다.

## P12: OG 이미지를 정적 파일로 가정

OG 이미지는 `/api/og` 엔드포인트에서 Edge Runtime으로 동적 생성된다. 정적 이미지 파일로 교체하려 하지 않는다.

## P13: HSL 대신 hex/RGB 색상 사용

CSS 변수가 HSL 형식(`hue saturation% lightness%`)으로 정의되어 있다. Tailwind의 색상 시스템과 다크모드 전환이 이 형식에 의존한다.

```css
/* 올바름 - globals.css의 CSS 변수 사용 */
--background: 0 0% 100%;
/* 잘못됨 - hex/RGB 직접 사용 */
--background: #ffffff;
```

## P14: 테스트 러너 혼동

- **Vitest**: 유닛 테스트 (`src/**/*.spec.{ts,tsx}`, jsdom 환경)
- **Playwright**: E2E 테스트 (`tests/` 디렉토리, 프로덕션 서버 필요)

Vitest 테스트에서 E2E 패턴(page.goto 등)을 쓰거나, Playwright 테스트를 src/ 안에 두지 않는다.

## P15: CSP 헤더 허용 목록 미갱신

새 외부 서비스(스크립트, iframe, 폰트)를 추가하면 `next.config.mjs`의 CSP 허용 목록도 업데이트해야 한다. 그렇지 않으면 브라우저가 해당 리소스를 차단한다.

## P16: 커밋 메시지 영어 작성

이 프로젝트는 Conventional Commits + 한국어 메시지를 사용한다. 영어 커밋 메시지는 일관성을 깨뜨린다.

```bash
# 올바름
feat(article): 블로그 글 검색 기능 추가
# 잘못됨
feat(article): add blog search feature
```

## P17: lint-staged 범위 오해

pre-commit hook에서 lint-staged는 **타입 체크**(`pnpm check-types`)와 **MDX/MD 포맷팅**(`prettier --write`)만 실행한다. ESLint 자동 수정은 포함되지 않으므로 필요시 `pnpm lint:fix`를 수동 실행한다.

## P18: MDXProcessor 즉시 실행 기대

체이닝 메서드(`sortByDateDesc`, `limit`)는 연산을 큐에 넣을 뿐 실행하지 않는다. 데이터를 얻으려면 `getArticles()`, `formatForDisplay()`, `map()` 등 터미널 메서드를 호출해야 한다.

## P19: use-sound import 경로 수정

`tsconfig.json`에 `"use-sound": ["./node_modules/use-sound/"]` path alias가 설정되어 있다. 이 alias를 제거하거나 수정하면 빌드가 깨진다.

## P20: 비활성 라우트 활성화

`/photo` 라우트는 코드에 존재하지만 네비게이션에서 의도적으로 숨겨져 있다. 이 라우트를 노출시키려면 네비게이션 아이템 설정을 먼저 확인한다.
