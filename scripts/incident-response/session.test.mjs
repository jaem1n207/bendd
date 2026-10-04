import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createIncidentSession, runCodex } from './dispatch.mjs';

const config = {
  session_mode: 'new-project-thread',
  project_id: 'project-bendd',
  project_path: '/project/bendd',
  response_model: 'gpt-6.1-sol',
  reasoning_effort: 'high',
  runtime: { codex: '/fake/codex' },
};
const action = {
  issue: 321,
  phase: 'new',
  issue_url: 'https://github.com/jaem1n207/bendd/issues/321',
  state: { phase: 'investigating' },
};

function fakeClient(options = {}) {
  const calls = [];
  const events = new Set();
  const exits = new Set();
  let sequence = 0;
  let latestThread;
  const response = () => ({
    thread: {
      id: `new-${++sequence}`,
      sessionId: `new-${sequence}`,
      projectId: config.project_id,
      forkedFromId: null,
      parentThreadId: null,
      turns: [],
      model: 'gpt-6.1-sol',
      reasoningEffort: 'high',
      ...options.thread,
    },
    cwd: '/worktree',
    model: 'gpt-6.1-sol',
    modelProvider: 'openai',
    reasoningEffort: 'high',
    approvalsReviewer: 'auto_review',
    sandbox: { type: 'workspaceWrite' },
    ...options.started,
  });
  return {
    calls,
    async request(method, params) {
      calls.push({ method, params });
      if (method === 'account/read')
        return { account: { type: options.auth ?? 'chatgpt' } };
      if (method === 'model/list')
        return (
          options.catalog ?? {
            data: [
              {
                model: 'gpt-6.1-sol',
                supportedReasoningEfforts: [{ reasoningEffort: 'high' }],
              },
            ],
            nextCursor: null,
          }
        );
      if (method === 'project/read')
        return {
          project: options.project ?? {
            id: config.project_id,
            name: 'bendd',
            roots: [{ path: config.project_path }],
          },
        };
      if (method === 'thread/start') {
        const result = response();
        latestThread = result.thread.id;
        return result;
      }
      if (method === 'turn/start') {
        options.beforeTurn?.();
        queueMicrotask(() => {
          for (const event of [
            {
              method: 'item/completed',
              params: {
                threadId: latestThread,
                item: { type: 'commandExecution', aggregatedOutput: 'SECRET' },
              },
            },
            {
              method: 'item/completed',
              params: {
                threadId: latestThread,
                item: {
                  type: 'agentMessage',
                  text: '포스트모템 링크를 확인해 주세요.',
                },
              },
            },
            {
              method: 'thread/tokenUsage/updated',
              params: {
                threadId: latestThread,
                tokenUsage: {
                  total: {
                    inputTokens: 100,
                    cachedInputTokens: 40,
                    outputTokens: 10,
                  },
                },
              },
            },
            options.denied
              ? {
                  method: 'bendd/userActionRequired',
                  params: { request: 'approval' },
                }
              : {
                  method: 'turn/completed',
                  params: {
                    threadId: latestThread,
                    turn: { status: 'completed' },
                  },
                },
          ])
            for (const listener of events) listener(event);
        });
        return { turn: { id: 'turn-1' } };
      }
      return {};
    },
    notify(method, params) {
      calls.push({ method, params });
    },
    onEvent(listener) {
      events.add(listener);
      return () => events.delete(listener);
    },
    onExit(listener) {
      exits.add(listener);
      return () => exits.delete(listener);
    },
    async close() {
      for (const listener of exits) listener();
    },
  };
}

test('each dispatch creates a distinct bendd project thread with High and no inherited history', async () => {
  const client = fakeClient();
  const first = await createIncidentSession(client, {
    config,
    worktree: '/worktree',
    action,
  });
  const second = await createIncidentSession(client, {
    config,
    worktree: '/worktree',
    action: { ...action, phase: 'awaiting_checks' },
    forbiddenIds: [first.thread_id],
  });
  assert.notEqual(first.thread_id, second.thread_id);
  assert.equal(first.project_id, config.project_id);
  assert.equal(second.reasoning_effort, 'high');
  assert.equal(first.session_name, 'Bendd 장애 #321 · 조사·수정');
  const starts = client.calls.filter(call => call.method === 'thread/start');
  assert.equal(starts.length, 2);
  assert.ok(
    starts.every(
      call =>
        call.params.projectId === config.project_id &&
        call.params.config.model_reasoning_effort === 'high'
    )
  );
  assert.ok(
    !client.calls.some(call =>
      /resume|fork|inject|turn\/start/.test(call.method)
    )
  );
});

for (const [name, options] of [
  ['another project', { thread: { projectId: 'other' } }],
  ['inherited conversation', { thread: { forkedFromId: 'previous' } }],
  [
    'subagent of the current session',
    { thread: { parentThreadId: 'current' } },
  ],
  ['previous turns', { thread: { turns: [{ id: 'old' }] } }],
  ['Max effort', { started: { reasoningEffort: 'max' } }],
  ['picker still shows Max', { thread: { reasoningEffort: 'max' } }],
  ['different model', { started: { model: 'another-model' } }],
  ['disabled automatic review', { started: { approvalsReviewer: 'user' } }],
]) {
  test(`${name} stops before a model request`, async () => {
    const client = fakeClient(options);
    await assert.rejects(
      createIncidentSession(client, { config, worktree: '/worktree', action }),
      /guard failed/
    );
    assert.ok(!client.calls.some(call => call.method === 'turn/start'));
  });
}

test('a returned current or earlier session cannot be used', async () => {
  const client = fakeClient({
    thread: { id: 'current', sessionId: 'current' },
  });
  await assert.rejects(
    createIncidentSession(client, {
      config,
      worktree: '/worktree',
      action,
      forbiddenIds: ['current'],
    }),
    /guard failed/
  );
});

test('API login or moved project is not replaced by a fallback thread', async () => {
  for (const options of [
    { auth: 'apiKey' },
    {
      project: {
        id: config.project_id,
        name: 'bendd',
        roots: [{ path: '/other' }],
      },
    },
  ]) {
    const client = fakeClient(options);
    await assert.rejects(
      createIncidentSession(client, { config, worktree: '/worktree', action })
    );
    assert.ok(!client.calls.some(call => call.method === 'thread/start'));
  }
});

for (const [name, catalog] of [
  ['missing requested model', { data: [], nextCursor: null }],
  [
    'missing High',
    {
      data: [
        {
          model: 'gpt-6.1-sol',
          supportedReasoningEfforts: [{ reasoningEffort: 'medium' }],
        },
      ],
      nextCursor: null,
    },
  ],
  ['invalid catalog', {}],
])
  test(`${name} prevents session creation and any model request`, async () => {
    const client = fakeClient({ catalog });
    await assert.rejects(
      createIncidentSession(client, { config, worktree: '/worktree', action }),
      /model catalog|gpt-6.1-sol.*High/
    );
    assert.equal(
      client.calls.some(call =>
        ['thread/start', 'turn/start'].includes(call.method)
      ),
      false
    );
  });

test('persist verified new session before starting its High turn; save only final feedback', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bendd-session-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'README.md'), 'Trusted incident runbook');
  let persisted = false;
  let starts = 0;
  const client = fakeClient({
    beforeTurn: () => {
      assert.ok(persisted);
      assert.equal(starts, 1);
    },
  });
  const output = join(directory, 'final.md');
  const result = await runCodex({
    config,
    directory,
    worktree: '/worktree',
    action,
    reason: 'active_outage',
    output,
    onSession: async session => {
      assert.equal(session.project_id, config.project_id);
      persisted = true;
    },
    onModelStart: async () => {
      starts += 1;
    },
    clientFactory: () => client,
  });
  assert.equal(result.exit_code, 0);
  assert.equal(result.usage.input_tokens, 100);
  const turn = client.calls.find(call => call.method === 'turn/start');
  assert.equal(turn.params.threadId, result.thread_id);
  assert.equal(turn.params.model, 'gpt-6.1-sol');
  assert.equal(turn.params.effort, 'high');
  assert.equal(
    await readFile(output, 'utf8'),
    '포스트모템 링크를 확인해 주세요.\n'
  );
});

test('automatic review escalation exits instead of granting access or restarting a thread', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bendd-denied-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'README.md'), 'Trusted incident runbook');
  const client = fakeClient({ denied: true });
  const result = await runCodex({
    config,
    directory,
    worktree: '/worktree',
    action,
    reason: 'active_outage',
    output: join(directory, 'final.md'),
    clientFactory: () => client,
  });
  assert.equal(result.exit_code, 1);
  assert.equal(
    client.calls.filter(call => call.method === 'turn/start').length,
    1
  );
  assert.equal(
    client.calls.filter(call => call.method === 'thread/start').length,
    1
  );
});
