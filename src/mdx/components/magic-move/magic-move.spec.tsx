import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MDXMagicMove } from '@/mdx/components/magic-move/magic-move';

const preferences = vi.hoisted(() => ({ reducedMotion: false }));
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
  ShikiMagicMove: ({ code }: { code: string }) => (
    <pre data-testid="animated-code">{code}</pre>
  ),
}));
vi.mock('@/mdx/common/copy-to-clipboard/copy-to-clipboard', () => ({
  CopyToClipboard: () => null,
}));

const snippets = [1, 2, 3].map(step => ({
  title: `단계 ${step}`,
  description: `설명 ${step}`,
  content: `const step = ${step};`,
}));

function nextStep() {
  fireEvent.click(screen.getByRole('button', { name: '다음 단계' }));
}

function finishSlide(step: number) {
  const panel = screen.getByText(`설명 ${step}`).parentElement;
  if (!panel) {
    throw new Error('설명 패널이 없습니다.');
  }
  fireEvent.animationEnd(panel);
}

describe('MagicMove step transitions', () => {
  beforeEach(() => {
    preferences.reducedMotion = false;
  });

  it('starts code updates after the description slide, ignoring descendant events', () => {
    render(<MDXMagicMove codeSnippets={snippets} lang="typescript" />);
    nextStep();
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    fireEvent.animationEnd(screen.getByText('설명 2'));
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[0].content
    );
    finishSlide(2);
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
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
    expect(screen.getByTestId('animated-code').textContent).toBe(
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
    expect(screen.getByTestId('animated-code').textContent).toBe(
      snippets[1].content
    );
  });
});
