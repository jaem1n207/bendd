import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';
import { Title } from '../typography';

describe('typography component', () => {
  it('should render a h1 element by default', () => {
    render(<Title>Hello World</Title>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H1');
  });
  it('should apply the correct variant classes', () => {
    render(<Title variant="primary">Hello World</Title>);
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain('bd-text-primary');
  });
  it('should apply the correct size classes', () => {
    render(<Title size="h2">Hello World</Title>);
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain(
      'bd-tracking-tight bd-font-semibold bd-text-3xl md:bd-text-4xl'
    );
  });
  it('should render as a child component with a custom tag', () => {
    render(
      <Title asChild size="h2">
        <h2>Hello World</h2>
      </Title>
    );
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H2');
  });
  it('should apply additional class names', () => {
    render(
      <Title
        variant="primary"
        size="h1"
        className="bd-text-center bd-text-secondary"
      >
        Hello World
      </Title>
    );
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain(
      cn(
        'bd-text-primary',
        'bd-tracking-tight bd-font-extrabold bd-text-4xl md:bd-text-5xl',
        'bd-text-center bd-text-secondary'
      )
    );
  });
  it('should forward a ref to the DOM element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<Title ref={ref}>Hello World</Title>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});
