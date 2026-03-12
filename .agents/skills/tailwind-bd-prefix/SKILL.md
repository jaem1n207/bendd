---
name: tailwind-bd-prefix
description: |
  Enforce the bd- prefix convention for Tailwind CSS in bendd.me.
  Use when writing JSX/TSX components, reviewing Tailwind classes, fixing
  styling issues, or when the user asks about CSS, styling, or layout.
  Triggers on: className, Tailwind, CSS, styling, layout, responsive,
  dark mode, hover, animation, bd- prefix, color, theme.
  NOT for non-Tailwind CSS variables (those use hsl() format directly).
  NOT for React composition patterns (use vercel-composition-patterns).
---

# Tailwind bd- Prefix Convention

ALL Tailwind utility classes in bendd.me require the `bd-` prefix. Classes
without the prefix silently fail — no error, just no styling applied.
This is the #1 agent mistake in this codebase.

## Prefix Rules

### Basic utilities

```tsx
// CORRECT
<div className="bd-flex bd-gap-2 bd-p-4 bd-rounded-lg">

// WRONG — silently fails
<div className="flex gap-2 p-4 rounded-lg">
```

### Variants (responsive, state, dark mode)

```tsx
// CORRECT — prefix goes AFTER the variant colon
<div className="hover:bd-bg-primary dark:bd-text-foreground md:bd-grid-cols-2">

// WRONG — prefix before variant
<div className="bd-hover:bg-primary bd-dark:text-foreground">

// WRONG — no prefix at all
<div className="hover:bg-primary dark:text-foreground">
```

### Arbitrary values

```tsx
// CORRECT
<div className="bd-w-[200px] bd-bg-[hsl(var(--primary))]">

// WRONG
<div className="w-[200px] bg-[hsl(var(--primary))]">
```

## Color System (HSL CSS Variables)

Colors use HSL CSS variables, NOT hex or RGB values.

```tsx
// CORRECT — use semantic color names
<div className="bd-bg-background bd-text-foreground bd-border-border">

// CORRECT — use hsl() with CSS variable for arbitrary values
<div className="bd-bg-[hsl(var(--primary))]">

// WRONG — hex values break dark mode
<div className="bd-bg-[#ffffff]">

// WRONG — RGB breaks dark mode
<div className="bd-bg-[rgb(255,255,255)]">
```

### Available semantic colors

Defined in `src/globals.css` as HSL values:

- `background`, `foreground` — page base
- `primary`, `primary-foreground` — primary actions
- `secondary`, `secondary-foreground` — secondary elements
- `muted`, `muted-foreground` — subdued content
- `accent`, `accent-foreground` — highlights
- `destructive`, `destructive-foreground` — errors/danger
- `border`, `input`, `ring` — borders and focus rings

## cn() Helper

Always use `cn()` from `@/lib/utils` for conditional classes:

```tsx
import { cn } from '@/lib/utils';

<div className={cn('bd-flex bd-gap-2', isActive && 'bd-bg-primary')}>
```

## tailwind-merge Behavior

`tailwind-merge` (used inside `cn()`) understands the `bd-` prefix.
Class conflicts resolve correctly: `cn('bd-p-2', 'bd-p-4')` -> `'bd-p-4'`.

## Custom Animations

Available in `tailwind.config.ts`:

- `bd-animate-accordion-down`, `bd-animate-accordion-up`
- `bd-animate-signature` (SVG stroke animation)
- Custom easings: `bd-ease-in-quad`, `bd-ease-in-cubic`, etc.

## shadcn/ui Components

Located in `src/components/ui/`. Already configured with `bd-` prefix via
`components.json`. When adding new shadcn components:

```bash
pnpm dlx shadcn@latest add [component]
```

The CLI auto-applies `bd-` prefix based on `components.json` config.

## Quick Checklist

Before submitting any JSX/TSX with Tailwind classes:

1. Every utility has `bd-` prefix
2. Variants use `variant:bd-utility` format (not `bd-variant:utility`)
3. Colors use semantic names or `hsl(var(--name))`, never hex/RGB
4. Arbitrary values: `bd-[value]` not `[value]`
5. Conditional classes use `cn()` from `@/lib/utils`
