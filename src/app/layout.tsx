import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Fira_Mono as FontMono, Inter as FontSans } from 'next/font/google';
import localFont from 'next/font/local';
import { headers } from 'next/headers';

import { Navigation } from '@/components/navigation';
import { ThemeProvider } from '@/components/theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { siteMetadata } from '@/lib/site-metadata';
import { getBrowserInfo, type PlatformHint } from '@/lib/user-agent';
import { cn } from '@/lib/utils';

import '../globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const fontMono = FontMono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '700'],
});

const fontTmoney = localFont({
  variable: '--font-tmoney',
  src: [
    {
      path: '../assets/TmoneyRoundWindRegular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/TmoneyRoundWindExtraBold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
});

export const metadata = {
  metadataBase: new URL(
    process.env.VERCEL_ENV === 'production'
      ? siteMetadata.siteUrl
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:${process.env.PORT || 3000}`
  ),
  alternates: {
    types: {
      ['application/rss+xml']: [
        {
          title: `${siteMetadata.title} RSS feed`,
          url: '/rss.xml',
        },
      ],
      ['application/xml']: [
        {
          title: 'sitemap',
          url: '/sitemap.xml',
        },
      ],
    },
  },
  title: {
    default: siteMetadata.title,
    template: `%s • ${siteMetadata.title}`,
  },
  description: siteMetadata.description,
  openGraph: {
    type: 'website',
    url: siteMetadata.siteUrl,
    siteName: siteMetadata.title,
  },
} satisfies Metadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const userAgent = headersList.get('user-agent');
  const browser = getBrowserInfo(userAgent);
  const platformHint = headersList.get('Sec-CH-UA-Platform');
  const platform = (platformHint?.replace(/"/g, '') ||
    'Unknown') as PlatformHint;

  return (
    <html
      lang={siteMetadata.language}
      suppressHydrationWarning
      className={cn(
        'bd-bg-background bd-text-foreground',
        fontSans.variable,
        fontMono.variable,
        fontTmoney.variable,
        `platform-${platform}`,
        `browser-${browser}`
      )}
      dir="ltr"
    >
      <body className="bd-antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="bd-theme"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <footer
              aria-labelledby="footer-navigation"
              className="bd-fixed -bd-bottom-2 bd-left-1/2 bd-z-10 bd-flex bd-h-14 bd-w-4/5 -bd-translate-x-1/2 -bd-translate-y-1/2 bd-transform bd-items-end bd-rounded-full bd-border bd-border-solid bd-border-input bd-bg-gray-100 bd-px-2 bd-shadow-sm bd-shadow-secondary xs:bd-w-auto"
            >
              <h2 id="footer-navigation" className="bd-sr-only">
                Footer navigation
              </h2>
              <Navigation />
            </footer>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
