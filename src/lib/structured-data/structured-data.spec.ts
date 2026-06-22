/* eslint-disable playwright/no-standalone-expect */
import { describe, expect, it } from 'vitest';

import {
  absoluteUrl,
  blogId,
  blogPostingId,
  breadcrumbId,
  personId,
  softwareApplicationId,
  webpageId,
  websiteId,
} from './ids';

describe('structured data ID helpers', () => {
  it('creates stable absolute URLs and schema node IDs', () => {
    expect(absoluteUrl('/article')).toBe('https://bendd.me/article');
    expect(absoluteUrl('craft/demo')).toBe('https://bendd.me/craft/demo');
    expect(websiteId()).toBe('https://bendd.me/#website');
    expect(personId()).toBe('https://bendd.me/#person');
    expect(blogId()).toBe('https://bendd.me/article#blog');
    expect(webpageId('/article')).toBe('https://bendd.me/article#webpage');
    expect(webpageId('/')).toBe('https://bendd.me/#webpage');
    expect(breadcrumbId('/article')).toBe(
      'https://bendd.me/article#breadcrumb'
    );
    expect(breadcrumbId('/')).toBe('https://bendd.me/#breadcrumb');
    expect(softwareApplicationId('sync-tabs')).toBe(
      'https://bendd.me/#software-sync-tabs'
    );
    expect(blogPostingId('/article/foo')).toBe(
      'https://bendd.me/article/foo#blogposting'
    );
  });
});
