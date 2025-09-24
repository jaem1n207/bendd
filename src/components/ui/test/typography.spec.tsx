import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Typography } from '../typography';

describe('Typography component', () => {
  it('should render a p element by default', () => {
    render(<Typography>Hello World</Typography>);
    const element = screen.getByText('Hello World');
    expect(element.tagName).toBe('P');
    expect(element.className).toContain('bd:leading-7');
  });

  it('should render h1 element when variant is h1', () => {
    render(<Typography variant="h1">Hello World</Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H1');
    expect(heading.className).toContain('bd:text-4xl bd:font-extrabold');
  });

  it('should render h2 element when variant is h2', () => {
    render(<Typography variant="h2">Hello World</Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H2');
    expect(heading.className).toContain('bd:text-3xl bd:font-semibold');
  });

  it('should render correct element based on variant', () => {
    const variants = [
      { variant: 'h3', tag: 'H3' },
      { variant: 'h4', tag: 'H4' },
      { variant: 'h5', tag: 'H5' },
      { variant: 'large', tag: 'DIV' },
      { variant: 'small', tag: 'P' },
      { variant: 'muted', tag: 'SPAN' },
      { variant: 'inlineCode', tag: 'CODE' },
      { variant: 'multilineCode', tag: 'PRE' },
      { variant: 'list', tag: 'UL' },
      { variant: 'blockquote', tag: 'BLOCKQUOTE' },
    ] as const;

    variants.forEach(({ variant, tag }) => {
      const { unmount } = render(
        <Typography variant={variant}>Content</Typography>
      );
      const element = screen.getByText('Content');
      expect(element.tagName).toBe(tag);
      unmount();
    });
  });

  it('should apply affects primary variant', () => {
    render(<Typography affects="primary">Hello World</Typography>);
    const element = screen.getByText('Hello World');
    expect(element.className).toContain('bd:text-primary');
  });

  it('should apply affects muted variant', () => {
    render(<Typography affects="muted">Hello World</Typography>);
    const element = screen.getByText('Hello World');
    expect(element.className).toContain('bd:text-muted-foreground');
  });

  it('should apply correct variant classes', () => {
    render(<Typography variant="lead">Hello World</Typography>);
    const element = screen.getByText('Hello World');
    expect(element.tagName).toBe('P');
    expect(element.className).toContain('bd:text-xl bd:text-muted-foreground');
  });

  it('should render as child component with asChild prop', () => {
    render(
      <Typography asChild variant="h1">
        <h2>Hello World</h2>
      </Typography>
    );
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H2');
    expect(heading.className).toContain('bd:text-4xl bd:font-extrabold');
  });

  it('should apply additional class names', () => {
    render(
      <Typography
        variant="h1"
        affects="primary"
        className="custom-class"
      >
        Hello World
      </Typography>
    );
    const heading = screen.getByRole('heading');
    expect(heading.className).toContain('bd:text-4xl bd:font-extrabold');
    expect(heading.className).toContain('bd:text-primary');
    expect(heading.className).toContain('custom-class');
  });

  it('should combine variant and affects classes correctly', () => {
    render(
      <Typography variant="small" affects="primary">
        Hello World
      </Typography>
    );
    const element = screen.getByText('Hello World');
    expect(element.tagName).toBe('P');
    expect(element.className).toContain('bd:text-sm bd:font-medium');
    expect(element.className).toContain('bd:text-primary');
  });

  it('should forward ref to DOM element', () => {
    const ref = createRef<HTMLElement>();
    render(<Typography ref={ref}>Hello World</Typography>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('should forward ref to correct element type based on variant', () => {
    const ref = createRef<HTMLElement>();
    render(<Typography variant="h1" ref={ref}>Hello World</Typography>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('should handle edge cases with empty content', () => {
    render(<Typography variant="h1"></Typography>);
    const heading = screen.getByRole('heading');
    expect(heading.tagName).toBe('H1');
    expect(heading.textContent).toBe('');
  });
});