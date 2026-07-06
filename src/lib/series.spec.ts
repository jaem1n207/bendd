/* eslint-disable playwright/no-standalone-expect */
import { describe, expect, it } from 'vitest';

import {
  SERIES,
  getAllSeriesIds,
  getSeriesConfig,
  seriesRoute,
} from '@/lib/series';

describe('series config', () => {
  it('should return config for a valid series id', () => {
    const config = getSeriesConfig('ai-coding-agent');
    expect(config).toBeDefined();
    expect(config?.name).toBe('AI 코딩 에이전트');
    expect(config?.description).toBeTruthy();
    expect(config?.contentType).toBe('article');
  });

  it('should return config for a craft series id', () => {
    const config = getSeriesConfig('synchronize-tab-scrolling');
    expect(config).toBeDefined();
    expect(config?.contentType).toBe('craft');
  });

  it('should return undefined for an invalid series id', () => {
    const config = getSeriesConfig('nonexistent-series');
    expect(config).toBeUndefined();
  });

  it('should return all series ids', () => {
    const ids = getAllSeriesIds();
    expect(ids).toContain('ai-coding-agent');
    expect(ids).toContain('synchronize-tab-scrolling');
    expect(ids.length).toBe(Object.keys(SERIES).length);
  });

  it('should filter series ids by content type', () => {
    expect(getAllSeriesIds('article')).toEqual(['ai-coding-agent']);
    expect(getAllSeriesIds('craft')).toEqual(['synchronize-tab-scrolling']);
  });

  it('should create series routes by content type', () => {
    expect(seriesRoute('ai-coding-agent')).toBe(
      '/article/series/ai-coding-agent'
    );
    expect(seriesRoute('synchronize-tab-scrolling')).toBe(
      '/craft/series/synchronize-tab-scrolling'
    );
  });
});
