import Link from 'next/link';

import { ExternalLink } from '@/components/ui/external-link';

export function MDXCustomLink({
  href,
  children,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  if (!href) {
    throw new Error('href is required for CustomLink');
  }

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    );
  }

  return (
    <ExternalLink
      prefixEl={<span className="browser-icon" />}
      href={href}
      {...props}
    >
      {children}
    </ExternalLink>
  );
}
