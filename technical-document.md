# Technical Document

## Requirements

- Node.js 20+ and pnpm

## Getting started

로컬 환경에서 다음 명령을 실행합니다:

```shell
git clone --depth=1 https://github.com/jaem1n207/bendd.git my-project-name
cd my-project-name
pnpm install
```

## Scripts

- `pnpm dev` - 로컬에서 개발 모드로 애플리케이션을 시작합니다.
- `pnpm build` - 최적화된 프로덕션 빌드를 생성합니다. 결과물로 각 경로에 대한 정보가 표시됩니다. 번들을 분석하려면 `pnpm build-stats`를 실행합니다.
- `pnpm start` - 로컬에서 프로덕션 모드로 애플리케이션을 시작합니다. `next-build`로 먼저 컴파일되어야 합니다.
- `test:e2e` - Playwright 사용해 E2E 테스트를 실행합니다. SEO 관련 동작, 헤더 설정에 관한 동작을 위주로 테스트합니다.
- `pnpm lint` - `src/` 폴더에 있는 모든 파일에 대해 ESLint를 실행합니다. 범위는 `nextConfig.eslint.dirs`에서 설정합니다.
- `pnpm format` - `src/` 폴더에 있는 모든 파일에 대해 Prettier를 실행합니다.
- `pnpm cz` - git 커밋 메시지 작성을 도와줍니다.

### Features

- ⚛️ [Next.js](https://nextjs.org) with App Router support
- ♻️ Type checking [TypeScript](https://www.typescriptlang.org)
- 🌈 Integrate with [Tailwind CSS](https://tailwindcss.com)
- ✅ Strict Mode for TypeScript and React 18
<!-- - 🌐 Multi-language (i18n) with [next-intl](https://next-intl-docs.vercel.app/) and [Crowdin](https://l.crowdin.com/next-js) 곧 지원 예정. -->
- 🚨 Linter with [ESLint](https://eslint.org) (default Next.js, Next.js Core Web Vitals, prettier configuration)
- 💖 Code Formatter with [Prettier](https://prettier.io)
- 🐶 Husky for Git Hooks
- 🚫 Lint-staged for running linters on Git staged files
- 🚓 Lint git commit with Commitlint
- 🏎️ Write standard compliant commit messages with [czg](https://cz-git.qbb.sh/cli/)
- 🦺 Unit Testing with Vitest and React Testing Library
- 🧪 Integration and E2E Testing with Playwright
- 🤖 SEO metadata, JSON-LD and Open Graph tags
- 🗺️ Sitemap.xml and robots.txt
- ⚙️ [Bundler Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

## MDX 컴포넌트 개발 가이드라인

### 파일 구조

MDX 컴포넌트는 다음 두 위치 중 하나에 생성해야 합니다:
- `src/components/mdx/{component}/{component}.tsx`
- `src/components/mdx/{component}/ui/{component}.tsx`

### Prop 유효성 검사

모든 MDX 컴포넌트는 반드시 `createMDXComponent` 함수를 사용하여 prop 유효성 검사를 수행해야 합니다.

```typescript
import { z } from 'zod';
import { createMDXComponent } from '../lib/mdx-components';

const ComponentSchema = z.object({
  // 스키마 정의
});

type ComponentProps = z.infer<typeof ComponentSchema>;

const Component: React.FC<ComponentProps> = (props) => {
  const validatedProps = validateProps(ComponentSchema, props, 'Component');
  if (!validatedProps) return null;

  // 컴포넌트 로직
};

export const MDXComponent = createMDXComponent(Component, ComponentSchema);
```

## VSCode information

`.vscode/article.code-snippets`에 정의된 스니펫을 통해 블로그 글을 쉽고 편하게 작성할 수 있습니다.

### 메타데이터 생성

`matter` 또는 `---`를 입력하면 설정한 스니펫이 추천됩니다. 스니펫을 삽입하면 필요한 메타데이터가 자동으로 설정됩니다.
`.md` 또는 `.mdx` 확장자에서 실행됩니다.

### 마크다운 작성

`video` 또는 `embed`를 입력하면 사전에 구성된 `video` 태그를 쉽게 생성해 사용할 수 있습니다.
`.md` 또는 `.mdx` 확장자에서 실행됩니다.
