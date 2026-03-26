import { render, screen } from '@testing-library/react';
import { type Route } from 'next';
import { describe, expect, it } from 'vitest';

import { SeriesNavigationTop } from '../ui/series-navigation-top';

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

describe('SeriesNavigationTop', () => {
  it('should render series name', () => {
    render(<SeriesNavigationTop {...defaultProps} />);
    expect(screen.getByText('AI 코딩 에이전트')).toBeDefined();
  });

  it('should display current position out of total', () => {
    render(<SeriesNavigationTop {...defaultProps} />);
    expect(screen.getByText('(1/2)')).toBeDefined();
  });

  it('should link to series index page', () => {
    render(<SeriesNavigationTop {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/article/series/ai-coding-agent');
  });

  it('should show correct position for second article', () => {
    render(<SeriesNavigationTop {...defaultProps} currentOrder={2} />);
    expect(screen.getByText('(2/2)')).toBeDefined();
  });
});
