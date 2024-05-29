import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import './globals.css';
import { host } from './sitemap';

const fontSans = FontSans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(host),
  title: {
    default: 'Bendd',
    template: '%s | Bendd',
  },
  description: 'Frontend Software Engineer · jaem1n207',
  openGraph: {
    title: 'Bendd',
    description: 'Frontend Software Engineer · jaem1n207',
    type: 'website',
    url: host,
    siteName: 'Bendd',
    locale: 'ko_KR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
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
