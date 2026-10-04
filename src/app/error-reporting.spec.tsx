import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const capture = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));
vi.mock('@vercel/analytics', () => ({ track }));

import RootError from '@/app/error';
import ArticleError from '@/app/article/error';

describe('오류 수집', () => {
  it.each([
    ['root', RootError],
    ['article', ArticleError],
  ])('%s 오류를 Analytics 대신 Sentry에 전달한다', (boundary, Component) => {
    capture.mockClear();
    track.mockClear();
    const error = Object.assign(new Error('render failed'), {
      digest: 'abc123',
    });
    render(<Component error={error} reset={vi.fn()} />);

    expect(capture).toHaveBeenCalledWith(error, {
      tags: { boundary, digest: 'abc123' },
    });
    expect(track).not.toHaveBeenCalled();
  });
});
