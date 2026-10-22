import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebMCPTools } from '@/components/webmcp/model/use-webmcp-tools';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => '/playground/shuffle-letters',
  useRouter: () => ({ push }),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme: vi.fn() }) }));
vi.mock('@/components/sound', () => ({
  useSoundStore: (select: (state: unknown) => unknown) =>
    select({ isSoundEnabled: false, setSoundEnabled: vi.fn() }),
}));

function build() {
  return renderHook(() => useWebMCPTools()).result.current();
}

describe('WebMCP action contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    { destination: 'home', extra: true },
    { destination: 'constructor' },
  ])('rejects invalid navigation before side effects', async input => {
    const tool = build().find(tool => tool.name === 'navigate_site')!;
    expect(await tool.execute(input as never, {})).toMatchObject({ ok: false });
    expect(push).not.toHaveBeenCalled();
  });

  it('advertises integer limits', () => {
    const tool = build().find(tool => tool.name === 'find_content')!;
    expect(tool.inputSchema.properties?.limit.type).toBe('integer');
  });

  it('does not expose shuffle without a ready demo', () => {
    expect(build().map(tool => tool.name)).not.toContain('run_shuffle_letters');
  });
});

const fetchIndex = vi.fn(async () => []);
import { createWebMCPActions } from '@/components/webmcp/model/actions';
function actions() {
  return createWebMCPActions({
    pathname: '/',
    router: { push },
    getTheme: () => 'light',
    setTheme: vi.fn(),
    getSoundEnabled: () => false,
    setSoundEnabled: vi.fn(),
    getCurrentHref: () => 'https://bendd.me/',
    document,
    fetchContentIndex: fetchIndex,
  });
}

async function execute(name: string, input: unknown) {
  const tool = actions()
    .getTools()
    .find(tool => tool.name === name)!;
  return tool.execute(input, {});
}

describe('strict action input defaults', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    { query: 'agent', limit: '3' },
    { query: 'agent', limit: 1.5 },
    { query: 'agent', limit: 0 },
    { query: 'agent', limit: 11 },
    { query: 'agent', limit: null },
    { query: 'agent', limit: undefined },
    { query: 'agent', type: 1 },
    { query: 'agent', extra: true },
    [],
    null,
    { query: '   ' },
  ])('rejects invalid search before loading content: %j', async input => {
    expect(await execute('find_content', input)).toMatchObject({
      ok: false,
    });
    expect(fetchIndex).not.toHaveBeenCalled();
  });
  it('applies defaults only to omitted optional fields', async () => {
    expect(await execute('find_content', { query: ' agent ' })).toEqual({
      ok: true,
      items: [],
    });
    expect(fetchIndex).toHaveBeenCalledTimes(1);
  });
  it('rejects extra fields on an empty input contract', async () => {
    expect(await execute('toggle_theme', { unexpected: true })).toMatchObject({
      ok: false,
    });
  });
  it('fails a missing series direction even when the action was exposed', async () => {
    document.body.innerHTML =
      '<a href="/article/series/a" data-webmcp-series-target="series">Series</a>';
    const tools = actions().getTools();
    expect(tools.some(tool => tool.name === 'open_series')).toBe(true);
    const next = tools.find(tool => tool.name === 'open_series')!;
    expect(await next.execute({ target: 'next' }, {})).toMatchObject({
      ok: false,
    });
    expect(push).not.toHaveBeenCalled();
    document.body.innerHTML = '';
  });
});
