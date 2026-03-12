# 코드 컨벤션

> 에이전트가 코드를 생성하거나 수정할 때 반드시 지켜야 하는 규칙이다.

## Tailwind CSS

### bd- prefix 필수

모든 Tailwind 유틸리티 클래스에 `bd-` prefix를 사용한다 (`tailwind.config.ts`의 `prefix: 'bd-'`).

```tsx
// 올바름
<div className="bd-flex bd-items-center bd-gap-2 bd-text-foreground">

// 잘못됨 - prefix 누락
<div className="flex items-center gap-2 text-foreground">
```

반응형, 상태, 다크모드 변형도 prefix 뒤에 온다:

```tsx
// 올바름
'hover:bd-bg-primary/90 dark:bd-text-foreground md:bd-grid-cols-2';

// 잘못됨
'bd-hover:bg-primary/90 bd-dark:text-foreground';
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
'bd-bg-background'; // hsl(var(--background)) 으로 매핑

// 커스텀 색상이 필요하면 globals.css에 CSS 변수를 추가한다
```

### shadcn/ui 컴포넌트

`components.json`에 `prefix: "bd-"` 설정이 되어 있다. `pnpm dlx shadcn-ui add` 로 설치하면 자동으로 bd- prefix가 적용된다.

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
  return <div className="bd-...">{title}</div>;
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
