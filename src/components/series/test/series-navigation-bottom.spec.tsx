import { resolveSeries, SeriesStatus } from '@/lib/series';
import { render, screen } from '@testing-library/react';
import { type Route } from 'next';
import { describe, expect, it } from 'vitest';

import { SeriesNavigationBottom } from '@/components/series';

const defaultProps = {
  id: 'ai-coding-agent',
  name: 'AI 코딩 에이전트',
  description: 'AI 코딩 에이전트를 효과적으로 활용하는 방법을 다루는 시리즈',
  contentType: 'article' as const,
  route: '/article/series/ai-coding-agent' as Route<''>,
  articles: [
    {
      slug: 'fix-compacting-conversation',
      title: 'Compacting 이후 AI 품질 저하 해결 가이드',
      order: 1,
      href: '/article/fix-compacting-conversation' as Route<''>,
      publishedAt: '2026-03-26',
    },
    {
      slug: 'save-tokens-for-ai-agent',
      title: 'AI 에이전트 토큰 절약 실전 가이드',
      order: 2,
      href: '/article/save-tokens-for-ai-agent' as Route<''>,
      publishedAt: '2026-03-26',
    },
  ],
  currentOrder: 1,
};

function navigation(props: typeof defaultProps) {
  const articles = props.articles.map(article => ({
    slug: article.slug,
    metadata: {
      title: article.title,
      publishedAt: article.publishedAt,
      series: props.id,
      seriesOrder: article.order,
    },
  }));
  const result = resolveSeries(articles, {
    id: props.id,
    contentType: props.contentType,
    currentOrder: props.currentOrder,
  });
  if (result.status !== SeriesStatus.Ready) {
    throw new Error('Expected ready series');
  }
  return result.info;
}

describe('SeriesNavigationBottom', () => {
  it('should render series name with suffix', () => {
    render(<SeriesNavigationBottom {...navigation(defaultProps)} />);
    expect(screen.getByText('AI 코딩 에이전트 시리즈')).toBeDefined();
  });

  it('should render all articles in the series', () => {
    render(<SeriesNavigationBottom {...navigation(defaultProps)} />);
    expect(
      screen.getByText('Compacting 이후 AI 품질 저하 해결 가이드')
    ).toBeDefined();
    // Article title appears in both the list and the next nav
    expect(
      screen.getAllByText('AI 에이전트 토큰 절약 실전 가이드').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('should highlight current article and not make it a link', () => {
    render(<SeriesNavigationBottom {...navigation(defaultProps)} />);
    const currentItem = screen.getByText(
      'Compacting 이후 AI 품질 저하 해결 가이드'
    );
    // Current article is a span, not inside a link
    expect(currentItem.closest('a')).toBeNull();
  });

  it('should make non-current articles clickable links', () => {
    render(<SeriesNavigationBottom {...navigation(defaultProps)} />);
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
    render(<SeriesNavigationBottom {...navigation(defaultProps)} />);
    expect(screen.getByText('다음')).toBeDefined();
    expect(screen.queryByText('이전')).toBeNull();
  });

  it('should show prev navigation when on last article', () => {
    render(
      <SeriesNavigationBottom
        {...navigation({ ...defaultProps, currentOrder: 2 })}
      />
    );
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
          publishedAt: '2026-03-27',
        },
      ],
      currentOrder: 2,
    };
    render(<SeriesNavigationBottom {...navigation(threeArticles)} />);
    expect(screen.getByText('이전')).toBeDefined();
    expect(screen.getByText('다음')).toBeDefined();
  });

  it('should link to series index page', () => {
    render(<SeriesNavigationBottom {...navigation(defaultProps)} />);
    const seriesLink = screen.getByText('AI 코딩 에이전트 시리즈');
    const link = seriesLink.closest('a');
    expect(link?.getAttribute('href')).toBe('/article/series/ai-coding-agent');
  });
});
