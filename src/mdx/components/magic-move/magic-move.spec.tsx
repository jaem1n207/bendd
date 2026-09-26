import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { codeToKeyedTokens, type KeyedTokensInfo } from 'shiki-magic-move/core';
import { ShikiMagicMove, ShikiMagicMoveRenderer } from 'shiki-magic-move/react';

import { MDXMagicMove } from '@/mdx/components/magic-move/magic-move';

const preferences = vi.hoisted(() => {
  const state: { reducedMotion: boolean | undefined; copied: string } = {
    reducedMotion: false,
    copied: '',
  };
  return state;
});
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => preferences.reducedMotion,
}));
vi.mock('@/mdx/components/magic-move/use-highlighter', () => ({
  useHighlighter: () => ({}),
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));
vi.mock('shiki-magic-move/react', () => ({
  ShikiMagicMove: ({
    code,
    options,
  }: ComponentProps<typeof ShikiMagicMove>) => (
    <pre
      data-testid="animated-code"
      data-duration={options?.duration}
      data-stagger={options?.stagger}
    >
      {code}
    </pre>
  ),
  ShikiMagicMoveRenderer: ({
    tokens,
    animate,
    options,
  }: ComponentProps<typeof ShikiMagicMoveRenderer>) => (
    <pre
      data-testid="static-code"
      data-animate={String(animate)}
      data-duration={options?.duration}
      data-stagger={options?.stagger}
      data-lines={String(tokens.lineNumbers)}
    >
      {tokens.code}
    </pre>
  ),
}));
vi.mock('shiki-magic-move/core', () => ({
  codeToKeyedTokens: vi.fn(
    (
      _highlighter: unknown,
      code: string,
      options: { lang: string; theme: string },
      lineNumbers: boolean
    ): KeyedTokensInfo => ({
      code,
      hash: code,
      lang: options.lang,
      themeName: options.theme,
      lineNumbers,
      tokens: [{ key: code, content: code, offset: 0 }],
    })
  ),
}));
vi.mock('@/mdx/common/copy-to-clipboard/copy-to-clipboard', () => ({
  CopyToClipboard: ({ getValue }: { getValue: () => string }) => (
    <button
      onClick={() => {
        preferences.copied = getValue();
      }}
    >
      Copy
    </button>
  ),
}));

const snippets = [1, 2, 3].map(step => ({
  title: `단계 ${step}`,
  description: `설명 ${step}`,
  content: `const step = ${step};`,
}));

function nextStep() {
  fireEvent.click(screen.getByRole('button', { name: '다음 단계' }));
}

function endTransform(element: Element) {
  fireEvent(
    element,
    Object.assign(new Event('transitionend', { bubbles: true }), {
      propertyName: 'transform',
    })
  );
}

function finishSlide(step: number) {
  const panel = screen.getByText(`설명 ${step}`).parentElement;
  if (!panel) {
    throw new Error('설명 패널이 없습니다.');
  }
  endTransform(panel);
}

const originalAnimations = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'getAnimations'
);

describe('MagicMove step transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferences.reducedMotion = false;
    preferences.copied = '';
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [{ transitionProperty: 'transform' }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalAnimations) {
      Object.defineProperty(
        HTMLElement.prototype,
        'getAnimations',
        originalAnimations
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
    }
  });

  it('removes the code fade when resized content fits', () => {
    let onResize = () => {};
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: () => void) {}
        observe(element: HTMLElement) {
          if (element.classList.contains('scroll-fade-x')) {
            onResize = this.callback;
          }
        }
        disconnect() {}
      }
    );
    const width = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(300);

    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    const scroller = screen.getByTestId('animated-code').parentElement;
    expect(scroller?.dataset.scrollFadeOverflow).toBe('true');

    width.mockReturnValue(400);
    onResize();
    expect(scroller?.dataset.scrollFadeOverflow).toBe('false');
  });

  it('starts code updates after the description slide, ignoring descendant events', () => {
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    nextStep();
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    endTransform(screen.getByText('설명 2'));
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    finishSlide(2);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
  });

  it('observes the replacement code when the motion preference changes', () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {}
      }
    );
    const { rerender } = render(
      <MDXMagicMove codeSnippets={snippets} lang="typescript" />
    );
    preferences.reducedMotion = true;
    rerender(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    expect(observed).toContain(screen.getByTestId('static-code'));
  });

  it('only displays the latest step after rapid forward and backward navigation', () => {
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    nextStep();
    nextStep();
    fireEvent.click(screen.getByRole('button', { name: '이전 단계' }));
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    finishSlide(3);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    finishSlide(2);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
  });

  it('updates immediately when reduced motion disables the slide', () => {
    preferences.reducedMotion = true;
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    nextStep();
    expect(screen.getByTestId('static-code').textContent).toBe(
      snippets[1].content
    );
  });

  it('settles a pending step when reduced motion is enabled mid-slide', () => {
    const { rerender } = render(
      <MDXMagicMove codeSnippets={snippets} lang="typescript" />
    );
    nextStep();
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    preferences.reducedMotion = true;
    rerender(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    expect(screen.getByTestId('static-code').textContent).toBe(
      snippets[1].content
    );
  });
  it('updates keyboard selection immediately and restores pointer animation', () => {
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    const next = screen.getByRole('button', { name: '다음 단계' });
    fireEvent.keyDown(next, { key: 'Enter' });
    fireEvent.click(next);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
    fireEvent.pointerDown(next);
    fireEvent.click(next);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
    finishSlide(3);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[2].content
    );
  });
  it('settles immediately when no transform transition was created', () => {
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    nextStep();
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
  });
  it.each([true, undefined])(
    'uses static highlighted tokens for preference %s',
    preference => {
      preferences.reducedMotion = preference;
      render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
      const code = screen.getByTestId('static-code');
      expect(code.textContent).toBe(snippets[0].content);
      expect(code.dataset).toMatchObject({
        animate: 'false',
        duration: '0',
        stagger: '0',
        lines: 'true',
      });
      expect(codeToKeyedTokens).toHaveBeenCalledWith(
        expect.anything(),
        snippets[0].content,
        { lang: 'typescript', theme: 'github-light' },
        true
      );
      expect(screen.queryByTestId('animated-code')).toBeNull();
    }
  );

  it('keeps normal timing without calculating static tokens', () => {
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    expect(screen.getByTestId('animated-code').dataset).toMatchObject({
      duration: '750',
      stagger: '3',
    });
    expect(codeToKeyedTokens).not.toHaveBeenCalled();
  });

  it('replaces active tokens while preserving the copy control and current code', () => {
    const { rerender } = render(
      <MDXMagicMove codeSnippets={snippets} lang="typescript" />
    );
    nextStep();
    finishSlide(2);
    const copy = screen.getByRole('button', { name: 'Copy' });
    copy.focus();
    preferences.reducedMotion = true;
    rerender(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    expect(screen.queryByTestId('animated-code')).toBeNull();
    expect(screen.getByTestId('static-code').textContent).toBe(
      snippets[1].content
    );
    expect(screen.getByRole('button', { name: 'Copy' })).toBe(copy);
    expect(document.activeElement).toBe(copy);
    fireEvent.click(copy);
    expect(preferences.copied).toBe(snippets[1].content);
  });
});
