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
