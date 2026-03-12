import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureLocalStorage } from './ensure-local-storage';

describe('ensureLocalStorage', () => {
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('should apply polyfill when localStorage is undefined', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    ensureLocalStorage();

    expect(globalThis.localStorage).toBeDefined();
    expect(typeof globalThis.localStorage.getItem).toBe('function');
  });

  it('should apply polyfill when getItem is not a function (Node.js 19+ broken localStorage)', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: 'not-a-function' },
      writable: true,
      configurable: true,
    });

    ensureLocalStorage();

    expect(typeof globalThis.localStorage.getItem).toBe('function');
  });

  it('should not override a fully functional localStorage', () => {
    const mockStorage = {
      getItem: () => 'value',
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    ensureLocalStorage();

    expect(globalThis.localStorage.getItem('')).toBe('value');
  });

  it('should provide all Storage interface methods', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    ensureLocalStorage();

    const ls = globalThis.localStorage;
    expect(ls.getItem('key')).toBeNull();
    expect(ls.setItem('key', 'val')).toBeUndefined();
    expect(ls.removeItem('key')).toBeUndefined();
    expect(ls.clear()).toBeUndefined();
    expect(ls.length).toBe(0);
    expect(ls.key(0)).toBeNull();
  });

  it('should be idempotent across multiple calls', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    ensureLocalStorage();
    const firstRef = globalThis.localStorage;

    ensureLocalStorage();
    const secondRef = globalThis.localStorage;

    expect(firstRef).toBe(secondRef);
    expect(typeof globalThis.localStorage.getItem).toBe('function');
  });

  it('should handle localStorage with null getItem', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: null },
      writable: true,
      configurable: true,
    });

    ensureLocalStorage();

    expect(typeof globalThis.localStorage.getItem).toBe('function');
  });
});
