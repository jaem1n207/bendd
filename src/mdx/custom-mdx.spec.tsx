import { renderToReadableStream } from 'react-dom/server';
import { expect, test } from 'vitest';

import { CustomMDX } from '@/mdx/custom-mdx';

test('protects inline code, linked code and fenced blocks from translation', async () => {
  const content = await CustomMDX({
    source:
      '`Ctrl+Tab`으로 전환하고 [`tabs.update`](https://developer.chrome.com/docs/extensions/reference/api/tabs)를 호출해요.\n\n```ts\ntabs.update({ active: true });\n```',
  });
  const stream = await renderToReadableStream(content);
  const html = await new Response(stream).text();
  const document = new DOMParser().parseFromString(html, 'text/html');
  const codes = document.querySelectorAll('code');

  expect(codes).toHaveLength(3);
  for (const code of codes) {
    expect(code.getAttribute('translate')).toBe('no');
    expect(code.classList.contains('notranslate')).toBe(true);
  }
  expect(document.querySelector('a code')?.textContent).toBe('tabs.update');
  const pre = document.querySelector('pre');
  expect(pre?.getAttribute('translate')).toBe('no');
  expect(pre?.classList.contains('notranslate')).toBe(true);
});
