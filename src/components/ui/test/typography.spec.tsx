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
    expect(heading.className).toContain('bd-text-primary');
  });
  it('should apply the correct size classes', () => {
    render(<Typography variant="h2">Hello World</Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H1');
    expect(heading.className).toContain(
      'bd-scroll-m-20 bd-text-3xl bd-font-semibold bd-tracking-tight md:bd-text-4xl'
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
        className="bd-text-center bd-text-secondary"
      >
        Hello World
      </Typography>
    );
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain(
      'bd-scroll-m-20 bd-text-4xl bd-font-extrabold bd-tracking-tight md:bd-text-5xl bd-text-primary bd-text-center bd-text-secondary'
    );
  });
  it('should forward a ref to the DOM element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<Typography ref={ref}>Hello World</Typography>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});
