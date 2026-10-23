import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';

import { MDXCustomLink } from '@/mdx/components/a/custom-link';
import { MDXCode } from '@/mdx/components/code/code';
import { MDXPre } from '@/mdx/components/pre/pre';

const SHIKI_LANGUAGE_CLASS = 'language-ts';

afterEach(() => {
  vi.restoreAllMocks();
});

test('hydrates without warnings after translation tools mark code as untranslatable', async () => {
  const content = (
    <div>
      <MDXCustomLink href="https://developer.chrome.com/docs/extensions/reference/api/tabs">
        <MDXCode>Ctrl+Tab</MDXCode>
      </MDXCustomLink>
      <MDXPre>
        <MDXCode
          className={SHIKI_LANGUAGE_CLASS}
          data-language="ts"
          style={{ color: 'var(--shiki-dark)' }}
        >
          <span data-line="">tabs.update()</span>
        </MDXCode>
      </MDXPre>
    </div>
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(content);
  document.body.append(container);
  const codes = container.querySelectorAll('code');
  for (const element of container.querySelectorAll('pre, code')) {
    element.classList.add('notranslate');
    element.setAttribute('translate', 'no');
  }
  const errors = vi.spyOn(console, 'error');
  const onRecoverableError = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;

  try {
    await act(async () => {
      root = hydrateRoot(container, content, { onRecoverableError });
    });

    expect(errors).not.toHaveBeenCalled();
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('a code')).toBe(codes[0]);
    expect(codes[0].textContent).toBe('Ctrl+Tab');
    expect(codes[1].classList.contains('language-ts')).toBe(true);
    expect(codes[1].getAttribute('data-language')).toBe('ts');
    expect(codes[1].style.color).toBe('var(--shiki-dark)');
    expect(codes[1].querySelector('[data-line]')?.textContent).toBe(
      'tabs.update()'
    );
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});
