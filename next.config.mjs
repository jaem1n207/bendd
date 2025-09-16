import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  experimental: {
    serverComponentsExternalPackages: ['@shikijs/twoslash', 'rehype-mermaid'],
    typedRoutes: true,
  },
  headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  eslint: {
    dirs: ['src'],
  },
  images: {
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

const ContentSecurityPolicy = `
    default-src 'self' vercel.live;
    script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.vercel-insights.com vercel.live va.vercel-scripts.com giscus.app;
    style-src 'self' 'unsafe-inline' giscus.app;
    img-src * blob: data:;
    media-src 'self';
    connect-src *;
    font-src 'self' data:;
    frame-src 'self' *.codesandbox.io vercel.live giscus.app;
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

export default bundleAnalyzer(nextConfig);
