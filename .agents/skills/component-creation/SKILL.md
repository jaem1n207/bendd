---
name: component-creation
description: |
  Create domain components following bendd.me's directory structure, barrel
  export pattern, and validation conventions. Use when adding new React
  components, creating Zustand stores, setting up hooks, or organizing
  component files. Triggers on: new component, create component, add hook,
  Zustand store, barrel export, index.ts, domain folder.
  NOT for React composition patterns like compound components or render props
  (use vercel-composition-patterns). NOT for MDX components (use mdx-authoring).
---

# Component Creation

Rules for creating domain components in bendd.me's component architecture.

## Directory Structure

Every domain component follows this structure:

```
src/components/{domain}/
  index.ts        # Public API — the ONLY valid import path
  ui/             # React components (.tsx)
  model/          # Hooks (use-*.ts), stores (*-store.ts)
  types/          # Type definitions (.d.ts)
  consts/         # Constants
  lib/            # Utilities
```

Not every subdirectory is required — create only what the component needs.

## Barrel Export (index.ts)

The `index.ts` file is the ONLY public API. External code imports from here.

```typescript
// src/components/sound/index.ts
export { SoundSwitcher } from './ui/sound-switcher';
export { useSoundStore } from './model/sound-store';
```

```typescript
// CORRECT — import from barrel
import { SoundSwitcher } from '@/components/sound';

// WRONG — import from subdirectory (breaks encapsulation)
import { SoundSwitcher } from '@/components/sound/ui/sound-switcher';
```

## Import Alias

Always use `@/` alias. Never use relative imports.

```typescript
// CORRECT
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// WRONG
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
```

## Zustand Stores

Stores use `persist` middleware with named storage keys:

```typescript
// src/components/sound/model/sound-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundState {
  isSoundEnabled: boolean;
  toggleSoundEnabled: () => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      isSoundEnabled: false,
      toggleSoundEnabled: () => {
        set({ isSoundEnabled: !get().isSoundEnabled });
      },
    }),
    {
      name: 'sound-enabled',
    }
  )
);
```

Storage key format: `{feature-name}`.

## Client Components in Server Component Layouts

Client-only components (using hooks, browser APIs) must be dynamically imported
in Server Components:

```typescript
// In a Server Component (layout.tsx, page.tsx)
import dynamic from 'next/dynamic';

const Signature = dynamic(
  () => import('../components/signature').then(mod => mod.Signature),
  { ssr: false }
);
```

## shadcn/ui Components

Located in `src/components/ui/` (flat structure, no barrel export needed).
Install via:

```bash
pnpm dlx shadcn@latest add [component]
```

These are leaf components — import directly:

```typescript
import { Button } from '@/components/ui/button';
```

## Naming Conventions

| Item           | Convention   | Example                |
| -------------- | ------------ | ---------------------- |
| Component file | kebab-case   | `sound-switcher.tsx`   |
| Component name | PascalCase   | `SoundSwitcher`        |
| Hook file      | `use-*.ts`   | `use-theme-manager.ts` |
| Hook name      | `use*`       | `useThemeManager`      |
| Store file     | `*-store.ts` | `sound-store.ts`       |
| Store name     | `use*Store`  | `useSoundStore`        |
| Type file      | `*.d.ts`     | `sound.d.ts`           |
| Constant file  | kebab-case   | `sound-config.ts`      |

## Quick Checklist

When creating a new domain component:

1. Create directory at `src/components/{domain}/`
2. Add `index.ts` with public exports
3. Place React components in `ui/`
4. Place hooks and stores in `model/`
5. Storage keys use descriptive names
6. All imports use `@/` alias
7. Dynamic import for client-only components in Server Components
