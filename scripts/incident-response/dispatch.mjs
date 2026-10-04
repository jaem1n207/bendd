import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { openAppServer } from './app-server.mjs';
import { validNumber } from './policy.mjs';
import { CODEX_CLI_VERSION, SOURCE_DIRECTORY } from './paths.mjs';
import { assertProjectRemote } from './repository.mjs';

const execAsync = promisify(execFile);
const MAX_RUNTIME_MS = 2 * 60 * 60 * 1000;

export function subscriptionEnvironment(environment = process.env) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) => !/^(?:OPENAI|AZURE_OPENAI|CODEX_API|ANTHROPIC)_/.test(name)
    )
  );
}

export function invocation(config, directory, worktree) {
  return {
    executable: config.runtime.codex,
    args: [
      'app-server',
      '--stdio',
      '--config',
      `model=${JSON.stringify(config.response_model)}`,
      '--config',
      `model_reasoning_effort=${JSON.stringify(config.reasoning_effort)}`,
      '--config',
      'model_provider="openai"',
      '--config',
      'forced_login_method="chatgpt"',
      '--config',
      'approvals_reviewer="auto_review"',
      '--config',
      'approval_policy="on-request"',
      '--config',
      'sandbox_mode="workspace-write"',
      '--config',
      `sandbox_workspace_write.writable_roots=${JSON.stringify([join(directory, 'state'), join(directory, 'results')])}`,
      '--config',
      'service_tier="default"',
    ],
    cwd: worktree,
    env: subscriptionEnvironment(),
  };
}

export async function requireSubscription(config, execute = execAsync) {
  let version;
  try {
    version = await execute(config.runtime.codex, ['--version'], {
      env: subscriptionEnvironment(),
      timeout: 15_000,
      maxBuffer: 64 * 1024,
    });
  } catch {
    throw new Error(
      'Codex CLI version could not be verified; stop before dispatch'
    );
  }
  if (version.stdout.trim() !== `codex-cli ${CODEX_CLI_VERSION}`)
    throw new Error('Codex CLI schema version changed; review before dispatch');
  let status;
  try {
    status = await execute(config.runtime.codex, ['login', 'status'], {
      env: subscriptionEnvironment(),
      timeout: 15_000,
      maxBuffer: 64 * 1024,
    });
  } catch {
    throw new Error(
      'Codex CLI subscription login could not be verified; no API fallback'
    );
  }
  const { stdout, stderr } = status;
  if (!/Logged in using ChatGPT/.test(stdout + stderr)) {
    throw new Error(
      'ChatGPT subscription login required; no API fallback allowed'
    );
  }
}

export async function prepareWorktree(config, directory, issue, existing) {
  if (!validNumber(issue)) throw new Error('Invalid incident worktree number');
  const branch = `fix/incident-${issue}`;
  const worktree = join(directory, 'worktrees', `incident-${issue}`);
  const git = async (args, cwd = config.project_path) => {
    try {
      return await execAsync('git', args, {
        cwd,
        timeout: 60_000,
        maxBuffer: 512 * 1024,
      });
    } catch (error) {
      const denied = error.stderr?.match(/\b(401|403)\b/)?.[1];
      throw new Error(
        denied
          ? `GitHub HTTP ${denied}; stop and request access`
          : 'Incident worktree preparation failed; inspect Git before retrying'
      );
    }
  };
  if (existing) {
    if (existing !== worktree)
      throw new Error('Unexpected incident worktree path');
    const { stdout } = await git(['branch', '--show-current'], worktree);
    if (stdout.trim() !== branch)
      throw new Error('Incident worktree branch changed');
    return worktree;
  }
  const { stdout: remote } = await git(['remote', 'get-url', 'origin']);
  await assertProjectRemote(remote.trim());
  await git(['fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main']);
  await mkdir(join(directory, 'worktrees'), { recursive: true, mode: 0o700 });
  await git(['worktree', 'add', '-b', branch, worktree, 'origin/main']);
  return worktree;
}

export function captureEvent(summary, event) {
  if (
    event.method === 'thread/tokenUsage/updated' &&
    event.params?.threadId === summary.thread_id
  ) {
    const values = event.params.tokenUsage?.total;
    for (const [source, target] of [
      ['inputTokens', 'input_tokens'],
      ['cachedInputTokens', 'cached_input_tokens'],
      ['outputTokens', 'output_tokens'],
    ]) {
      const value = values?.[source];
      if (Number.isSafeInteger(value) && value >= 0)
        summary.usage[target] = value;
    }
  }
  if (['error', 'bendd/userActionRequired'].includes(event.method))
    summary.failed = true;
}

export async function initializeClient(client) {
  await client.request('initialize', {
    clientInfo: {
      name: 'bendd_incident_response',
      title: 'Bendd Incident Response',
      version: '2.0.0',
    },
    capabilities: { experimentalApi: true },
  });
  client.notify('initialized', {});
}

export async function createIncidentSession(
  client,
  { config, worktree, action, forbiddenIds = [], ephemeral = false }
) {
  if (
    config.session_mode !== 'new-project-thread' ||
    config.response_model !== 'gpt-6.1-sol' ||
    config.reasoning_effort !== 'high' ||
    !config.project_id ||
    !validNumber(action.issue)
  ) {
    throw new Error('Invalid Codex fresh-project High session configuration');
  }
  const account = await client.request('account/read', { refreshToken: false });
  if (account.account?.type !== 'chatgpt')
    throw new Error('Codex ChatGPT subscription required; no API fallback');
  const { project } = await client.request('project/read', {
    projectId: config.project_id,
  });
  if (
    project?.id !== config.project_id ||
    project.name !== 'bendd' ||
    !project.roots?.some(root => root.path === config.project_path)
  ) {
    throw new Error(
      'Codex bendd project identity mismatch; do not create a session elsewhere'
    );
  }
  const started = await client.request('thread/start', {
    projectId: config.project_id,
    model: 'gpt-6.1-sol',
    modelProvider: 'openai',
    allowProviderModelFallback: false,
    cwd: worktree,
    runtimeWorkspaceRoots: [worktree],
    environments: [],
    config: { model_reasoning_effort: 'high' },
    serviceTier: 'default',
    approvalPolicy: 'on-request',
    approvalsReviewer: 'auto_review',
    sandbox: 'workspace-write',
    ephemeral,
    threadSource: 'bendd-incident-response',
  });
  const thread = started.thread;
  if (
    !thread?.id ||
    forbiddenIds.includes(thread.id) ||
    forbiddenIds.includes(thread.sessionId) ||
    thread.projectId !== config.project_id ||
    thread.forkedFromId !== null ||
    thread.parentThreadId !== null ||
    thread.turns?.length !== 0 ||
    thread.model !== 'gpt-6.1-sol' ||
    thread.reasoningEffort !== 'high' ||
    started.cwd !== worktree ||
    started.model !== 'gpt-6.1-sol' ||
    started.modelProvider !== 'openai' ||
    started.reasoningEffort !== 'high' ||
    started.approvalsReviewer !== 'auto_review' ||
    started.sandbox?.type !== 'workspaceWrite'
  ) {
    throw new Error(
      'Codex new-session/project/model/High guard failed; model not started'
    );
  }
  const labels = {
    new: '조사·수정',
    awaiting_checks: '검증·병합',
    awaiting_deploy: '복구 확인·포스트모템',
  };
  const name = `Bendd 장애${action.kind === 'drill' ? ' 리허설' : ''} #${action.issue} · ${labels[action.phase] ?? '대응'}`;
  if (!ephemeral)
    await client.request('thread/name/set', { threadId: thread.id, name });
  return {
    thread_id: thread.id,
    session_id: thread.sessionId,
    project_id: thread.projectId,
    session_name: name,
    source: thread.source,
    model: started.model,
    reasoning_effort: started.reasoningEffort,
  };
}

export async function runCodex({
  config,
  directory,
  worktree,
  action,
  reason,
  output,
  forbiddenIds = [],
  onSession = async () => {},
  onModelStart = async () => {},
  clientFactory = openAppServer,
  timeoutMs = MAX_RUNTIME_MS,
}) {
  const runbook = await readFile(join(SOURCE_DIRECTORY, 'README.md'), 'utf8');
  const prompt = `Bendd의 검증된 장애 #${action.issue}에만 대응하세요. 사용자 승인 범위는 아래 runbook에 있습니다.
이 실행은 bendd 프로젝트의 새 세션이며 다른 세션을 이어가거나 대화 이력을 가져오지 않습니다. 모델은 gpt-6.1-sol, 추론 강도는 High입니다.
이번 실행의 사유: ${reason}. phase: ${action.phase}. 이슈: ${action.issue_url}.
로컬 제어 상태: ${JSON.stringify(action.state)}.
watcher가 새 장애를 이미 claim하고 최신 main의 격리 worktree를 준비했습니다. 다시 claim하거나 새 worktree/PR을 중복 생성하지 마세요.
healthy 점검이나 다른 대화의 미완료 작업은 수행하지 마세요. 현재 worktree의 AGENTS.md를 읽고 아래 절차를 적용하세요.
운영 기록 디렉터리: ${directory}. 고정 제어 소스: ${SOURCE_DIRECTORY}. 제어 소스/config/manifest/runbook/scheduler를 수정하지 마세요.
제어 helper는 SOURCE_DIRECTORY의 파일로 실행하고 BENDD_INCIDENT_HOME은 운영 기록 디렉터리로 유지하세요. 이전 설치의 루트 helper를 실행하지 마세요.
이 세션에서는 gh와 vercel-read.mjs의 기존 인증을 사용하세요. 앱 도구가 있으면 생성한 PR을 attach_artifact로 연결하세요.
첫 수정 회귀 검사는 실패를 먼저 확인하세요. CI/배포가 대기 중이면 checkpoint를 저장하고 종료하세요. 한 실행을 2시간 이상 계속하지 마세요.
checks_failed 또는 deployment_failed 사유이면 새 수정/재시도/배포 없이 미해결 원인과 필요한 사용자 조치를 보고하고 needs_action으로 종료하세요.
권한 거부, 자동 승인 검토 거부, 구독 한도는 우회하거나 반복 재시도하지 말고 종료하세요. 비밀 값과 원본 인증 로그는 출력/게시하지 마세요.
최종 응답은 한국어로 짧게, 장애 이슈/PR/포스트모템 링크와 필요한 사용자 조치만 적으세요.

${runbook}`;
  return runProjectTurn({
    config,
    directory,
    worktree,
    action,
    prompt,
    output,
    forbiddenIds,
    onSession,
    onModelStart,
    clientFactory,
    timeoutMs,
  });
}

// Both the production response and explicitly authorized drill use identical account/session/High guards.
export async function runProjectTurn({
  config,
  directory,
  worktree,
  action,
  prompt,
  output,
  forbiddenIds = [],
  onSession = async () => {},
  onModelStart = async () => {},
  clientFactory = openAppServer,
  timeoutMs = MAX_RUNTIME_MS,
}) {
  const spec = invocation(config, directory, worktree);
  const summary = { usage: {}, failed: false, thread_id: null };
  await mkdir(join(directory, 'results'), { recursive: true, mode: 0o700 });
  const client = clientFactory(spec);
  let lastMessage = '';
  let finishTurn;
  const completed = new Promise(resolve => {
    finishTurn = resolve;
  });
  let timedOut = false;
  let settled = false;
  const settle = status => {
    if (!settled) {
      settled = true;
      finishTurn(status);
    }
  };
  const offExit = client.onExit(() => settle('failed'));
  const offEvent = client.onEvent(event => {
    captureEvent(summary, event);
    if (
      event.method === 'item/completed' &&
      event.params?.threadId === summary.thread_id &&
      event.params.item?.type === 'agentMessage'
    )
      lastMessage = event.params.item.text;
    if (
      event.method === 'turn/completed' &&
      event.params?.threadId === summary.thread_id
    )
      settle(event.params.turn?.status);
    if (event.method === 'bendd/userActionRequired') {
      settle('user_action_required');
      if (summary.thread_id)
        client
          .request('turn/interrupt', {
            threadId: summary.thread_id,
            turnId: summary.turn_id,
          })
          .catch(() => {});
    }
  });
  const timer = setTimeout(() => {
    timedOut = true;
    settle('timed_out');
    client.close().catch(() => {});
  }, timeoutMs);
  try {
    await initializeClient(client);
    const session = await createIncidentSession(client, {
      config,
      worktree,
      action,
      forbiddenIds,
    });
    Object.assign(summary, session);
    await onSession(session); // Persist the verified new project session before any model request.
    await onModelStart();
    const turn = await client.request('turn/start', {
      threadId: session.thread_id,
      input: [{ type: 'text', text: prompt, text_elements: [] }],
      model: 'gpt-6.1-sol',
      effort: 'high',
      serviceTierForTurn: 'default',
      approvalPolicy: 'on-request',
      approvalsReviewer: 'auto_review',
    });
    summary.turn_id = turn.turn?.id;
    const status = await completed;
    if (lastMessage)
      await writeFile(output, lastMessage + '\n', { mode: 0o600 });
    return {
      ...summary,
      exit_code: status === 'completed' && !summary.failed ? 0 : 1,
      timed_out: timedOut,
      status,
    };
  } finally {
    clearTimeout(timer);
    offExit();
    offEvent();
    await client.close();
  }
}
