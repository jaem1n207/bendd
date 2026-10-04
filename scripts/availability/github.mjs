import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

export const ARTIFACT_NAME = 'availability-state';
export const INCIDENT_MARKER = '<!-- bendd-availability-incident:v1 -->';
export const RECOVERY_MARKER = '<!-- bendd-availability-recovered:v1 -->';
const WORKFLOW_FILE = 'availability.yml';
const PAGE_SIZE = 100;
const execAsync = promisify(execFile);

async function runGh(args, input) {
  try {
    const pending = execAsync('gh', args, {
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (input !== undefined) {
      pending.child.stdin.end(JSON.stringify(input));
    }
    return (await pending).stdout;
  } catch {
    throw new Error(
      'GitHub operation failed; check Actions permissions and logs'
    );
  }
}

export function createGitHub(repo, runId, command = runGh) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(repo) ||
    !/^\d+$/.test(runId)
  ) {
    throw new Error('Invalid GitHub context');
  }
  const root = `repos/${repo}`;

  async function api(path, method = 'GET', input) {
    const args = ['api', `${root}/${path}`, '--method', method];
    if (input !== undefined) {
      args.push('--input', '-');
    }
    const response = await command(args, input);
    return response ? JSON.parse(response) : null;
  }

  async function list(path) {
    const items = [];
    for (let page = 1; ; page += 1) {
      const batch = await api(
        `${path}${path.includes('?') ? '&' : '?'}per_page=${PAGE_SIZE}&page=${page}`
      );
      items.push(...batch);
      if (batch.length < PAGE_SIZE) {
        return items;
      }
    }
  }

  async function loadState() {
    const response = await api(
      `actions/workflows/${WORKFLOW_FILE}/runs?branch=main&status=completed&per_page=10`
    );
    const previous = response.workflow_runs.find(
      run =>
        String(run.id) !== runId &&
        ['schedule', 'workflow_dispatch'].includes(run.event)
    );
    if (!previous) {
      return null;
    }
    const { artifacts } = await api(`actions/runs/${previous.id}/artifacts`);
    const artifact = artifacts.find(
      item => item.name === ARTIFACT_NAME && !item.expired
    );
    if (!artifact) {
      return null;
    }

    const directory = await mkdtemp(join(tmpdir(), 'bendd-availability-'));
    try {
      await command([
        'run',
        'download',
        String(previous.id),
        '--repo',
        repo,
        '--name',
        ARTIFACT_NAME,
        '--dir',
        directory,
      ]);
      return JSON.parse(await readFile(join(directory, 'state.json'), 'utf8'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async function findIncident() {
    const issues = await list(
      'issues?state=open&creator=github-actions%5Bbot%5D'
    );
    const incidents = issues.filter(
      issue => !issue.pull_request && issue.body?.includes(INCIDENT_MARKER)
    );
    if (incidents.length > 1) {
      throw new Error('Multiple availability incidents; review open issues');
    }
    return incidents[0] ?? null;
  }

  async function openIncident(body) {
    return api('issues', 'POST', {
      title: '[가용성] bendd.me 응답을 확인해 주세요',
      body: `${INCIDENT_MARKER}\n\n${body}`,
      assignees: ['jaem1n207'],
    });
  }

  async function recoverIncident(incident, body) {
    const comments = await list(`issues/${incident.number}/comments`);
    if (
      !comments.some(
        comment =>
          comment.user?.login === 'github-actions[bot]' &&
          comment.body?.includes(RECOVERY_MARKER)
      )
    ) {
      await api(`issues/${incident.number}/comments`, 'POST', {
        body: `${RECOVERY_MARKER}\n\n${body}`,
      });
    }
    await api(`issues/${incident.number}`, 'PATCH', {
      state: 'closed',
      state_reason: 'completed',
    });
  }

  return { loadState, findIncident, openIncident, recoverIncident };
}
