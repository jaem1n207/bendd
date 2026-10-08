import { act, renderHook, waitFor } from '@testing-library/react';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import getWasm from 'shiki/wasm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMagicMoveHighlighter } from '@/mdx/components/magic-move/highlighter';
import { useHighlighter } from '@/mdx/components/magic-move/use-highlighter';

vi.mock('@/mdx/components/magic-move/highlighter', () => ({
  createMagicMoveHighlighter: vi.fn(),
}));

function deferredHighlighter() {
  let resolve: (highlighter: HighlighterCore) => void = () => {};
  const promise = new Promise<HighlighterCore>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

async function highlighter() {
  const instance = await createHighlighterCore({
    engine: createOnigurumaEngine(getWasm),
  });
  vi.spyOn(instance, 'dispose');
  return instance;
}

describe('MagicMove highlighter lifetime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disposes initialization that finishes after unmount', async () => {
    const pending = deferredHighlighter();
    const instance = await highlighter();
    vi.mocked(createMagicMoveHighlighter).mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useHighlighter('ts'));
    await waitFor(() =>
      expect(createMagicMoveHighlighter).toHaveBeenCalledWith('ts')
    );
    unmount();
    await act(async () => pending.resolve(instance));
    expect(instance.dispose).toHaveBeenCalledOnce();
  });

  it('ignores an old language response and never reuses its disposed instance', async () => {
    const first = deferredHighlighter();
    const second = deferredHighlighter();
    const third = deferredHighlighter();
    const oldInstance = await highlighter();
    const newInstance = await highlighter();
    vi.mocked(createMagicMoveHighlighter)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const { result, rerender, unmount } = renderHook(
      ({ lang }) => useHighlighter(lang),
      { initialProps: { lang: 'ts' } }
    );
    await waitFor(() =>
      expect(createMagicMoveHighlighter).toHaveBeenCalledTimes(1)
    );
    await act(async () => first.resolve(oldInstance));
    expect(result.current).toBe(oldInstance);
    rerender({ lang: 'html' });
    await waitFor(() =>
      expect(createMagicMoveHighlighter).toHaveBeenCalledTimes(2)
    );
    expect(result.current).toBeUndefined();
    expect(oldInstance.dispose).toHaveBeenCalledOnce();
    rerender({ lang: 'ts' });
    await waitFor(() =>
      expect(createMagicMoveHighlighter).toHaveBeenCalledTimes(3)
    );
    expect(result.current).toBeUndefined();
    await act(async () => second.resolve(newInstance));
    expect(result.current).toBeUndefined();
    expect(newInstance.dispose).toHaveBeenCalledOnce();
    unmount();
  });
});
