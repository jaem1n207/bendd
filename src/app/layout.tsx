import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Fira_Mono as FontMono, Inter as FontSans } from 'next/font/google';

import { Navigation } from '@/components/navigation';
import { ThemeProvider } from '@/components/theme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { siteMetadata } from '@/lib/site-metadata';
import { cn } from '@/lib/utils';

import '../globals.css';
import '../theme-switch-effect.css';

const Signature = dynamic(
  () => import('../components/signature').then(mod => mod.Signature),
  {
    ssr: false,
  }
);

const BrowserDetector = dynamic(
  () =>
    import('../components/browser-detector').then(mod => mod.BrowserDetector),
  {
    ssr: false,
  }
);

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
    default: `${siteMetadata.title} - 소프트웨어 엔지니어`,
    template: `%s • ${siteMetadata.title}`,
  },
  description: siteMetadata.description,
  openGraph: {
    type: 'website',
    url: siteMetadata.siteUrl,
    siteName: `${siteMetadata.title} - 소프트웨어 엔지니어`,
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
        'bd-bg-background bd-text-foreground',
        fontSans.variable,
        fontMono.variable
      )}
      dir="ltr"
    >
      <body className="bd-antialiased">
        <BrowserDetector />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="bd-theme"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Signature />
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
