import { describe, expect, it, vi } from 'vitest';

import {
  createToolDescriptor,
  webMCPSchemas,
} from '@/components/webmcp/lib/schemas';
import {
  hasModelContext,
  registerWebMCPTools,
} from '@/components/webmcp/lib/register-tool';
import type { WebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

function createTool(name: string): WebMCPToolDescriptor {
  return {
    name,
    description: `${name} description`,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    execute: vi.fn(),
  };
}

describe('registerWebMCPTools', () => {
  it('returns false when navigator.modelContext is missing', () => {
    expect(hasModelContext({} as Navigator)).toBe(false);
  });

  it('returns true when navigator.modelContext.registerTool exists', () => {
    expect(
      hasModelContext({
        modelContext: {
          registerTool: vi.fn(),
        },
      } as unknown as Navigator)
    ).toBe(true);
  });

  it('registers each tool with one abort signal and cleans up by aborting it', () => {
    const registerTool = vi.fn();
    const navigatorMock = {
      modelContext: { registerTool },
    } as unknown as Navigator;
    const tools = [createTool('get_site_context'), createTool('navigate_site')];

    const cleanup = registerWebMCPTools(tools, navigatorMock);

    expect(registerTool).toHaveBeenCalledTimes(2);
    const firstOptions = registerTool.mock.calls[0][1] as {
      signal: AbortSignal;
    };
    const secondOptions = registerTool.mock.calls[1][1] as {
      signal: AbortSignal;
    };
    expect(firstOptions.signal).toBe(secondOptions.signal);
    expect(firstOptions.signal.aborted).toBe(false);

    cleanup();

    expect(firstOptions.signal.aborted).toBe(true);
  });

  it('aborts already registered tools when a later registration throws', () => {
    const registerError = new Error('register failed');
    const registerTool = vi
      .fn()
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw registerError;
      });
    const navigatorMock = {
      modelContext: { registerTool },
    } as unknown as Navigator;
    const tools = [createTool('get_site_context'), createTool('navigate_site')];

    expect(() => registerWebMCPTools(tools, navigatorMock)).toThrow(
      registerError
    );

    const firstOptions = registerTool.mock.calls[0][1] as {
      signal: AbortSignal;
    };
    expect(firstOptions.signal.aborted).toBe(true);
  });

  it('does nothing and returns a stable cleanup function when unsupported', () => {
    const cleanup = registerWebMCPTools([createTool('get_site_context')], {
      modelContext: undefined,
    } as unknown as Navigator);

    expect(() => cleanup()).not.toThrow();
  });

  it('accepts strongly typed tool descriptors from createToolDescriptor', () => {
    const typedTool = createToolDescriptor<{ enabled: boolean }, string>({
      name: 'set_sound',
      description: 'Set sound preference.',
      inputSchema: webMCPSchemas.setSound,
      execute: input => (input.enabled ? 'enabled' : 'disabled'),
    });

    const cleanup = registerWebMCPTools([typedTool], {
      modelContext: undefined,
    } as unknown as Navigator);

    expect(() => cleanup()).not.toThrow();
  });
});
