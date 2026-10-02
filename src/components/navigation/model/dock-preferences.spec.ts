import { beforeEach, describe, expect, test } from 'vitest';

import { useDockPreferences } from '@/components/navigation/model/dock-preferences';

describe('saved dock preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    useDockPreferences.getState().reset();
  });

  test('restores only bounded preferences and retains the store actions', async () => {
    localStorage.setItem(
      'dock-preferences',
      JSON.stringify({
        state: { size: 200, magnification: -1, setSize: 'invalid' },
        version: 1,
      })
    );
    await useDockPreferences.persist.rehydrate();
    const state = useDockPreferences.getState();
    expect(state.size).toBe(64);
    expect(state.magnification).toBe(1.6);
    state.setSize(52);
    expect(
      JSON.parse(localStorage.getItem('dock-preferences') ?? '{}').state
    ).toEqual({ size: 52, magnification: 1.6 });
  });

  test('keeps defaults when stored values have the wrong type', async () => {
    localStorage.setItem(
      'dock-preferences',
      JSON.stringify({
        state: { size: 'large', magnification: null },
        version: 1,
      })
    );
    await useDockPreferences.persist.rehydrate();
    expect(useDockPreferences.getState()).toMatchObject({
      size: 40,
    });
  });
});

test('persists and rehydrates ratio settings without changing the base size', async () => {
  useDockPreferences.getState().setSize(52);
  useDockPreferences.getState().setMagnification(1.8);
  await useDockPreferences.persist.rehydrate();
  expect(useDockPreferences.getState()).toMatchObject({
    size: 52,
    magnification: 1.8,
  });
  expect(
    JSON.parse(localStorage.getItem('dock-preferences') ?? '{}')
  ).toMatchObject({ version: 2, state: { size: 52, magnification: 1.8 } });
});
