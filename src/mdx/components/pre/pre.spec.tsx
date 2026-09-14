import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { MDXPre } from '@/mdx/components/pre/pre';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('updates the code fade after resizing and preserves Shiki classes', () => {
  let onResize = () => {};
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        onResize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  const width = vi
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(300);

  render(
    <MDXPre data-testid="code-block" className="has-focused-lines">
      <code>const theme = useThemeStore(state =&gt; state.theme);</code>
    </MDXPre>
  );
  const pre = screen.getByTestId('code-block');
  expect(pre.dataset.scrollFadeOverflow).toBe('true');
  expect(pre.classList.contains('scroll-fade-x')).toBe(true);
  expect(pre.classList.contains('has-focused-lines')).toBe(true);

  width.mockReturnValue(400);
  onResize();
  expect(pre.dataset.scrollFadeOverflow).toBe('false');
});

test('copies the complete code from outside the masked scroller', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const source = 'const theme = "dark";\nconst enabled = true;';
  render(
    <MDXPre data-testid="code-block">
      <code>{source}</code>
    </MDXPre>
  );
  const copy = screen.getByRole('button', { name: 'Copy' });
  expect(screen.getByTestId('code-block').contains(copy)).toBe(false);

  fireEvent.click(copy);
  expect(writeText).toHaveBeenCalledWith(source);
});
