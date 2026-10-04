import { pathToFileURL } from 'node:url';

const TIMEOUT_MS = 10_000;
export const HTTP_OK = 200;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export const SITE_URL = 'https://bendd.me';
export const CHECKS = [
  { path: '/', type: 'text/html', marker: '<title>이재민' },
  {
    path: '/article/fix-compacting-conversation',
    type: 'text/html',
    marker: 'data-webmcp-slug="fix-compacting-conversation"',
  },
  { path: '/rss.xml', type: 'xml', marker: '<rss' },
  { path: '/api/og?title=Bendd', type: 'image/png' },
];

export async function checkAvailability(base = SITE_URL, fetcher = fetch) {
  const results = await Promise.all(
    CHECKS.map(async check => {
      const started = performance.now();
      try {
        const response = await fetcher(new URL(check.path, base), {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'User-Agent': 'Bendd-Availability-Check/1.0' },
        });
        const bytes = new Uint8Array(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') ?? '';
        const contentOk = check.marker
          ? new TextDecoder().decode(bytes).includes(check.marker)
          : PNG_SIGNATURE.every((value, index) => bytes[index] === value);
        return {
          path: check.path.split('?')[0],
          ok:
            response.status === HTTP_OK &&
            contentType.includes(check.type) &&
            contentOk,
          status: response.status,
          type_ok: contentType.includes(check.type),
          elapsed_ms: Math.round(performance.now() - started),
          content_ok: contentOk,
        };
      } catch (error) {
        return {
          path: check.path.split('?')[0],
          ok: false,
          elapsed_ms: Math.round(performance.now() - started),
          error: error instanceof Error ? error.name : 'UnknownError',
        };
      }
    })
  );

  return { checked_at: new Date().toISOString(), results };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = await checkAvailability(process.argv[2] ?? SITE_URL);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.results.every(result => result.ok) ? 0 : 1;
}
