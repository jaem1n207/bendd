import { withSentryConfig } from '@sentry/nextjs/config';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

const PUBLIC_ASSET_CACHE =
  'public, max-age=86400, stale-while-revalidate=604800';
const CACHED_ASSET_PATHS = [
  '/sounds/:path*',
  '/images/tech-stack/:path*',
  '/images/profile/:path*',
];

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  serverExternalPackages: ['@shikijs/twoslash'],
  typedRoutes: true,
  headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      ...CACHED_ASSET_PATHS.map(source => ({
        source,
        headers: [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE }],
      })),
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
    script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.vercel-insights.com vercel.live va.vercel-scripts.com giscus.app https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' giscus.app;
    img-src * blob: data:;
    media-src 'self';
    connect-src *;
    font-src 'self' data:;
    frame-src 'self' *.codesandbox.io vercel.live giscus.app https://www.youtube.com;
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
    value: 'camera=(), microphone=(), geolocation=(), tools=(self)',
  },
];

const SENTRY_UPLOAD_KEYS = [
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
];
const VERCEL_DEPLOY_ENVS = ['production', 'preview'];

/** @param {string} phase */
export default function configureNext(phase) {
  const missingKeys = SENTRY_UPLOAD_KEYS.filter(
    key => !process.env[key]?.trim()
  );
  const isVercelDeployBuild =
    phase === PHASE_PRODUCTION_BUILD &&
    process.env.VERCEL === '1' &&
    VERCEL_DEPLOY_ENVS.includes(process.env.VERCEL_ENV);

  if (isVercelDeployBuild && missingKeys.length > 0) {
    throw new Error(
      `[Sentry source maps] Vercel ${process.env.VERCEL_ENV} 빌드 필수 설정 누락: ${missingKeys.join(', ')}. ` +
        'Vercel의 해당 환경에 설정하세요. SENTRY_AUTH_TOKEN은 Sensitive 변수로 저장하세요.'
    );
  }

  const sentryUploadEnabled = missingKeys.length === 0;

  return withSentryConfig(bundleAnalyzer({ ...nextConfig }), {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    telemetry: false,
    buildTimeInstrumentation: false,
    webpack: {
      treeshake: { removeDebugLogging: true, removeTracing: true },
    },
    silent: !sentryUploadEnabled,
    widenClientFileUpload: true,
    useRunAfterProductionCompileHook: true,
    sourcemaps: {
      disable: !sentryUploadEnabled,
      deleteSourcemapsAfterUpload: true,
    },
  });
}
