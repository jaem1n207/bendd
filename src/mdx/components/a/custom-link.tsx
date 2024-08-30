import { type Route } from 'next';
import Link from 'next/link';

import { ExternalLink } from '@/components/ui/external-link';

export function MDXCustomLink({
  href,
  children,
  ...props
}: {
  href?: Route<''> | string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  if (!href) {
    throw new Error('href is required for CustomLink');
  }

  if (href.startsWith('/')) {
    return (
      <Link href={href as Route<''>} {...props}>
        {props.children}
      </Link>
    );
  }

  return (
    <ExternalLink
      affects="mdx"
      prefixEl={<span className="browser-icon" />}
      href={href}
      {...props}
    >
      {children}
    </ExternalLink>
  );
}
