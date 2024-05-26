import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';

import { cn } from '@/lib/utils';
import './globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Bendd',
  description: 'Frontend Software Engineer · jaem1n207',
  openGraph: {
    type: 'website',
    url: 'https://bendd.me',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={cn(
          'bd-min-h-screen bd-bg-background bd-font-sans bd-antialiased',
          fontSans.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
