import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('use-sound', () => ({
  default: () => [vi.fn()],
}));

vi.mock('../model/sound-store', () => ({
  useSoundStore: (
    selector: (s: {
      isSoundEnabled: boolean;
      toggleSoundEnabled: () => void;
    }) => unknown
  ) => selector({ isSoundEnabled: true, toggleSoundEnabled: vi.fn() }),
}));

vi.mock('@/components/client-gate', () => ({
  ClientGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/icons', () => ({
  SoundMax: ({ className }: { className: string }) => (
    <span data-testid="sound-max" className={className} />
  ),
  SoundMute: ({ className }: { className: string }) => (
    <span data-testid="sound-mute" className={className} />
  ),
}));

import { track } from '@vercel/analytics';
import { SoundSwitcher } from './sound-switcher';

describe('SoundSwitcher — analytics deferral', () => {
  let originalRIC: typeof globalThis.requestIdleCallback;

  beforeEach(() => {
    originalRIC = globalThis.requestIdleCallback;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.requestIdleCallback = originalRIC;
  });

  it('should defer track() via requestIdleCallback on toggle', () => {
    const idleCallbacks: IdleRequestCallback[] = [];
    globalThis.requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(cb);
      return idleCallbacks.length;
    }) as typeof globalThis.requestIdleCallback;

    render(<SoundSwitcher />);
    fireEvent.click(screen.getByTitle('Toggle Sound'));

    expect(track).not.toHaveBeenCalled();
    expect(idleCallbacks.length).toBe(1);

    idleCallbacks[0]({} as IdleDeadline);

    expect(track).toHaveBeenCalledWith('toggle_sound', { enabled: false });
  });

  it('should not call track() synchronously in click handler', () => {
    globalThis.requestIdleCallback = vi.fn(
      () => 1
    ) as unknown as typeof globalThis.requestIdleCallback;

    render(<SoundSwitcher />);
    fireEvent.click(screen.getByTitle('Toggle Sound'));

    expect(track).not.toHaveBeenCalled();
  });

  it('should fall back to setTimeout when requestIdleCallback is unavailable', () => {
    // @ts-expect-error — simulate environments without requestIdleCallback
    delete globalThis.requestIdleCallback;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    render(<SoundSwitcher />);
    fireEvent.click(screen.getByTitle('Toggle Sound'));

    const deferredCall = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === 0
    );
    expect(deferredCall).toBeDefined();
    expect(track).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });
});
