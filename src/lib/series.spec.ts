/* eslint-disable playwright/no-standalone-expect */
import { describe, expect, it } from 'vitest';

import { SERIES, getAllSeriesIds, getSeriesConfig } from './series';

describe('series config', () => {
  it('should return config for a valid series id', () => {
    const config = getSeriesConfig('ai-coding-agent');
    expect(config).toBeDefined();
    expect(config?.name).toBe('AI 코딩 에이전트');
    expect(config?.description).toBeTruthy();
  });

  it('should return undefined for an invalid series id', () => {
    const config = getSeriesConfig('nonexistent-series');
    expect(config).toBeUndefined();
  });

  it('should return all series ids', () => {
    const ids = getAllSeriesIds();
    expect(ids).toContain('ai-coding-agent');
    expect(ids.length).toBe(Object.keys(SERIES).length);
  });
});
