/* eslint-disable playwright/no-standalone-expect -- Vitest tests share the project's Playwright .spec.ts glob. */
import { describe, expect, it } from 'vitest';

import { createMagicMoveHighlighter } from '@/mdx/components/magic-move/highlighter';

describe('MagicMove language loading', () => {
  it.each([
    'typescript',
    'ts',
    'javascript',
    'js',
    'scss',
    'html',
    'bash',
    'md',
    'yml',
    'svelte',
  ])('highlights %s with both existing themes', async lang => {
    const highlighter = await createMagicMoveHighlighter(lang);
    try {
      for (const theme of ['github-light', 'vitesse-dark']) {
        const result = highlighter.codeToTokens('const value = 1;', {
          lang,
          theme,
        });
        expect(
          result.tokens
            .flat()
            .map(token => token.content)
            .join('')
        ).toBe('const value = 1;');
        expect(result.tokens.flat().some(token => token.color)).toBe(true);
      }
    } finally {
      highlighter.dispose();
    }
  });

  it('does not load unrelated grammars for a TypeScript example', async () => {
    const highlighter = await createMagicMoveHighlighter('ts');
    try {
      expect(highlighter.getLoadedLanguages().sort()).toEqual([
        'ts',
        'typescript',
      ]);
      expect(highlighter.getLoadedThemes().sort()).toEqual([
        'github-light',
        'vitesse-dark',
      ]);
    } finally {
      highlighter.dispose();
    }
  });

  it('rejects unsupported languages instead of loading the full bundle', async () => {
    await expect(
      createMagicMoveHighlighter('unknown-language')
    ).rejects.toThrow('Unsupported MagicMove language');
  });
});
