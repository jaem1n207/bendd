import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Fira_Mono as FontMono } from 'next/font/google';
import localFont from 'next/font/local';

import { WebVitalsTracker } from '@/components/observability';

import { Navigation, PathnameHistoryTracker } from '@/components/navigation';
import {
  BrowserDetector,
  Signature,
  WebMCPProvider,
} from '@/components/root-client-components';
import { ThemeProvider } from '@/components/theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';

import '@/globals.css';

const fontPretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  display: 'swap',
  preload: false,
  weight: '100 900',
  variable: '--font-content-sans',
  fallback: ['system-ui', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
});

const fontInterface = localFont({
  src: './fonts/PretendardInterface.woff2',
  display: 'swap',
  preload: false,
  weight: '100 900',
  variable: '--font-interface-sans',
  adjustFontFallback: false,
});

const fontMono = FontMono({
  subsets: ['latin'],
  display: 'block',
  preload: false,
  variable: '--font-mono',
  weight: ['400', '500', '700'],
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
    canonical: siteMetadata.siteUrl,
    languages: {
      ko: siteMetadata.siteUrl,
      ['x-default']: siteMetadata.siteUrl,
    },
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
    default: siteMetadata.homeTitle,
    template: `%s • ${siteMetadata.title}`,
  },
  description: siteMetadata.description,
  openGraph: {
    type: 'website',
    url: siteMetadata.siteUrl,
    siteName: siteMetadata.homeTitle,
  },
} satisfies Metadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteMetadata.language}
      suppressHydrationWarning
      className={cn(
        'bg-background text-foreground',
        fontPretendard.variable,
        fontInterface.variable,
        fontMono.variable
      )}
      dir="ltr"
    >
      <body className="antialiased">
        <BrowserDetector />
        <PathnameHistoryTracker />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="theme"
          enableSystem
          disableTransitionOnChange
        >
          <WebMCPProvider />
          <TooltipProvider>
            <Signature />
            {children}
            <footer
              aria-labelledby="footer-navigation"
              className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-30 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-end"
            >
              <h2 id="footer-navigation" className="sr-only">
                Footer navigation
              </h2>
              <Navigation />
            </footer>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        <WebVitalsTracker />
      </body>
    </html>
  );
}
