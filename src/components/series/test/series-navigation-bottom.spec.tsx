import { render, screen } from '@testing-library/react';
import { type Route } from 'next';
import { describe, expect, it } from 'vitest';

import { SeriesNavigationBottom } from '../ui/series-navigation-bottom';

const defaultProps = {
  id: 'ai-coding-agent',
  name: 'AI 코딩 에이전트',
  description: 'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
  articles: [
    {
      slug: 'fix-compacting-conversation',
      title: 'Compacting 이후 AI 품질 저하 해결 가이드',
      order: 1,
      href: '/article/fix-compacting-conversation' as Route<''>,
    },
    {
      slug: 'save-tokens-for-ai-agent',
      title: 'AI 에이전트 토큰 절약 실전 가이드',
      order: 2,
      href: '/article/save-tokens-for-ai-agent' as Route<''>,
    },
  ],
  currentOrder: 1,
};

describe('SeriesNavigationBottom', () => {
  it('should render series name with suffix', () => {
    render(<SeriesNavigationBottom {...defaultProps} />);
    expect(screen.getByText('AI 코딩 에이전트 시리즈')).toBeDefined();
  });

  it('should render all articles in the series', () => {
    render(<SeriesNavigationBottom {...defaultProps} />);
    expect(
      screen.getByText('Compacting 이후 AI 품질 저하 해결 가이드')
    ).toBeDefined();
    // Article title appears in both the list and the next nav
    expect(
      screen.getAllByText('AI 에이전트 토큰 절약 실전 가이드').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('should highlight current article and not make it a link', () => {
    render(<SeriesNavigationBottom {...defaultProps} />);
    const currentItem = screen.getByText(
      'Compacting 이후 AI 품질 저하 해결 가이드'
    );
    // Current article is a span, not inside a link
    expect(currentItem.closest('a')).toBeNull();
  });

  it('should make non-current articles clickable links', () => {
    render(<SeriesNavigationBottom {...defaultProps} />);
    const otherArticles = screen.getAllByText(
      'AI 에이전트 토큰 절약 실전 가이드'
    );
    // The first one is in the list (wrapped in a link)
    const listLink = otherArticles[0].closest('a');
    expect(listLink).not.toBeNull();
    expect(listLink?.getAttribute('href')).toBe(
      '/article/save-tokens-for-ai-agent'
    );
  });

  it('should show next navigation when on first article', () => {
    render(<SeriesNavigationBottom {...defaultProps} />);
    expect(screen.getByText('다음')).toBeDefined();
    expect(screen.queryByText('이전')).toBeNull();
  });

  it('should show prev navigation when on last article', () => {
    render(<SeriesNavigationBottom {...defaultProps} currentOrder={2} />);
    expect(screen.getByText('이전')).toBeDefined();
    expect(screen.queryByText('다음')).toBeNull();
  });

  it('should show both prev and next when in the middle', () => {
    const threeArticles = {
      ...defaultProps,
      articles: [
        ...defaultProps.articles,
        {
          slug: 'third-article',
          title: '세 번째 글',
          order: 3,
          href: '/article/third-article' as Route<''>,
        },
      ],
      currentOrder: 2,
    };
    render(<SeriesNavigationBottom {...threeArticles} />);
    expect(screen.getByText('이전')).toBeDefined();
    expect(screen.getByText('다음')).toBeDefined();
  });

  it('should link to series index page', () => {
    render(<SeriesNavigationBottom {...defaultProps} />);
    const seriesLink = screen.getByText('AI 코딩 에이전트 시리즈');
    const link = seriesLink.closest('a');
    expect(link?.getAttribute('href')).toBe(
      '/article/series/ai-coding-agent'
    );
  });
});
