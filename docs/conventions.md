# 코드 컨벤션

> 에이전트가 코드를 생성하거나 수정할 때 반드시 지켜야 하는 규칙이다.

## Tailwind CSS

### 표준 Tailwind 유틸리티

Tailwind 유틸리티 클래스를 prefix 없이 그대로 사용한다:

```tsx
<div className="flex items-center gap-2 text-foreground">
```

반응형, 상태, 다크모드 변형:

```tsx
'hover:bg-primary/90 dark:text-foreground md:grid-cols-2';
```

### CSS 변수와 HSL

색상은 HSL 형식의 CSS 변수를 사용한다. hex/RGB 직접 사용을 피한다:

```css
/* globals.css에서 정의 */
:root {
  --background: 0 0% 100%;
}
.dark {
  --background: 0 0% 3.9%;
}
```

```tsx
// Tailwind에서 사용
'bg-background'; // hsl(var(--background)) 으로 매핑

// 커스텀 색상이 필요하면 globals.css에 CSS 변수를 추가한다
```

### shadcn/ui 컴포넌트

`pnpm dlx shadcn@latest add` 로 설치하면 프로젝트 설정에 맞게 컴포넌트가 생성된다.

## Import 규칙

### @/ alias 필수

모든 import에 `@/` alias를 사용한다. 상대 경로(`../`)는 금지:

```typescript
// 올바름
import { cn } from '@/lib/utils';
import { Navigation } from '@/components/navigation';

// 잘못됨
import { cn } from '../../lib/utils';
```

### 도메인 컴포넌트: barrel export만 import

도메인 컴포넌트의 하위 디렉토리를 직접 import하지 않는다:

```typescript
// 올바름 - index.ts barrel export 사용
import { SoundSwitcher, useSoundStore } from '@/components/sound';
import { ThemeSwitcher } from '@/components/theme';

// 잘못됨 - 하위 디렉토리 직접 import
import { SoundSwitcher } from '@/components/sound/ui/sound-switcher';
import { useSoundStore } from '@/components/sound/model/sound-store';
```

### use-sound 패키지 alias

`tsconfig.json`에 `"use-sound": ["./node_modules/use-sound/"]` alias가 설정되어 있다. 이 패키지를 import할 때 경로를 수정하지 않는다.

## 도메인 컴포넌트 구조

새 도메인 컴포넌트를 생성할 때 이 구조를 따른다:

```
src/components/{domain}/
├── index.ts              # 외부 공개 API (barrel export)
├── ui/                   # UI 컴포넌트 (.tsx)
├── model/                # 훅 (use-*.ts), 스토어 (*-store.ts)
├── types/                # 타입 정의 (.d.ts)
├── consts/               # 상수
└── lib/                  # 유틸리티 함수
```

`index.ts`에는 외부에서 사용할 컴포넌트, 훅, 스토어만 export한다. 내부 유틸리티, 상수, 타입은 export하지 않는다.

## MDX 컴포넌트 패턴

### createMDXComponent + Zod 필수

모든 MDX 컴포넌트는 `createMDXComponent` 래퍼와 Zod 스키마를 사용해야 한다:

```typescript
import { z } from 'zod';
import { createMDXComponent } from '../../common/create-mdx-component';

const MySchema = z.object({
  title: z.string(),
  variant: z.enum(['a', 'b']).optional().default('a'),
});

function MyComponent({ title, variant }: z.infer<typeof MySchema>) {
  return <div className="...">{title}</div>;
}

export const MDXMyComponent = createMDXComponent(MyComponent, MySchema);
```

### MDX 컴포넌트 디렉토리

```
src/mdx/components/{name}/
├── {name}.tsx              # 메인 컴포넌트
├── {name}.module.css       # (선택) CSS 모듈
└── use-{hook}.ts           # (선택) 커스텀 훅
```

새 컴포넌트를 추가한 후 `src/mdx/custom-mdx.tsx`의 `components` 객체에도 등록해야 한다.

### 이미지 줌

MDX의 모든 `![alt](src)` 이미지는 `MDXZoomImage`로 렌더링된다. 클릭하면 Medium 스타일로 확대되고, 스크롤하면 자동으로 닫힌다. `react-medium-image-zoom` 라이브러리를 사용하며, SVG data URI는 줌 없이 일반 `img`로 렌더링된다.

## 프론트매터

`src/mdx/mdx.ts`의 `MetadataSchema`가 검증하는 필수 필드와 제한:

```yaml
---
title: '최대 38자까지'
summary: '최대 40자까지'
description: '최대 150자까지의 설명'
category: 'react'
publishedAt: '2024-04-30'
image: '/optional-image.png' # 선택
---
```

초과하면 빌드 시 Zod 검증 에러가 발생한다.

## 커밋 & 브랜치

### Conventional Commits + 한국어

```
<type>(<scope>): <한국어 설명>

feat(article): 블로그 글 검색 기능 추가
fix(sound): 사운드 토글 상태 유지 안 되는 문제 수정
refactor(mdx): MDXProcessor 체이닝 API 개선
chore(ci): GitHub Actions 워크플로우 추가
docs(architecture): 아키텍처 문서 업데이트
```

### 브랜치 네이밍

| Prefix      | 용도      |
| ----------- | --------- |
| `feat/`     | 새 기능   |
| `fix/`      | 버그 수정 |
| `refactor/` | 리팩토링  |
| `chore/`    | 설정/CI   |
| `docs/`     | 문서      |

## 폰트

Inter (sans)와 Fira Mono (mono)를 Google Fonts에서 로드한다. CSS 변수로 적용:

- `--font-sans` -> Inter
- `--font-mono` -> Fira Mono

`display: 'swap'` 설정으로 FOUT를 방지한다. 필요한 weight만 로드한다 (전체 로드 금지).

Article/Craft 상세 본문은 `MdxLayout`에서만 `Gaegu`를 추가로 로드한다:

- `--font-content-handwriting` -> Gaegu
- 적용 범위: `/article/[slug]`, `/craft/[slug]`의 제목, TL;DR, MDX 본문
- 제외 범위: navigation, TOC, Giscus, code/pre/kbd/samp, table, button/input/select/textarea와 interactive role 요소
- 로딩 정책: `display: 'swap'`, `preload: false`, weight `400`/`700`만 사용

손글씨 폰트는 장식적 향상 요소이므로 fallback text를 먼저 보여주되, self-host font가 준비되면 같은 origin에서 swap한다. 큰 한글 폰트가 critical path를 과하게 점유하지 않도록 preload는 사용하지 않는다. 런타임에 `fonts.googleapis.com` 또는 `fonts.gstatic.com`을 직접 호출하지 말고 `next/font`의 self-hosting을 유지한다.

## WebMCP

WebMCP code lives under `src/components/webmcp/` and follows the domain
component barrel export rule. Import it as `@/components/webmcp`.

Rules:

- Always feature-detect `navigator.modelContext` before building tool
  descriptors, scanning DOM, fetching content, or registering tools.
- Register tools during idle time through `registerWebMCPTools`.
- Use `AbortController` cleanup for every registration lifecycle.
- Keep tool outputs small. Article and craft tools may return metadata,
  TL;DR, headings, and short excerpts, but not full MDX bodies.
- Keep external navigation manual. WebMCP tools may return external URLs but
  must not automatically open them.
- Add declarative attributes only to real forms with visible user-facing
  controls.
- Use HSL CSS variables for `:tool-form-active` and `:tool-submit-active`
  styles.
