import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/webmcp/model/use-webmcp-tools', () => ({
  useWebMCPTools: () => [
    {
      name: 'get_site_context',
      description: 'Read site context.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: vi.fn(),
    },
  ],
}));

import { WebMCPProvider } from '@/components/webmcp/ui/webmcp-provider';

describe('WebMCPProvider', () => {
  let originalNavigatorDescriptor: PropertyDescriptor | undefined;
  let originalRequestIdleCallback: typeof globalThis.requestIdleCallback;
  let originalCancelIdleCallback: typeof globalThis.cancelIdleCallback;

  beforeEach(() => {
    originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'navigator'
    );
    originalRequestIdleCallback = globalThis.requestIdleCallback;
    originalCancelIdleCallback = globalThis.cancelIdleCallback;
  });

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        globalThis,
        'navigator',
        originalNavigatorDescriptor
      );
    }

    globalThis.requestIdleCallback = originalRequestIdleCallback;
    globalThis.cancelIdleCallback = originalCancelIdleCallback;
    vi.clearAllMocks();
  });

  it('does not schedule idle work when WebMCP is unsupported', () => {
    const idle = vi.fn();
    globalThis.requestIdleCallback = idle as typeof requestIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    render(<WebMCPProvider />);

    expect(idle).not.toHaveBeenCalled();
  });

  it('registers tools during idle time and aborts on unmount', () => {
    const registerTool = vi.fn();
    const idleCallbacks: IdleRequestCallback[] = [];
    globalThis.requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }) as typeof requestIdleCallback;
    globalThis.cancelIdleCallback = vi.fn() as typeof cancelIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        modelContext: { registerTool },
      },
    });

    const { unmount } = render(<WebMCPProvider />);

    expect(registerTool).not.toHaveBeenCalled();
    idleCallbacks[0]({} as IdleDeadline);
    expect(registerTool).toHaveBeenCalledTimes(1);

    const signal = registerTool.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it('cancels pending idle registration before the callback runs', () => {
    const registerTool = vi.fn();
    globalThis.requestIdleCallback = vi.fn(
      () => 123
    ) as typeof requestIdleCallback;
    globalThis.cancelIdleCallback = vi.fn() as typeof cancelIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        modelContext: { registerTool },
      },
    });

    const { unmount } = render(<WebMCPProvider />);

    unmount();

    expect(globalThis.cancelIdleCallback).toHaveBeenCalledWith(123);
    expect(registerTool).not.toHaveBeenCalled();
  });
});
