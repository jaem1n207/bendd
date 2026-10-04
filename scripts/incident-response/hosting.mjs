export const HOSTING_STATUS_URL =
  'https://www.vercel-status.com/api/v2/summary.json';
const SERVING = new Set([
  'CDN',
  'Functions',
  'Routing Middleware',
  'DNS',
  'TLS Certificates',
  'Global Config',
  'Data Cache',
]);
const DELIVERY = new Set([
  'API',
  'Build & Deploy',
  'Builds',
  'CI/CD',
  'Git Integrations',
  'Output Generation',
]);
const STATES = new Set([
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance',
]);

export function summarizeHosting(value, { probe, phase = 'new' } = {}) {
  if (
    value?.page?.id !== 'lvglq8h0mdyh' ||
    !Array.isArray(value.components) ||
    !Array.isArray(value.incidents) ||
    value.incidents.some(
      i =>
        !i ||
        ![
          'investigating',
          'identified',
          'monitoring',
          'resolved',
          'postmortem',
        ].includes(i.status) ||
        !Array.isArray(i.components) ||
        i.components.some(c => typeof c?.id !== 'string')
    ) ||
    value.components.some(
      c =>
        typeof c.id !== 'string' ||
        typeof c.name !== 'string' ||
        !STATES.has(c.status)
    )
  ) {
    return { status: 'unknown', affected: [], source: HOSTING_STATUS_URL };
  }
  const regions = new Set(
    (probe?.results ?? []).flatMap(row => row.provider_regions ?? [])
  );
  const selected = value.components.filter(
    c =>
      SERVING.has(c.name) ||
      (phase !== 'new' && DELIVERY.has(c.name)) ||
      (/^[A-Z]{3}\d - /.test(c.name) &&
        (!regions.size || regions.has(c.name.slice(0, 4).toLowerCase())))
  );
  if (![...SERVING].every(name => value.components.some(c => c.name === name)))
    return { status: 'unknown', affected: [], source: HOSTING_STATUS_URL };
  const incidentIds = new Set(
    value.incidents
      .filter(
        i =>
          i.resolved_at === null &&
          ['investigating', 'identified', 'monitoring'].includes(i.status)
      )
      .flatMap(i =>
        Array.isArray(i.components) ? i.components.map(c => c.id) : []
      )
  );
  const affected = selected
    .filter(c => c.status !== 'operational' || incidentIds.has(c.id))
    .map(c => c.name);
  return {
    status: affected.length ? 'provider_outage' : 'clear',
    affected: [...new Set(affected)],
    source: HOSTING_STATUS_URL,
  };
}

export async function readHosting(context, fetcher = fetch) {
  try {
    const response = await fetcher(HOSTING_STATUS_URL, {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if ([401, 403].includes(response.status))
      throw new Error(
        `Hosting status HTTP ${response.status}; stop and request access`
      );
    if (!response.ok)
      return { status: 'unknown', affected: [], source: HOSTING_STATUS_URL };
    return summarizeHosting(await response.json(), context);
  } catch (error) {
    if (/HTTP (?:401|403)/.test(error.message)) throw error;
    return { status: 'unknown', affected: [], source: HOSTING_STATUS_URL };
  }
}

export function classifyFailure(probe, hosting) {
  const failed = probe.results.filter(row => !row.ok);
  if (!failed.length)
    return { status: 'skip', reason: 'recovered_before_response' };
  if (hosting.status === 'provider_outage')
    return { status: 'defer', reason: 'hosting_provider_outage', hosting };
  if (hosting.status !== 'clear')
    return { status: 'defer', reason: 'hosting_evidence_unavailable', hosting };
  // Platform codes can describe either provider or application faults. Never infer an app fix from the code alone.
  if (failed.some(row => row.provider_error || row.upstream_error))
    return { status: 'defer', reason: 'platform_or_upstream_error', hosting };
  if (
    failed.some(
      row =>
        row.error ||
        row.status !== 200 ||
        row.type_ok !== true ||
        row.content_ok !== false
    )
  )
    return { status: 'defer', reason: 'unknown_failure_origin', hosting };
  return { status: 'ready', reason: 'application_content_failure', hosting };
}
