import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WebMCPProvider } from '@/components/webmcp/ui/webmcp-provider';

vi.mock('@/components/webmcp/ui/webmcp-registration', () => ({
  WebMCPRegistration: () => <div data-testid="webmcp-registration" />,
}));

describe('WebMCP capability loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not mount the tools in an unsupported browser', () => {
    vi.stubGlobal('navigator', {});
    render(<WebMCPProvider />);
    expect(screen.queryByTestId('webmcp-registration')).toBeNull();
  });

  it('loads registration when the browser supports WebMCP', async () => {
    vi.stubGlobal('navigator', { modelContext: { registerTool: vi.fn() } });
    render(<WebMCPProvider />);
    expect(await screen.findByTestId('webmcp-registration')).toBeDefined();
  });
});
