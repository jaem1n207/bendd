# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `pnpm dev` - Start development server on localhost:3000
- `pnpm build` - Production build with optimization
- `pnpm build-stats` - Build with bundle analyzer for performance analysis
- `pnpm start` - Start production server (requires build first)

### Testing

- `pnpm test:unit` - Run unit tests with Vitest
- `pnpm test:e2e` - Run E2E tests with Playwright (focuses on SEO, headers, and critical user flows)

### Code Quality

- `pnpm lint` - ESLint check for all files
- `pnpm lint:fix` - Auto-fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm check-types` - TypeScript type checking

### Utilities

- `pnpm clean` - Remove .next build artifacts
- `pnpm cz` - Interactive commit message helper

## Architecture Overview

This is a personal blog/portfolio built with Next.js 14 (App Router) featuring Korean content about development experiences.

### Key Architectural Patterns

#### Component Organization

The codebase follows a domain-driven structure:

- **UI Components**: `src/components/ui/` - shadcn/ui components with `bd-` prefix
- **Domain Components**: `src/components/{domain}/` - Feature-specific components organized by domain (navigation, theme, sound, article, etc.)
- **Layout Components**: Shared layouts in `src/components/layout/`

#### MDX Content System

- **Content Processing**: `src/mdx/mdx.ts` contains `MDXProcessor` class for content management
- **Content Directories**:
  - `content/` - Blog articles
  - `craft/` - Creative/experimental content
- **MDX Components**: `src/mdx/components/` - Custom MDX components with validation
- **Validation Pattern**: All MDX components use `createMDXComponent` with Zod schemas for prop validation

#### State Management

- **Theme**: Next-themes with system detection
- **Sound**: Zustand store (`src/components/sound/model/sound-store.ts`)
- **Navigation**: Framer Motion animations with custom hooks

### File Structure Patterns

#### MDX Component Development

When creating MDX components, follow this structure:

```
src/mdx/components/{component}/
├── {component}.tsx        # Main component
└── ui/                   # Optional UI variants
    └── {component}.tsx
```

All MDX components must:

1. Use `createMDXComponent` wrapper for validation
2. Define Zod schema for props
3. Include proper TypeScript types

#### Domain Component Structure

```
src/components/{domain}/
├── index.ts              # Public exports
├── ui/                   # UI components
├── model/                # State/business logic
├── types/                # TypeScript definitions
└── consts/               # Constants
```

### Styling System

- **Framework**: Tailwind CSS with custom prefix `bd-`
- **Components**: shadcn/ui components configured in `components.json`
- **Fonts**: Inter (sans) and Fira Mono (mono) from Google Fonts
- **Theme**: CSS variables with dark/light mode support

### Content Management

The `MDXProcessor` class provides a functional API for content operations:

```typescript
// Example usage patterns
createMDXProcessor()
  .sortByDateDesc()
  .limit(5)
  .formatForDisplay({ includeRelativeDate: true });
```

### Navigation & Routing

- **Main Navigation**: Fixed footer navigation with icon-based items
- **Routes**: `/` (home), `/article` (blog), `/craft` (creative), `/photo` (disabled)
- **Dynamic Routes**: `/article/[slug]` and `/craft/[slug]` for content

### SEO & Meta

- Comprehensive metadata handling in `src/lib/site-metadata.ts`
- Dynamic Open Graph image generation at `/api/og`
- Sitemap and robots.txt generation
- RSS feed support

## Development Guidelines

### Code Quality

- Pre-commit hooks enforce linting and type checking
- Prettier formatting with staged file linting
- TypeScript strict mode enabled

### Testing Strategy

- Unit tests focus on utility functions and business logic
- E2E tests verify SEO behavior, metadata, and critical user paths
- Component testing for UI interactions

### Content Creation

- VSCode snippets in `.vscode/article.code-snippets` for efficient content authoring
- Strict frontmatter validation with Zod schemas
- Korean language support with proper typography

### Performance

- Bundle analysis available via `pnpm build-stats`
- Framer Motion for smooth animations
- Dynamic imports for non-critical components
- Vercel Analytics integration

## PR Workflow

모든 코드 변경 작업은 다음 워크플로우를 따른다.

### 작업 단위 분리 원칙

- 하나의 PR은 하나의 관심사만 다룬다
- PR 크기는 300줄 이하를 목표로 한다
- 서로 의존하지 않는 작업은 별도 PR로 분리한다

### 실행 전략 판단

작업 요청을 받으면, 먼저 작업의 성향과 특성을 분석하여 실행 전략을 결정한다:

#### Sub Agent (Task tool) — 같은 브랜치 내 병렬

- **언제:** 하나의 PR 내에서 파일 간 의존성이 있는 여러 작업을 동시에 수행할 때
- **예시:** 같은 feature의 UI 컴포넌트 + query factory + 타입 정의를 동시에 작성
- **특징:** 동일 디렉토리, 동일 브랜치, 하나의 PR

#### Worktree + 독립 Claude Code 인스턴스 — 브랜치 간 병렬

- **언제:** 모듈 간 독립성이 높은 작업을 별도 PR로 동시에 진행할 때
- **예시:**
  - dashboard 기능과 bot-server 기능을 각각 개발
  - 완전히 독립된 2개의 feature를 동시에
- **특징:** 별도 디렉토리, 별도 브랜치, 각각의 PR, 독립된 Claude Code 인스턴스
- **제약:** dependency 변경이 필요한 작업은 worktree 병렬을 피한다 (lockfile 충돌 위험)
  - 이 경우 순차 실행 전략을 사용하거나, dependency 변경을 선행 PR로 분리한다

#### 순차 실행 — 의존성 있는 복수 PR

- **언제:** PR 간 의존관계가 있을 때
- **예시:** shared 패키지 변경 후 이를 사용하는 feature 개발
- **특징:** PR1 머지 완료 후 PR2 시작

### Worktree 운영 규칙

작업 분석 후 worktree가 적합하다고 판단되면 아래 절차를 따른다.

**생성:**

```bash
git worktree add ../bendd-wt-<name> -b <type>/<description> main
# 새 터미널에서:
cd ../bendd-wt-<name> && pnpm install --frozen-lockfile
claude  # Anthropic Claude Code CLI로 독립 인스턴스 실행
```

**정리:**

```bash
git worktree remove ../bendd-wt-<name>
```

**규칙:**

- 디렉토리명: `../bendd-wt-<짧은이름>`
- 머지 완료된 worktree는 즉시 제거한다
- Turbo 캐시는 worktree 간 자동 공유된다 (추가 설정 불필요)
- AGENTS.md, `.claude/skills` 등 모든 설정은 worktree에서 자동 사용 가능하다

### PR 생명주기

#### Phase 1: 브랜치 생성 & 작업

1. main 최신화: `git checkout main && git pull origin main`
2. 브랜치 생성: `git checkout -b <type>/<description>`
3. Conventional Commits로 **한국어** 커밋 (Husky가 자동으로 lint-staged 실행)
   - 형식: `<type>(<scope>): <한국어 설명>`
   - 예시: `feat(dashboard): 거래 내역 페이지 추가`, `fix(bot-server): WebSocket 재연결 로직 수정`
   - 상세 워크플로우는 `commit-work` 스킬 참조

#### Phase 2: PR 생성

1. `git push -u origin <branch>`
2. `gh pr create` — PR 템플릿 활용, 변경 요약 작성, Assignees는 `jaem1n207`로 설정
3. PR 생성 후 Arc 브라우저에서 자동으로 열기: `open -a "Arc" <pr_url>`
4. CI 트리거 확인

#### Phase 3: CodeRabbit 리뷰 대기 & 반영

1. CodeRabbit 리뷰 완료 대기 (30초 간격 폴링, 최대 5분):

   ```bash
   gh pr view <pr_number> --comments
   ```

2. 피드백 분석 후 수정 → 재커밋 → push
3. **리뷰 코멘트 응답**: 모든 리뷰 코멘트에 반드시 응답한다
   - 반영한 코멘트: 수정 커밋 해시와 함께 해결되었음을 표기
   - 반영하지 않은 코멘트: 이유를 설명하는 답변 작성
4. **PR 설명 최신화**: 피드백 반영이나 새로운 커밋으로 인해 변경 내용이 달라졌다면 PR 설명(body)을 실제 코드와 일치하도록 업데이트한다
   - `gh pr edit <pr_number> --body "<업데이트된 PR 설명>"`로 수정
   - 추가/변경/삭제된 항목을 PR 설명에 반영하여 리뷰어에게 혼란을 주지 않도록 한다
5. CI 통과 확인: `gh pr checks <pr_number>`

#### Phase 4: 머지

1. CI 통과 + CodeRabbit 이슈 해결 확인
2. 머지 전 LGTM 코멘트 추가: `gh pr comment <pr_number> --body "<변경 내용을 요약한 승인 코멘트>"`
   - 변경 사항의 핵심을 간결하게 요약하고, 승인 의사를 표현한다
   - 예시: `LGTM — FSD 레이어 의존성 규칙이 올바르게 적용되었고, 쿼리 팩토리 패턴도 깔끔합니다. 🚀`
3. `gh pr merge <pr_number> --squash --delete-branch`
4. 로컬 정리: `git checkout main && git pull origin main`

### 브랜치 네이밍

| Prefix      | 용도      | 예시                       |
| ----------- | --------- | -------------------------- |
| `feat/`     | 새 기능   | `feat/add-portfolio-view`  |
| `fix/`      | 버그 수정 | `fix/price-calculation`    |
| `refactor/` | 리팩토링  | `refactor/extract-api`     |
| `chore/`    | 설정/CI   | `chore/add-ci-workflow`    |
| `docs/`     | 문서      | `docs/update-architecture` |
