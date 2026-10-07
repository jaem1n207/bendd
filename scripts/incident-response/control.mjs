import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isMain, runtimeDirectory } from './paths.mjs';
import { promisify } from 'node:util';
import {
  MAX_MONITOR_GAP_MS,
  MONITOR_REFRESH_AFTER_MS,
  MAX_RESPONSE_AGE_MS,
  OWNER,
  PHASES,
  REPOSITORY,
  RESPONSE_MARKER,
  TERMINAL_PHASES,
  WORKFLOW_PATH,
  assertMerge,
  incidentRunId,
  isIncident,
  isMonitorRun,
  validNumber,
  validateState,
} from './policy.mjs';

const ROOT = runtimeDirectory();
const MAX_PAGES = 20;
const PAGE_SIZE = 100;
const execAsync = promisify(execFile);

export async function githubApi(path, method = 'GET', input) {
  const args = ['api', `repos/${REPOSITORY}/${path}`, '--method', method];
  if (input !== undefined) {
    args.push('--input', '-');
  }
  try {
    const pending = execAsync('gh', args, {
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    if (input !== undefined) {
      pending.child.stdin.end(JSON.stringify(input));
    }
    const { stdout } = await pending;
    return stdout ? JSON.parse(stdout) : null;
  } catch (error) {
    const status = error.stderr?.match(/HTTP (\d{3})/)?.[1];
    throw new Error(
      status
        ? `GitHub HTTP ${status}; stop and request access`
        : 'GitHub command failed; stop and check authentication or network'
    );
  }
}

export function createControl({
  directory = ROOT,
  api = githubApi,
  now = () => new Date(),
} = {}) {
  const statePath = number => join(directory, 'state', `${number}.json`);

  async function readJson(path) {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error('Unreadable response state; stop without resetting');
    }
  }

  async function saveJson(path, value) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(temporary, path);
  }

  async function list(path) {
    const values = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const batch = await api(
        `${path}${path.includes('?') ? '&' : '?'}per_page=${PAGE_SIZE}&page=${page}`
      );
      if (!Array.isArray(batch)) {
        throw new Error('Invalid GitHub list');
      }
      values.push(...batch);
      if (batch.length < PAGE_SIZE) {
        return values;
      }
    }
    throw new Error('GitHub pagination limit; manual review required');
  }

  async function reportStatus(status, message, data = {}) {
    const path = join(directory, 'state', 'monitor.json');
    const previous = await readJson(path);
    const fingerprint = `${status}:${message}`;
    const notify =
      previous?.fingerprint !== fingerprint && status === 'needs_action';
    const result = {
      status,
      message,
      notify,
      ...data,
      checked_at: now().toISOString(),
    };
    await saveJson(path, { ...result, fingerprint });
    return result;
  }

  async function trustedIssue(number) {
    if (!validNumber(number)) {
      throw new Error('Invalid incident number');
    }
    const issue = await api(`issues/${number}`);
    const run = await api(`actions/runs/${incidentRunId(issue)}`);
    if (!isMonitorRun(run)) {
      throw new Error('Incident monitoring run is untrusted');
    }
    return issue;
  }

  async function readState(number) {
    const state = await readJson(statePath(number));
    if (!state) {
      return null;
    }
    validateState(state);
    if (state.issue !== number) {
      throw new Error('Response state issue mismatch');
    }
    return state;
  }

  async function requestAvailability(workflow, latest) {
    if (!validNumber(workflow.id) || (latest && !validNumber(latest.id))) {
      throw new Error('Invalid Availability workflow identity');
    }
    const states = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];
    const pending = [];
    for (const status of states) {
      const response = await api(
        `actions/workflows/${workflow.id}/runs?branch=main&status=${status}&per_page=100`
      );
      if (
        !Array.isArray(response.workflow_runs) ||
        !Number.isSafeInteger(response.total_count) ||
        response.total_count !== response.workflow_runs.length ||
        response.total_count > PAGE_SIZE
      ) {
        throw new Error(
          'Invalid or excessive Availability queue; do not dispatch'
        );
      }
      if (
        response.workflow_runs.some(
          run =>
            !isMonitorRun(run) ||
            !validNumber(run.id) ||
            (run.status !== 'completed' && !states.includes(run.status))
        )
      ) {
        throw new Error(
          'Untrusted Availability queue metadata; do not dispatch'
        );
      }
      pending.push(
        ...response.workflow_runs.filter(run => run.status !== 'completed')
      );
    }
    for (const run of pending) {
      const age = now().getTime() - Date.parse(run.created_at);
      if (
        !states.includes(run.status) ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > MAX_MONITOR_GAP_MS
      ) {
        throw new Error(
          'Availability queue is stale or invalid; do not dispatch another run'
        );
      }
    }
    if (pending.length) {
      return reportStatus(
        'waiting',
        'Availability is already queued or running'
      );
    }
    const path = join(directory, 'state', 'availability-refresh.json');
    const previous = await readJson(path);
    if (previous) {
      const age = now().getTime() - Date.parse(previous.requested_at);
      if (
        previous.version !== 1 ||
        previous.workflow_id !== workflow.id ||
        ![
          'requesting',
          'requested',
          'observed',
          'needs_action',
          'retry_authorized',
        ].includes(previous.status) ||
        !Number.isFinite(age) ||
        age < 0 ||
        (previous.baseline_run_id !== null &&
          !validNumber(previous.baseline_run_id))
      ) {
        throw new Error('Invalid Availability request state; do not reset');
      }
      if (['requesting', 'needs_action'].includes(previous.status)) {
        throw new Error(
          'Availability dispatch outcome needs review; no automatic retry'
        );
      }
      if (previous.status === 'requested') {
        const observed =
          latest &&
          latest.id !== previous.baseline_run_id &&
          Date.parse(latest.updated_at) >= Date.parse(previous.requested_at);
        if (!observed && age >= MONITOR_REFRESH_AFTER_MS) {
          throw new Error(
            'Requested Availability run was not observed; no automatic retry'
          );
        }
        if (!observed) {
          return reportStatus(
            'waiting',
            'Waiting for requested Availability run'
          );
        }
        await saveJson(path, {
          ...previous,
          status: 'observed',
          observed_run_id: latest.id,
        });
      }
      if (age < MONITOR_REFRESH_AFTER_MS) {
        return reportStatus(
          'waiting',
          'Waiting for requested Availability run'
        );
      }
    }
    const request = {
      version: 1,
      workflow_id: workflow.id,
      baseline_run_id: latest?.id ?? null,
      requested_at: now().toISOString(),
      status: 'requesting',
    };
    // Persist intent before the POST: a timeout or process exit cannot silently repeat it.
    await saveJson(path, request);
    try {
      await api(`actions/workflows/${workflow.id}/dispatches`, 'POST', {
        ref: 'main',
      });
      await saveJson(path, { ...request, status: 'requested' });
    } catch (error) {
      await saveJson(path, {
        ...request,
        status: 'needs_action',
        error: error.message,
      });
      throw error;
    }
    return reportStatus(
      'waiting',
      'Requested Availability run after schedule delay',
      {
        requested_at: request.requested_at,
        baseline_run_id: request.baseline_run_id,
      }
    );
  }

  async function poll({ mode = 'check' } = {}) {
    try {
      if (!['check', 'dispatch'].includes(mode)) {
        throw new Error('Invalid polling mode');
      }
      const monitor = await readJson(join(directory, 'state', 'monitor.json'));
      if (monitor?.blocked === true) {
        return reportStatus('needs_action', monitor.message, { blocked: true });
      }
      const config = await readJson(join(directory, 'config.json'));
      if (
        config?.repository !== REPOSITORY ||
        !Number.isFinite(Date.parse(config.enabled_at))
      ) {
        throw new Error('Missing response configuration');
      }
      const response = await api('actions/workflows?per_page=100');
      const workflow = response.workflows?.find(
        item => item.path === WORKFLOW_PATH
      );
      if (!workflow || workflow.state !== 'active') {
        return reportStatus(
          'needs_action',
          'Availability workflow is missing or disabled'
        );
      }
      const runs = await api(
        `actions/workflows/${workflow.id}/runs?branch=main&status=completed&per_page=5`
      );
      if (!Array.isArray(runs.workflow_runs)) {
        throw new Error('Invalid completed Availability run list');
      }
      const latest = runs.workflow_runs.find(isMonitorRun);
      if (!latest) {
        if (mode === 'dispatch') {
          return await requestAvailability(workflow, null);
        }
        return reportStatus(
          'waiting',
          'First availability run has not completed'
        );
      }
      const age = now().getTime() - Date.parse(latest.updated_at);
      if (!Number.isFinite(age) || age < 0 || latest.conclusion !== 'success') {
        return reportStatus(
          'needs_action',
          'Availability run failed or is older than 180 minutes',
          { run_url: latest.html_url }
        );
      }
      let refresh = null;
      if (mode === 'dispatch' && age > MONITOR_REFRESH_AFTER_MS) {
        refresh = await requestAvailability(workflow, latest);
      }
      if (age > MAX_MONITOR_GAP_MS) {
        if (refresh) {
          return refresh;
        }
        return reportStatus(
          'needs_action',
          'Availability run failed or is older than 180 minutes',
          {
            run_url: latest.html_url,
          }
        );
      }
      const issues = await list(
        'issues?state=all&creator=github-actions%5Bbot%5D&sort=created&direction=desc'
      );
      const incidents = issues.filter(
        issue =>
          isIncident(issue) &&
          Date.parse(issue.created_at) >= Date.parse(config.enabled_at)
      );
      if (incidents.filter(issue => issue.state === 'open').length > 1) {
        throw new Error('Multiple open incidents; do not repair automatically');
      }
      const actions = [];
      for (const issue of incidents) {
        const state = await readState(issue.number);
        if (state && TERMINAL_PHASES.includes(state.phase)) {
          continue;
        }
        await trustedIssue(issue.number);
        if (!state) {
          const comments = await list(`issues/${issue.number}/comments`);
          if (
            comments.some(
              comment =>
                comment.user?.login === OWNER &&
                comment.body?.includes(RESPONSE_MARKER)
            )
          ) {
            throw new Error(
              `Response state missing for issue ${issue.number}; do not repeat repair`
            );
          }
        }
        if (
          state &&
          now().getTime() - Date.parse(state.started_at) > MAX_RESPONSE_AGE_MS
        ) {
          throw new Error(
            `Response for issue ${issue.number} exceeded 24 hours; needs manual review`
          );
        }
        if (state?.phase === 'investigating') {
          throw new Error(
            `Interrupted investigation for issue ${issue.number}; do not start another attempt`
          );
        }
        actions.push({
          issue: issue.number,
          issue_state: issue.state,
          issue_url: issue.html_url,
          phase: state?.phase ?? 'new',
          state,
        });
      }
      if (!actions.length && refresh) {
        return refresh;
      }
      return reportStatus(
        actions.length ? 'action' : 'healthy',
        actions.length
          ? 'Resume verified incidents'
          : 'No incident response required',
        { actions }
      );
    } catch (error) {
      return reportStatus('needs_action', error.message, {
        blocked: /HTTP (?:401|403)/.test(error.message),
      });
    }
  }

  async function unblock() {
    const path = join(directory, 'state', 'availability-refresh.json');
    const request = await readJson(path);
    if (request && ['requesting', 'needs_action'].includes(request.status)) {
      if (
        request.version !== 1 ||
        !validNumber(request.workflow_id) ||
        !Number.isFinite(Date.parse(request.requested_at)) ||
        (request.baseline_run_id !== null &&
          !validNumber(request.baseline_run_id))
      ) {
        throw new Error('Invalid Availability request state; do not reset');
      }
      await saveJson(path, {
        ...request,
        status: 'retry_authorized',
        authorized_at: now().toISOString(),
      });
    }
    return reportStatus('waiting', 'User authorized an access recheck', {
      blocked: false,
    });
  }

  async function claim(number) {
    await trustedIssue(number);
    const comments = await list(`issues/${number}/comments`);
    if (
      comments.some(
        comment =>
          comment.user?.login === OWNER &&
          comment.body?.includes(RESPONSE_MARKER)
      )
    ) {
      throw new Error('Incident already claimed remotely');
    }
    const time = now().toISOString();
    const state = {
      version: 1,
      issue: number,
      phase: 'investigating',
      attempt: 1,
      pr: null,
      head_sha: null,
      started_at: time,
      updated_at: time,
      milestones: { response_started: time },
    };
    await mkdir(dirname(statePath(number)), { recursive: true });
    await writeFile(statePath(number), JSON.stringify(state, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    return state;
  }

  async function recordDeferral(number, reason) {
    const explanations = {
      hosting_provider_outage:
        '공식 Vercel 상태에서 관련 서비스 또는 지역 장애를 확인했어요. 업체 복구를 기다리며 코드 수정을 시작하지 않아요.',
      hosting_evidence_unavailable:
        '호스팅 상태를 확인할 증거가 부족해요. 정상이라고 가정해 자동 수정을 시작하지 않아요.',
      platform_or_upstream_error:
        '플랫폼 또는 외부 서비스 오류 응답을 받았어요. 앱 오류인지 업체 오류인지 확정하지 않고 자동 수정을 보류해요.',
      unknown_failure_origin:
        '500 응답·네트워크 실패 등의 원인을 앱 코드로 확정할 수 없어요. 원인 확인이 필요해요.',
      deployment_failed_needs_review:
        '배포 실패 원인을 확인해야 해요. 자동 재배포나 추가 모델 실행을 하지 않아요.',
    };
    if (!explanations[reason]) throw new Error('Unsupported deferral reason');
    await trustedIssue(number);
    const marker = `<!-- bendd-response-triage:v1 issue=${number} -->`;
    const comments = await list(`issues/${number}/comments`);
    const matches = comments.filter(
      c => c.user?.login === OWNER && c.body?.startsWith(marker)
    );
    if (matches.length > 1)
      throw new Error('Duplicate triage comments; inspect before writing');
    const signature = `reason=${reason}`;
    if (matches[0]?.body?.includes(signature)) return;
    const body = `${marker}\n<!-- ${signature} -->\n\n${explanations[reason]}\n\n이번 점검의 Codex 호출: 0회. 이번 판단으로 수정 PR을 만들거나 병합하지 않았어요. 확인 시각: ${now().toISOString()}\n\n[공식 Vercel 상태](https://www.vercel-status.com/)`;
    await api(
      matches[0]
        ? `issues/comments/${matches[0].id}`
        : `issues/${number}/comments`,
      matches[0] ? 'PATCH' : 'POST',
      { body }
    );
  }

  async function checkpoint(number, update) {
    const state = await readState(number);
    if (
      !state ||
      TERMINAL_PHASES.includes(state.phase) ||
      !PHASES.includes(update.phase)
    ) {
      throw new Error('Response cannot be restarted or updated');
    }
    const allowed = [
      'phase',
      'pr',
      'head_sha',
      'report_comment',
      'reason',
      'milestones',
    ];
    if (Object.keys(update).some(key => !allowed.includes(key))) {
      throw new Error('Unsupported response field');
    }
    if (update.phase === 'awaiting_deploy') {
      throw new Error(
        'Only the guarded merge command can enter deployment phase'
      );
    }
    if (
      state.pr !== null &&
      update.pr !== undefined &&
      update.pr !== state.pr
    ) {
      throw new Error('One PR per incident');
    }
    if (
      update.milestones &&
      Object.values(update.milestones).some(
        value => !Number.isFinite(Date.parse(value))
      )
    ) {
      throw new Error('Invalid response milestone');
    }
    const next = validateState({
      ...state,
      ...update,
      milestones: { ...state.milestones, ...update.milestones },
      updated_at: now().toISOString(),
    });
    await saveJson(statePath(number), next);
    return next;
  }

  async function mergeGate(number, sha) {
    const state = await readState(number);
    if (!state || !validNumber(state.pr)) {
      throw new Error('Incident has no registered PR');
    }
    const issue = await trustedIssue(number);
    if (issue.state !== 'open') {
      throw new Error('Incident already closed; do not merge');
    }
    const pr = await api(`pulls/${state.pr}`);
    const files = await list(`pulls/${state.pr}/files`);
    const checkPages = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const batch = await api(
        `commits/${sha}/check-runs?per_page=${PAGE_SIZE}&page=${page}`
      );
      if (!Array.isArray(batch.check_runs)) {
        throw new Error('Invalid commit checks');
      }
      checkPages.push(...batch.check_runs);
      if (batch.check_runs.length < PAGE_SIZE) {
        break;
      }
      if (page === MAX_PAGES) {
        throw new Error('Too many commit checks');
      }
    }
    const statuses = await list(`commits/${sha}/statuses`);
    return assertMerge({ pr, files, checks: checkPages, statuses, state, sha });
  }

  async function merge(number, sha) {
    const gate = await mergeGate(number, sha);
    const result = await api(`pulls/${gate.pr}/merge`, 'PUT', {
      sha: gate.sha,
      merge_method: 'merge',
    });
    if (result?.merged !== true || !/^[a-f0-9]{40}$/.test(result.sha ?? '')) {
      throw new Error('Merge outcome unknown; inspect PR before continuing');
    }
    const state = await readState(number);
    const time = now().toISOString();
    const next = validateState({
      ...state,
      phase: 'awaiting_deploy',
      merge_sha: result.sha,
      updated_at: time,
      milestones: { ...state.milestones, merged: time },
    });
    await saveJson(statePath(number), next);
    return next;
  }

  return {
    poll,
    claim,
    checkpoint,
    mergeGate,
    merge,
    readState,
    unblock,
    recordDeferral,
  };
}

if (isMain(import.meta.url)) {
  const [command, value, argument] = process.argv.slice(2);
  const control = createControl();
  try {
    let result;
    if (command === 'poll') {
      result = await control.poll();
    } else if (command === 'unblock') {
      result = await control.unblock();
    } else if (command === 'claim') {
      result = await control.claim(Number(value));
    } else if (command === 'checkpoint') {
      result = await control.checkpoint(
        Number(value),
        JSON.parse(await readFile(argument, 'utf8'))
      );
    } else if (command === 'merge-gate') {
      result = await control.mergeGate(Number(value), argument);
    } else if (command === 'merge') {
      result = await control.merge(Number(value), argument);
    } else {
      throw new Error(
        'Use poll, claim ISSUE, checkpoint ISSUE FILE, merge-gate ISSUE SHA, or merge ISSUE SHA'
      );
    }
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'needs_action') {
      process.exitCode = 1;
    }
  } catch (error) {
    console.log(
      JSON.stringify({ status: 'needs_action', message: error.message })
    );
    process.exitCode = 1;
  }
}
