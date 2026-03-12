import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Typography } from '../typography';

describe('typography component', () => {
  it('should render a h1 element by default', () => {
    render(<Typography>Hello World</Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H1');
  });
  it('should apply the correct variant classes', () => {
    render(<Typography affects="primary">Hello World</Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain('text-primary');
  });
  it('should apply the correct size classes', () => {
    render(<Typography variant="h2">Hello World</Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H1');
    expect(heading.className).toContain(
      'scroll-m-20 text-3xl font-semibold tracking-tight md:text-4xl'
    );
  });
  it('should render as a child component with a custom tag', () => {
    render(
      <Typography asChild variant="h2">
        <h2>Hello World</h2>
      </Typography>
    );
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H2');
  });
  it('should apply additional class names', () => {
    render(
      <Typography
        variant="h1"
        affects="primary"
        className="text-center text-secondary"
      >
        Hello World
      </Typography>
    );
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain(
      'scroll-m-20 text-4xl font-extrabold tracking-tight md:text-5xl text-primary text-center text-secondary'
    );
  });
  it('should forward a ref to the DOM element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<Typography ref={ref}>Hello World</Typography>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});
