import Link from 'next/link';
import { createElement } from 'react';

import type { HeadingLevel } from '../../toc';

export function MDXHeading({
  level,
  children,
  ...props
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
> & {
  level: HeadingLevel;
}) {
  const tag = `h${level}`;
  return createElement(
    tag,
    { tabIndex: -1, ...props },
    <Link
      className="header-anchor"
      href={`#${props.id}`}
      aria-label={
        typeof children === 'string' ? `Permalink to "${children}"` : undefined
      }
    >
      {children}
    </Link>
  );
}
