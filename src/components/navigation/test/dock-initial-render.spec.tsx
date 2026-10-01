import { runInNewContext } from 'node:vm';
import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useDockPreferences } from '@/components/navigation/model/dock-preferences';
import { DockSeparator } from '@/components/navigation/ui/dock-separator';
import { NavigationAnimateTrigger } from '@/components/navigation/ui/navigation-animate-trigger';

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => true,
}));

const content = (
  <NavigationAnimateTrigger>
    <button>Home</button>
    <DockSeparator />
  </NavigationAnimateTrigger>
);

function firstDocument() {
  const container = document.createElement('div');
  container.innerHTML = renderToString(content);
  document.body.append(container);
  const script = container.querySelector('script');
  expect(
    script,
    'saved size must be applied before the Dock HTML paints'
  ).not.toBeNull();
  runInNewContext(script?.textContent ?? '', { document, localStorage });
  const dock = container.querySelector<HTMLElement>('[data-dock]');
  expect(dock?.style.getPropertyValue('--dock-size')).toContain(
    '--site-dock-size'
  );
  return container;
}

beforeEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.removeProperty('--site-dock-size');
  localStorage.clear();
  useDockPreferences.getState().reset();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.removeProperty('--site-dock-size');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('uses the saved size before hydration and keeps it when React takes over', async () => {
  localStorage.setItem(
    'dock-preferences',
    JSON.stringify({
      state: { size: 56, magnification: 1.85 },
      version: 2,
    })
  );
  const errors = vi.spyOn(console, 'error');
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  const container = firstDocument();
  expect(
    document.documentElement.style.getPropertyValue('--site-dock-size')
  ).toBe('56px');
  const root = hydrateRoot(container, content);
  await act(async () => {});
  expect(
    container
      .querySelector<HTMLElement>('[data-dock]')
      ?.style.getPropertyValue('--dock-size')
  ).toBe('56px');
  expect(useDockPreferences.getState()).toMatchObject({
    size: 56,
    magnification: 1.85,
  });
  expect(writes).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

test.each([
  ['{broken', '40px'],
  [JSON.stringify({ state: { size: 'large' }, version: 2 }), '40px'],
  [JSON.stringify({ state: { size: 200 }, version: 1 }), '64px'],
  [JSON.stringify({ state: { size: -8 }, version: 2 }), '32px'],
])('bounds the initial size without parsing errors: %s', (saved, expected) => {
  localStorage.setItem('dock-preferences', saved);
  firstDocument();
  expect(
    document.documentElement.style.getPropertyValue('--site-dock-size')
  ).toBe(expected);
});

test('still renders at the default size when storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  firstDocument();
  expect(
    document.documentElement.style.getPropertyValue('--site-dock-size')
  ).toBe('40px');
});
