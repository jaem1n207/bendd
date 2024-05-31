import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';

import './globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: siteMetadata.title,
    template: `%s | ${siteMetadata.title}`,
  },
  description: 'Frontend Software Engineer · jaem1n207',
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    type: 'website',
    url: siteMetadata.siteUrl,
    siteName: siteMetadata.title,
    locale: siteMetadata.locale,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteMetadata.language}
      suppressHydrationWarning
      className={cn('bd-bg-background bd-text-foreground', fontSans.variable)}
    >
      <body className="bd-antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="bd-theme"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
