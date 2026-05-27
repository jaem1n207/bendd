import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shuffleMocks = vi.hoisted(() => {
  const stopAnimation = vi.fn();
  return {
    stopAnimation,
    shuffleLetters: vi.fn(() => stopAnimation),
  };
});

vi.mock('@/components/article/lib/shuffle-letters', () => ({
  shuffleLetters: shuffleMocks.shuffleLetters,
}));

import { shuffleLetters } from '@/components/article/lib/shuffle-letters';
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
