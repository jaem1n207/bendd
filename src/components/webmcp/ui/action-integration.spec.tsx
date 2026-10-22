import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShufflePlayground from '@/app/playground/shuffle-letters/page';
import { MDXShuffleLettersDemo } from '@/mdx/components/shuffle-letters-demo/shuffle-letters-demo';
import { runShuffleDemo, stopShuffleDemo } from '@/components/shuffle';
import { WebMCPRegistration } from '@/components/webmcp/ui/webmcp-registration';
import type { AnyWebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

const adapters = vi.hoisted(() => ({
  router: { push: vi.fn() },
  theme: { setTheme: vi.fn() },
  sound: { isSoundEnabled: false, setSoundEnabled: vi.fn() },
  reportComplete: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/craft/shuffle',
  useRouter: () => adapters.router,
}));
vi.mock('next-themes', () => ({ useTheme: () => adapters.theme }));
vi.mock('@/components/sound', () => ({
  useSoundStore: (select: (state: unknown) => unknown) =>
    select(adapters.sound),
}));
vi.mock('@/components/observability', () => ({
  useDemoCompletion: () => adapters.reportComplete,
}));

const input = { text: 'Agent text', iterations: 4, fps: 12 };
let idle: IdleRequestCallback | undefined;
const registered = new Map<string, AnyWebMCPToolDescriptor>();
function flushIdle() {
  const pending = idle;
  idle = undefined;
  if (!pending) {
    throw new Error('No pending idle registration');
  }
  act(() => pending({} as IdleDeadline));
}
function submit(form: HTMLElement) {
  const respondWith = vi.fn();
  const event = new Event('submit', { bubbles: true, cancelable: true });
  Object.assign(event, { agentInvoked: true, respondWith });
  act(() => {
    form.dispatchEvent(event);
  });
  return respondWith.mock.calls[0][0] as Promise<unknown>;
}

beforeEach(() => {
  registered.clear();
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn(callback => {
      idle = callback;
      return 1;
    })
  );
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  Object.defineProperty(navigator, 'modelContext', {
    configurable: true,
    value: {
      registerTool: (
        tool: AnyWebMCPToolDescriptor,
        options: { signal: AbortSignal }
      ) => {
        registered.set(tool.name, tool);
        options.signal.addEventListener('abort', () =>
          registered.delete(tool.name)
        );
      },
    },
  });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => {
  delete navigator.modelContext;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

enum DemoState {
  Absent,
  Ready,
}
function Surface({ state }: { state: DemoState }) {
  return (
    <>
      <WebMCPRegistration />
      {state === DemoState.Ready && (
        <MDXShuffleLettersDemo
          initialText="Demo"
          initialIterations={15}
          initialFps={40}
        />
      )}
    </>
  );
}

describe('real Shuffle and WebMCP registration', () => {
  it.each([
    ['Craft', MDXShuffleLettersDemo],
    ['Playground', ShufflePlayground],
  ])('%s shares form execution, busy and stop results', async (_name, Demo) => {
    render(
      <>
        <WebMCPRegistration />
        <Demo initialText="Demo" initialIterations={15} initialFps={40} />
      </>
    );
    flushIdle();
    expect(registered.has('run_shuffle_letters')).toBe(false);
    expect(registered.has('stop_shuffle_letters')).toBe(true);
    const list = registered.get('list_page_actions')!;
    expect(await list.execute({} as never, {})).toMatchObject({
      actions: expect.arrayContaining([
        'run_shuffle_letters',
        'stop_shuffle_letters',
      ]),
    });
    const form = screen.getByRole('form', {
      name: 'Shuffle letters playground',
    });
    await expect(submit(form)).resolves.toMatchObject({ ok: true });
    await expect(submit(form)).resolves.toMatchObject({
      ok: false,
      error: expect.any(String),
    });
    const stop = registered.get('stop_shuffle_letters')!;
    let result: unknown;
    act(() => {
      result = stop.execute({} as never, {});
    });
    expect(result).toEqual({ ok: true });
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    act(() => {
      result = stop.execute({} as never, {});
    });
    expect(result).toEqual({ ok: true });
  });

  it('refreshes late readiness and rejects retained tools after unmount', () => {
    const view = render(<Surface state={DemoState.Absent} />);
    flushIdle();
    expect(registered.has('stop_shuffle_letters')).toBe(false);
    view.rerender(<Surface state={DemoState.Ready} />);
    expect(requestIdleCallback).toHaveBeenCalledTimes(2);
    expect(registered.size).toBe(0);
    flushIdle();
    const stop = registered.get('stop_shuffle_letters')!;
    act(() => {
      expect(runShuffleDemo(input)).toEqual({ ok: true, ...input });
    });
    view.rerender(<Surface state={DemoState.Absent} />);
    expect(requestIdleCallback).toHaveBeenCalledTimes(3);
    expect(registered.size).toBe(0);
    flushIdle();
    expect(registered.has('stop_shuffle_letters')).toBe(false);
    expect(stop.execute({} as never, {})).toMatchObject({ ok: false });
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('rejects ambiguous calls but a form still controls its own demo', async () => {
    render(
      <>
        <MDXShuffleLettersDemo
          initialText="Demo"
          initialIterations={15}
          initialFps={40}
        />
        <MDXShuffleLettersDemo
          initialText="Demo"
          initialIterations={15}
          initialFps={40}
        />
      </>
    );
    expect(runShuffleDemo(input)).toMatchObject({
      ok: false,
      error: expect.stringContaining('모호'),
    });
    expect(stopShuffleDemo()).toMatchObject({ ok: false });
    const forms = screen.getAllByRole('form', {
      name: 'Shuffle letters playground',
    });
    await expect(submit(forms[1])).resolves.toMatchObject({ ok: true });
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('reads current DOM number controls and rejects extra or fractional fields', async () => {
    render(<ShufflePlayground />);
    const form = screen.getByRole('form', {
      name: 'Shuffle letters playground',
    });
    const text = screen.getByLabelText('text') as HTMLInputElement;
    text.value = 'DOM-only agent update';
    const iterations = screen.getByLabelText('iterations') as HTMLInputElement;
    iterations.value = '1.5';
    await expect(submit(form)).resolves.toMatchObject({ ok: false });
    iterations.value = '7';
    const extra = document.createElement('input');
    extra.name = 'extra';
    form.appendChild(extra);
    await expect(submit(form)).resolves.toMatchObject({ ok: false });
    extra.remove();
    await expect(submit(form)).resolves.toMatchObject({
      ok: true,
      text: 'DOM-only agent update',
      iterations: 7,
    });
  });
});
