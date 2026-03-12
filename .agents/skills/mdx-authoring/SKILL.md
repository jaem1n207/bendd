---
name: mdx-authoring
description: |
  Write, validate, and register MDX components and content for bendd.me blog.
  Use when creating or editing .mdx files, adding custom MDX components,
  modifying frontmatter, or working with the MDX rendering pipeline.
  Triggers on: MDX, frontmatter, article, craft, Callout, Steps, MagicMove,
  content creation, blog post, createMDXComponent, Zod schema validation.
  NOT for component directory structure (use component-creation).
---

# MDX Authoring

Rules for writing MDX content and creating MDX components in bendd.me.

## Frontmatter Schema (Zod-enforced, build fails on violation)

```yaml
---
title: 'Max 38 characters' # REQUIRED, z.string().max(38)
summary: 'Max 40 characters' # REQUIRED, z.string().max(40)
description: 'Max 150 chars for SEO' # REQUIRED, z.string().max(150)
category: 'react' # REQUIRED, must match parent folder name
publishedAt: '2024-04-30' # REQUIRED, ISO date (YYYY-MM-DD only)
image: '/optional.png' # OPTIONAL, absolute path from public/
---
```

Count characters BEFORE writing. Korean characters count as 1 each.

## Two Content Directories

| Directory  | Processor                   | Route             |
| ---------- | --------------------------- | ----------------- |
| `content/` | `createMDXProcessor()`      | `/article/[slug]` |
| `craft/`   | `createCraftMDXProcessor()` | `/craft/[slug]`   |

NEVER mix processors. NEVER place articles in craft/ or vice versa.

## Custom MDX Components Registry

Components are registered in `src/mdx/custom-mdx.tsx`. Available components:

### Callout (Zod-validated)

```mdx
<Callout type="info">Content here</Callout>
<Callout type="warning" emoji="...">
  With custom emoji
</Callout>
```

- `type`: only `'info'` | `'warning'` | `'error'` (default: `'info'`)
- `children`: string or ReactNode (REQUIRED)

### Steps (Zod-validated)

```mdx
<Steps>
  <div>## Step 1 title Step content</div>
  <div>## Step 2 title Step content</div>
</Steps>
```

Each step MUST be wrapped in `<div>`. Flat content breaks counter styling.

### MagicMove (Zod-validated, Client Component)

```mdx
<MagicMove
  lang="typescript"
  codeSnippets={[
    { title: 'Before', description: 'Original', content: 'const x = 1;' },
    { title: 'After', description: 'Improved', content: 'const x = 2;' },
  ]}
/>
```

- Requires `blockJS: false` in custom-mdx.tsx (already configured)
- Both `lang` and `codeSnippets` are REQUIRED

### Video Components (no Zod wrapper)

```mdx
<AutoplayVideo src="/videos/demo.mp4" />
<PreLoadVideo src="/videos/demo.mp4" />
```

Use absolute paths from `public/`.

## Creating a New MDX Component

1. Create file at `src/mdx/components/{name}/{name}.tsx`
2. Define Zod schema for props
3. Wrap with `createMDXComponent(Component, Schema)`
4. Register the exported component in `src/mdx/custom-mdx.tsx` components object
5. Use standard Tailwind utility classes in the component JSX

```typescript
import { z } from 'zod';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';

const MySchema = z.object({
  variant: z.enum(['a', 'b']).default('a'),
  children: z.custom<ReactNode>(),
});

function MyComponent({ variant, children }: z.infer<typeof MySchema>) {
  return <div className="rounded-lg p-4">{children}</div>;
}

export const MDXMyComponent = createMDXComponent(MyComponent, MySchema);
```

## Security (CVE-2026-0969)

```typescript
// src/mdx/custom-mdx.tsx — DO NOT CHANGE these settings
blockJS: false,           // Needed for MagicMove JS expressions
blockDangerousJS: true,   // Blocks eval/Function/process/require
```

## Common Mistakes

- Title > 38 chars, summary > 40 chars, description > 150 chars -> build failure
- Unregistered component in custom-mdx.tsx -> renders as undefined
- Callout type="success" -> invalid, only info/warning/error
- Steps without `<div>` wrapping each step -> broken counter
- Relative image paths (`./images/`) -> 404, use absolute (`/images/`)
- Category not matching folder name -> article hidden from category filter
- Date format `04/30/2024` -> invalid, must be `2024-04-30`
