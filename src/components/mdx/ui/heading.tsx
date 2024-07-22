import Link from 'next/link';
import { createElement } from 'react';

export function Heading({
  level,
  children,
  ...props
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
> & {
  level: 2 | 3 | 4;
}) {
  const tag = `h${level}`;
  return (
    <Link
      className="bd-font-bold bd-no-underline"
      href={`#${props.id}`}
      tabIndex={-1}
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {createElement(tag, props, children)}
    </Link>
  );
}
