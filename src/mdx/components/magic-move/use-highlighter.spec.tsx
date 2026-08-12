import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHighlighter } from '@/mdx/components/magic-move/use-highlighter';

describe('useHighlighter', () => {
  it('MagicMove에서 사용하는 SCSS 문법을 등록한다', async () => {
    const { result } = renderHook(() => useHighlighter());

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current?.getLoadedLanguages()).toContain('scss');
  });
});
