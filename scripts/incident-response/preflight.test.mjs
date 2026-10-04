import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { preflightCandidate } from './install.mjs';
import { SOURCE_DIRECTORY } from './paths.mjs';

const template = JSON.parse(
  await readFile(join(SOURCE_DIRECTORY, 'config.example.json'), 'utf8')
);
const config = {
  ...template,
  project_id: 'old-machine-id',
  project_path: '/project/bendd',
  enabled_at: '2026-10-01T00:00:00Z',
  runtime: {
    node: '/runtime/node',
    codex: '/runtime/codex',
    gh: '/runtime/gh',
  },
};

function fixture(options = {}) {
  const calls = [];
  let closed = false;
  const project = {
    id: 'new-machine-id',
    name: 'bendd',
    roots: [{ path: config.project_path }],
  };
  const client = {
    notify() {},
    async close() {
      closed = true;
    },
    async request(method, params) {
      calls.push({ method, params });
      if (options.denied && method === 'project/list')
        throw new Error('HTTP 403');
      if (method === 'initialize') return {};
      if (method === 'project/list')
        return {
          data: options.duplicate
            ? [project, { ...project, id: 'other' }]
            : [project],
          nextCursor: null,
        };
      if (method === 'account/read')
        return { account: { type: options.auth ?? 'chatgpt' } };
      if (method === 'project/read') return { project };
      if (method === 'thread/start')
        return {
          thread: {
            id: 'ephemeral-new',
            sessionId: 'ephemeral-new',
            projectId: project.id,
            forkedFromId: null,
            parentThreadId: null,
            turns: [],
            model: 'gpt-6.1-sol',
            reasoningEffort: 'high',
          },
          cwd: config.project_path,
          model: 'gpt-6.1-sol',
          modelProvider: 'openai',
          reasoningEffort: 'high',
          approvalsReviewer: 'auto_review',
          sandbox: { type: 'workspaceWrite' },
        };
      throw new Error(`Unexpected request: ${method}`);
    },
  };
  const dependencies = {
    validate: async () => {},
    authenticate: async () => {},
    clientFactory: () => client,
    github: async path =>
      path.endsWith('availability.yml')
        ? { path: '.github/workflows/availability.yml', state: 'active' }
        : { full_name: 'jaem1n207/bendd', default_branch: 'main' },
    production: async () => {},
  };
  return { calls, dependencies, closed: () => closed };
}

test('preflight discovers this Macs exact bendd project and validates High without a model turn', async () => {
  const f = fixture();
  const candidate = await preflightCandidate(
    config,
    '/runtime/state',
    f.dependencies
  );
  assert.equal(candidate.project_id, 'new-machine-id');
  const start = f.calls.find(call => call.method === 'thread/start');
  assert.equal(start.params.projectId, 'new-machine-id');
  assert.equal(start.params.ephemeral, true);
  assert.equal(start.params.config.model_reasoning_effort, 'high');
  assert.equal(
    f.calls.some(call =>
      ['turn/start', 'thread/name/set', 'thread/resume'].includes(call.method)
    ),
    false
  );
  assert.equal(f.closed(), true);
});

for (const [label, options, expected] of [
  ['API login', { auth: 'apiKey' }, /ChatGPT subscription/],
  ['duplicate projects', { duplicate: true }, /exactly one bendd project/],
  ['403', { denied: true }, /HTTP 403/],
]) {
  test(`preflight stops for ${label} and never starts a model or retries`, async () => {
    const f = fixture(options);
    await assert.rejects(
      preflightCandidate(config, '/runtime/state', f.dependencies),
      expected
    );
    assert.equal(
      f.calls.some(call => call.method === 'turn/start'),
      false
    );
    assert.equal(
      f.calls.filter(call => call.method === 'project/list').length,
      1
    );
    assert.equal(f.closed(), true);
  });
}
