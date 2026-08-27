import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { TableOfContents } from '@/mdx/common/table-of-contents/table-of-contents';

describe('TableOfContents', () => {
  afterEach(() => {
    document.getElementById('BenddDoc')?.remove();
  });

  test('should wire every depth into one shared base and active rail', async () => {
    const documentEl = document.createElement('div');
    documentEl.id = 'BenddDoc';
    documentEl.innerHTML = `
      <h2 id="parent"><a class="header-anchor">Parent</a></h2>
      <h3 id="child"><a class="header-anchor">Child</a></h3>
    `;
    document.body.appendChild(documentEl);

    const { container } = render(<TableOfContents />);
    const nav = container.querySelector('nav');

    await waitFor(() => {
      expect(nav?.querySelectorAll('ul a')).toHaveLength(2);
    });

    expect(
      Array.from(nav?.querySelectorAll<HTMLAnchorElement>('ul a') ?? []).map(
        link => link.dataset.tocDepth
      )
    ).toEqual(['0', '1']);
    expect(nav?.querySelectorAll('[data-toc-rail="base"]')).toHaveLength(1);
    expect(nav?.querySelectorAll('[data-toc-rail="active"]')).toHaveLength(1);
    expect(
      Array.from(nav?.querySelector('ul')?.children ?? []).every(
        child => child instanceof HTMLLIElement
      )
    ).toBe(true);
  });
});
