import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: vi.fn(),
    resolvedTheme: 'dark',
  }),
}));

import { track } from '@vercel/analytics';
import { useThemeManager } from './use-theme-manger';

describe('useThemeManager — analytics deferral', () => {
  let originalRIC: typeof globalThis.requestIdleCallback;
  let originalCIC: typeof globalThis.cancelIdleCallback;

  beforeEach(() => {
    originalRIC = globalThis.requestIdleCallback;
    originalCIC = globalThis.cancelIdleCallback;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.requestIdleCallback = originalRIC;
    globalThis.cancelIdleCallback = originalCIC;
  });

  it('should defer track() via requestIdleCallback instead of calling synchronously', () => {
    const idleCallbacks: IdleRequestCallback[] = [];
    globalThis.requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(cb);
      return idleCallbacks.length;
    }) as typeof globalThis.requestIdleCallback;
    globalThis.cancelIdleCallback = vi.fn();

    renderHook(() => useThemeManager());

    expect(track).not.toHaveBeenCalled();
    expect(idleCallbacks.length).toBeGreaterThan(0);

    idleCallbacks[0]({} as IdleDeadline);

    expect(track).toHaveBeenCalledWith('preferred_theme', {
      theme: 'dark',
    });
  });

  it('should cancel pending idle callback on cleanup', () => {
    const cancelFn = vi.fn();
    globalThis.requestIdleCallback = vi.fn(
      () => 42
    ) as unknown as typeof globalThis.requestIdleCallback;
    globalThis.cancelIdleCallback = cancelFn;

    const { unmount } = renderHook(() => useThemeManager());
    unmount();

    expect(cancelFn).toHaveBeenCalledWith(42);
  });

  it('should fall back to setTimeout when requestIdleCallback is unavailable', () => {
    // @ts-expect-error — simulate environments without requestIdleCallback
    delete globalThis.requestIdleCallback;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    renderHook(() => useThemeManager());

    const deferredCall = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === 0
    );
    expect(deferredCall).toBeDefined();

    setTimeoutSpy.mockRestore();
  });
});
