import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shuffleMocks = vi.hoisted(() => {
  const stopAnimation = vi.fn();
  return {
    stopAnimation,
    shuffleLetters: vi.fn(() => stopAnimation),
  };
});

vi.mock('@/lib/shuffle-letters', () => ({
  shuffleLetters: shuffleMocks.shuffleLetters,
}));

const reportComplete = vi.hoisted(() => vi.fn());
vi.mock('@/components/observability', () => ({
  useDemoCompletion: () => reportComplete,
}));
import { shuffleLetters } from '@/lib/shuffle-letters';
import { MDXShuffleLettersDemo } from '@/mdx/components/shuffle-letters-demo/shuffle-letters-demo';

function renderShuffleLettersDemo() {
  return render(
    <MDXShuffleLettersDemo
      initialText="한글 English 123 @#$%"
      initialIterations={15}
      initialFps={40}
    />
  );
}

function submitFormAsAgent() {
  const form = screen.getByRole('form', {
    name: 'Shuffle letters playground',
  });
  const respondWith = vi.fn();
  const event = new Event('submit', {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperties(event, {
    agentInvoked: {
      value: true,
    },
    respondWith: {
      value: respondWith,
    },
  });

  act(() => {
    form.dispatchEvent(event);
  });

  return respondWith;
}

describe('MDXShuffleLettersDemo WebMCP integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes declarative WebMCP form annotations', () => {
    renderShuffleLettersDemo();

    const form = screen.getByRole('form', {
      name: 'Shuffle letters playground',
    });

    expect(form.getAttribute('toolname')).toBe('run_shuffle_letters');
    expect(form.hasAttribute('toolautosubmit')).toBe(true);
    expect(form.getAttribute('tooldescription')).toBe(
      'Runs the shuffle letters animation with visible form values.'
    );
    expect(screen.getByLabelText('텍스트').getAttribute('name')).toBe('text');
    expect(
      screen.getByLabelText('텍스트').getAttribute('toolparamdescription')
    ).toBe('Text to animate with the shuffle letters effect.');
    expect(
      screen.getByLabelText('iterations (1-50)').getAttribute('name')
    ).toBe('iterations');
    expect(
      screen
        .getByLabelText('iterations (1-50)')
        .getAttribute('toolparamdescription')
    ).toBe(
      'Number of random character replacements per letter. Use 1 through 50.'
    );
    expect(screen.getByLabelText('fps (1-60)').getAttribute('name')).toBe(
      'fps'
    );
    expect(
      screen.getByLabelText('fps (1-60)').getAttribute('toolparamdescription')
    ).toBe('Animation frames per second. Use 1 through 60.');
  });

  it('완료 callback에서만 참여 이벤트를 보고한다', () => {
    renderShuffleLettersDemo();
    fireEvent.submit(
      screen.getByRole('form', { name: 'Shuffle letters playground' })
    );
    expect(reportComplete).not.toHaveBeenCalled();
    const options = vi.mocked(shuffleLetters).mock.calls[0][1];
    const element = vi.mocked(shuffleLetters).mock.calls[0][0];
    act(() => options?.onComplete?.(element));
    expect(reportComplete).toHaveBeenCalledWith();
    expect(reportComplete).toHaveBeenCalledTimes(1);
  });

  it('runs visible animation when the WebMCP custom event is dispatched', () => {
    renderShuffleLettersDemo();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('webmcp:run-shuffle-letters', {
          detail: {
            text: 'Agent text',
            iterations: 9,
            fps: 24,
          },
        })
      );
    });

    expect(screen.getByDisplayValue('Agent text')).toBeDefined();
    expect(shuffleLetters).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        iterations: 9,
        fps: 24,
      })
    );
  });

  it('responds with sanitized values when an agent submits the form', async () => {
    renderShuffleLettersDemo();

    fireEvent.change(screen.getByLabelText('텍스트'), {
      target: { value: 'Agent submit text' },
    });
    fireEvent.change(screen.getByLabelText('iterations (1-50)'), {
      target: { value: '9' },
    });
    fireEvent.change(screen.getByLabelText('fps (1-60)'), {
      target: { value: '24' },
    });

    const respondWith = submitFormAsAgent();

    expect(respondWith).toHaveBeenCalledTimes(1);
    await expect(respondWith.mock.calls[0][0]).resolves.toEqual({
      ok: true,
      text: 'Agent submit text',
      iterations: 9,
      fps: 24,
    });
    expect(screen.getByDisplayValue('Agent submit text')).toBeDefined();
    expect(shuffleLetters).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        iterations: 9,
        fps: 24,
      })
    );
  });

  it('responds with a failure and does not animate invalid agent submits', async () => {
    renderShuffleLettersDemo();

    fireEvent.change(screen.getByLabelText('텍스트'), {
      target: { value: '   ' },
    });

    const respondWith = submitFormAsAgent();

    expect(respondWith).toHaveBeenCalledTimes(1);
    await expect(respondWith.mock.calls[0][0]).resolves.toEqual({
      ok: false,
      error: 'text, iterations, fps 값이 올바르지 않습니다.',
    });
    expect(shuffleLetters).not.toHaveBeenCalled();
    expect((screen.getByLabelText('텍스트') as HTMLInputElement).value).toBe(
      '   '
    );
  });

  it('stops animation when the WebMCP stop event is dispatched', () => {
    renderShuffleLettersDemo();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('webmcp:run-shuffle-letters', {
          detail: {
            text: 'Stop me',
            iterations: 4,
            fps: 12,
          },
        })
      );
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('webmcp:stop-shuffle-letters'));
    });

    expect(shuffleMocks.stopAnimation).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate run events while an animation is active', () => {
    renderShuffleLettersDemo();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('webmcp:run-shuffle-letters', {
          detail: {
            text: 'First run',
            iterations: 4,
            fps: 12,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('webmcp:run-shuffle-letters', {
          detail: {
            text: 'Second run',
            iterations: 5,
            fps: 20,
          },
        })
      );
    });

    expect(shuffleLetters).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('First run')).toBeDefined();
  });

  it.each([
    ['missing detail', undefined],
    ['empty text', { text: '   ', iterations: 4, fps: 12 }],
    ['low iterations', { text: 'Invalid', iterations: 0, fps: 12 }],
    ['high fps', { text: 'Invalid', iterations: 4, fps: 61 }],
    ['NaN iterations', { text: 'Invalid', iterations: Number.NaN, fps: 12 }],
    ['wrong text type', { text: 123, iterations: 4, fps: 12 }],
    ['wrong iterations type', { text: 'Invalid', iterations: '4', fps: 12 }],
    ['wrong fps type', { text: 'Invalid', iterations: 4, fps: '12' }],
  ])('ignores invalid WebMCP run payloads: %s', (_caseName, detail) => {
    renderShuffleLettersDemo();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('webmcp:run-shuffle-letters', {
          detail,
        })
      );
    });

    expect(shuffleLetters).not.toHaveBeenCalled();
  });

  it('keeps agent text visible when run and stop are dispatched together', () => {
    renderShuffleLettersDemo();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('webmcp:run-shuffle-letters', {
          detail: {
            text: 'Agent text survives stop',
            iterations: 4,
            fps: 12,
          },
        })
      );
      window.dispatchEvent(new CustomEvent('webmcp:stop-shuffle-letters'));
    });

    expect(screen.getByText('Agent text survives stop')).toBeDefined();
  });
});
