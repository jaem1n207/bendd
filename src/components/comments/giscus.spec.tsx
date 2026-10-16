import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Giscus } from '@/components/comments/giscus';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test.each(['property', 'getItem', 'setItem', 'removeItem'] as const)(
  'shows an explanation without loading Giscus when localStorage %s access is denied',
  operation => {
    const deny = () => {
      throw new DOMException('Storage access denied', 'SecurityError');
    };
    if (operation === 'property') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(deny);
    } else {
      vi.spyOn(Storage.prototype, operation).mockImplementation(deny);
    }

    const { container } = render(<Giscus />);

    expect(screen.getByRole('status').textContent).toContain('댓글');
    expect(container.querySelector('script')).toBeNull();
  }
);

test('loads Giscus once and preserves saved values when storage is available', () => {
  localStorage.setItem('giscus-session', JSON.stringify('saved-session'));
  localStorage.setItem('unrelated-preference', 'keep');
  const { container, rerender } = render(
    <StrictMode>
      <Giscus />
    </StrictMode>
  );

  rerender(
    <StrictMode>
      <Giscus />
    </StrictMode>
  );

  const scripts = container.querySelectorAll('script');
  expect(scripts).toHaveLength(1);
  expect(scripts[0].src).toBe('https://giscus.app/client.js');
  expect(screen.queryByRole('status')).toBeNull();
  expect(localStorage.getItem('giscus-session')).toBe(
    JSON.stringify('saved-session')
  );
  expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  expect(localStorage.length).toBe(2);
});
