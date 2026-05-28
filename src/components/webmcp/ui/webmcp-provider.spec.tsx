import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnyWebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

const mocks = vi.hoisted(() => ({
  buildTools: vi.fn((): AnyWebMCPToolDescriptor[] => []),
}));

vi.mock('@/components/webmcp/model/use-webmcp-tools', () => ({
  useWebMCPTools: () => mocks.buildTools,
}));

import { WebMCPProvider } from '@/components/webmcp/ui/webmcp-provider';

function createDescriptor(name: string): AnyWebMCPToolDescriptor {
  return {
    name,
    description: `Register ${name}.`,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    execute: vi.fn(),
  };
}

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
    mocks.buildTools.mockReturnValue([createDescriptor('get_site_context')]);
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
    document.body.innerHTML = '';
    document.body.removeAttribute('data-committed-route');
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

  it('builds route-filtered tools during idle after the committed DOM is current', () => {
    const registerTool = vi.fn();
    const idleCallbacks: IdleRequestCallback[] = [];
    globalThis.requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }) as typeof requestIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        modelContext: { registerTool },
      },
    });
    document.body.dataset.committedRoute = 'previous';
    mocks.buildTools.mockImplementation(() => [
      createDescriptor(
        `${document.body.dataset.committedRoute ?? 'missing'}_tool`
      ),
    ]);

    render(<WebMCPProvider />);

    document.body.dataset.committedRoute = 'current';
    idleCallbacks[0]({} as IdleDeadline);

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool.mock.calls[0][0].name).toBe('current_tool');
  });

  it('skips imperative tools already exposed by declarative forms', () => {
    const registerTool = vi.fn(tool => {
      if (tool.name === 'run_shuffle_letters') {
        throw new Error('Duplicate tool name');
      }
    });
    const idleCallbacks: IdleRequestCallback[] = [];
    globalThis.requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }) as typeof requestIdleCallback;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        modelContext: { registerTool },
      },
    });
    document.body.innerHTML = `
      <form toolname="run_shuffle_letters">
        <button type="submit">Run</button>
      </form>
    `;
    mocks.buildTools.mockReturnValue([
      createDescriptor('run_shuffle_letters'),
      createDescriptor('stop_shuffle_letters'),
    ]);

    render(<WebMCPProvider />);

    expect(() => idleCallbacks[0]({} as IdleDeadline)).not.toThrow();
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool.mock.calls[0][0].name).toBe('stop_shuffle_letters');
  });

  it('keeps cleanup safe when tool registration throws during idle', () => {
    const registerTool = vi.fn(() => {
      throw new Error('Registration failed');
    });
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
    mocks.buildTools.mockReturnValue([createDescriptor('get_site_context')]);

    const { unmount } = render(<WebMCPProvider />);

    expect(() => idleCallbacks[0]({} as IdleDeadline)).not.toThrow();
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(() => unmount()).not.toThrow();
  });
});
