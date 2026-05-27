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
});
