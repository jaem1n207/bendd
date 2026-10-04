import { isMain } from './paths.mjs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT = 'prj_dTKsVA4Kn1Ae6UDA5xw3eUa3Km82';
const TEAM = 'jaemins-crafts';
const SHA = /^[a-f0-9]{40}$/;

export function deploymentIdentity(value) {
  return {
    id: value.id ?? value.uid,
    sha: value.meta?.githubCommitSha ?? value.gitSource?.sha ?? null,
    state: value.readyState ?? value.state,
    target: value.target,
    project_id: value.projectId ?? value.project?.id,
    url: value.url,
  };
}

export function createVercelReader({ request } = {}) {
  const get =
    request ??
    (async (path, query = {}) => {
      let token;
      try {
        const auth = JSON.parse(
          await readFile(
            join(
              homedir(),
              'Library',
              'Application Support',
              'com.vercel.cli',
              'auth.json'
            ),
            'utf8'
          )
        );
        token = auth.token;
      } catch {
        throw new Error(
          'Existing Vercel CLI login required; do not copy credentials'
        );
      }
      if (typeof token !== 'string' || !token)
        throw new Error('Vercel CLI login is missing');
      const url = new URL(path, 'https://api.vercel.com');
      url.search = new URLSearchParams({ slug: TEAM, ...query }).toString();
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok)
        throw new Error(
          `Vercel HTTP ${response.status}; stop and request access`
        );
      // The API can return private environment fields. Only projected deployment identity leaves this module.
      return response.json();
    });

  async function current() {
    const identity = deploymentIdentity(
      await get('/v13/deployments/bendd.me', { withGitRepoInfo: 'true' })
    );
    if (
      identity.project_id !== PROJECT ||
      identity.target !== 'production' ||
      !SHA.test(identity.sha ?? '')
    ) {
      throw new Error('Production deployment identity mismatch');
    }
    return identity;
  }

  async function readiness(sha) {
    if (!SHA.test(sha ?? '')) throw new Error('Missing exact merge SHA');
    const alias = await current();
    if (alias.sha === sha && alias.state === 'READY')
      return { status: 'ready', deployment: alias };
    const list = await get('/v6/deployments', {
      projectId: PROJECT,
      target: 'production',
      limit: '20',
    });
    if (!Array.isArray(list.deployments))
      throw new Error('Invalid Vercel deployment list');
    const match = list.deployments
      .map(deploymentIdentity)
      .find(item => item.sha === sha);
    if (!match) return { status: 'waiting' };
    const deployment = deploymentIdentity(
      await get(`/v13/deployments/${encodeURIComponent(match.id)}`, {
        withGitRepoInfo: 'true',
      })
    );
    if (
      deployment.project_id !== PROJECT ||
      deployment.target !== 'production' ||
      deployment.sha !== sha
    ) {
      throw new Error('Merge deployment identity mismatch');
    }
    if (['ERROR', 'CANCELED'].includes(deployment.state))
      return { status: 'failed', deployment };
    return { status: 'waiting', deployment };
  }
  return { current, readiness };
}

if (isMain(import.meta.url)) {
  try {
    const reader = createVercelReader();
    const result = process.argv[2]
      ? await reader.readiness(process.argv[2])
      : await reader.current();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify({ status: 'needs_action', message: error.message })
    );
    process.exitCode = 1;
  }
}
