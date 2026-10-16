import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => true,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('mounts and resizes the Dock when localStorage access is denied before store creation', async () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage access denied', 'SecurityError');
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );

  const { NavigationAnimateTrigger } = await import(
    '@/components/navigation/ui/navigation-animate-trigger'
  );
  const { DockSeparator } = await import(
    '@/components/navigation/ui/dock-separator'
  );

  render(
    <NavigationAnimateTrigger>
      <button>Home</button>
      <DockSeparator />
    </NavigationAnimateTrigger>
  );

  expect(screen.getByRole('group', { name: '사이트 탐색 Dock' })).toBeDefined();
  const handle = screen.getByRole('slider', { name: 'Dock 크기 조절' });
  expect(handle.getAttribute('aria-valuenow')).toBe('40');

  fireEvent.keyDown(handle, { key: 'End' });

  expect(handle.getAttribute('aria-valuenow')).toBe('64');
});
