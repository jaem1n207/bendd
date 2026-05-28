/* eslint-disable playwright/no-standalone-expect */
import { describe, expect, it } from 'vitest';

import { getVisibleTheme } from '@/components/webmcp/model/use-webmcp-tools';

describe('getVisibleTheme', () => {
  it('reads the visible theme from the live html class', () => {
    document.documentElement.classList.remove('dark');
    expect(getVisibleTheme(document)).toBe('light');

    document.documentElement.classList.add('dark');
    expect(getVisibleTheme(document)).toBe('dark');
  });
});
