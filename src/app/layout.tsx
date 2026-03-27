import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Fira_Mono as FontMono, Inter as FontSans } from 'next/font/google';
import type { WebSite, WithContext } from 'schema-dts';

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

const websiteJsonLd: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: `${siteMetadata.author} - 소프트웨어 엔지니어`,
  url: siteMetadata.siteUrl,
  description: siteMetadata.description,
  inLanguage: 'ko',
  publisher: {
    '@type': 'Person',
    name: siteMetadata.author,
    url: siteMetadata.siteUrl,
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
      className={cn(
        'bg-background text-foreground',
        fontSans.variable,
        fontMono.variable
      )}
      dir="ltr"
    >
      <body className="antialiased">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
        <BrowserDetector />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="theme"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Signature />
            {children}
            <footer
              aria-labelledby="footer-navigation"
              className="fixed -bottom-2 left-1/2 z-10 flex h-14 w-4/5 -translate-x-1/2 -translate-y-1/2 transform items-end rounded-full border border-solid border-input bg-background px-2 shadow-sm shadow-secondary xs:w-auto"
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
      </body>
    </html>
  );
}
