import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyFailure, readHosting, summarizeHosting } from './hosting.mjs';
import { checkAvailability } from '../check-availability.mjs';

const names = [
  'CDN',
  'Functions',
  'Routing Middleware',
  'DNS',
  'TLS Certificates',
  'Global Config',
  'Data Cache',
  'API',
  'ICN1 - Seoul, South Korea',
  'IAD1 - Washington DC, USA',
  'AI Gateway',
];
const summary = () => ({
  page: { id: 'lvglq8h0mdyh' },
  components: names.map((name, i) => ({
    id: String(i),
    name,
    status: 'operational',
  })),
  incidents: [],
});
const probe = {
  results: [
    {
      ok: false,
      status: 200,
      type_ok: true,
      content_ok: false,
      provider_regions: ['icn1'],
    },
  ],
};

test('only relevant serving regions and components pause app response', () => {
  const value = summary();
  value.components.find(c => c.name === 'AI Gateway').status = 'major_outage';
  value.components.find(c => c.name.startsWith('IAD1')).status = 'major_outage';
  assert.equal(summarizeHosting(value, { probe }).status, 'clear');
  value.components.find(c => c.name === 'Functions').status = 'partial_outage';
  assert.equal(summarizeHosting(value, { probe }).status, 'provider_outage');
});
test('API failure pauses delivery stages but does not assert a serving outage', () => {
  const value = summary();
  value.components.find(c => c.name === 'API').status = 'major_outage';
  assert.equal(summarizeHosting(value, { probe }).status, 'clear');
  assert.equal(
    summarizeHosting(value, { probe, phase: 'awaiting_checks' }).status,
    'provider_outage'
  );
});
test('unresolved relevant incident is honored even while component is operational', () => {
  const value = summary();
  value.incidents.push({
    resolved_at: null,
    status: 'monitoring',
    components: [{ id: '0' }],
  });
  assert.equal(summarizeHosting(value, { probe }).status, 'provider_outage');
});
test('missing component, malformed response or unknown page is not evidence of provider health', () => {
  for (const value of [
    {},
    { ...summary(), page: { id: 'other' } },
    { ...summary(), components: [] },
  ])
    assert.equal(summarizeHosting(value, { probe }).status, 'unknown');
});
test('AWS upstream code and generic timeout are deferred even if Vercel is healthy', () => {
  for (const row of [
    { upstream_error: 'ServiceUnavailableException' },
    { status: 503 },
    { error: 'TimeoutError' },
  ])
    assert.equal(
      classifyFailure(
        { results: [{ ...probe.results[0], ...row }] },
        { status: 'clear' }
      ).status,
      'defer'
    );
});
test('status API failure is read once without model or automatic retry', async () => {
  let calls = 0;
  const result = await readHosting({ probe }, async () => {
    calls++;
    throw new Error('network');
  });
  assert.equal(result.status, 'unknown');
  assert.equal(calls, 1);
  await assert.rejects(
    readHosting({ probe }, async () => new Response('', { status: 403 })),
    /HTTP 403/
  );
});
test('probe preserves safe error codes and regions without response bodies or request IDs', async () => {
  const result = await checkAvailability(
    'https://fixture.invalid',
    async () =>
      new Response('private diagnostic', {
        status: 500,
        headers: {
          'x-vercel-error': 'INTERNAL_FUNCTION_INVOCATION_FAILED',
          'x-amzn-errortype': 'ServiceUnavailableException',
          'x-vercel-id': 'icn1::iad1-private-id',
        },
      })
  );
  assert.equal(
    result.results[0].provider_error,
    'INTERNAL_FUNCTION_INVOCATION_FAILED'
  );
  assert.equal(result.results[0].upstream_error, 'ServiceUnavailableException');
  assert.deepEqual(result.results[0].provider_regions, ['icn1', 'iad1']);
  assert.ok(!JSON.stringify(result).includes('private'));
});
