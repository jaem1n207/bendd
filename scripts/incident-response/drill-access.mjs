import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT = 'prj_dTKsVA4Kn1Ae6UDA5xw3eUa3Km82';
const TEAM = 'jaemins-crafts';

export function createDrillVercel({ request } = {}) {
  const get =
    request ??
    (async (path, method = 'GET', body) => {
      const { token } = JSON.parse(
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
      if (typeof token !== 'string' || !token)
        throw new Error('Existing Vercel login required');
      const url = new URL(path, 'https://api.vercel.com');
      url.searchParams.set('slug', TEAM);
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok)
        throw new Error(
          `Vercel HTTP ${response.status}; stop and request access`
        );
      return response.json();
    });
  const projectPath = `/v9/projects/${PROJECT}`;
  const accessPath = `/v1/projects/${PROJECT}/protection-bypass`;
  async function preview(sha) {
    if (!/^[a-f0-9]{40}$/.test(sha))
      throw new Error('Exact drill SHA required');
    const response = await get(
      `/v6/deployments?projectId=${PROJECT}&target=preview&limit=100`
    );
    if (!Array.isArray(response.deployments))
      throw new Error('Invalid preview list');
    const match = response.deployments.find(
      d => d.meta?.githubCommitSha === sha
    );
    if (!match) return { status: 'waiting' };
    const detail = await get(
      `/v13/deployments/${encodeURIComponent(match.uid ?? match.id)}`
    );
    if (
      (detail.projectId ?? detail.project?.id) !== PROJECT ||
      ![null, 'preview'].includes(detail.target) ||
      detail.meta?.githubCommitSha !== sha ||
      typeof detail.url !== 'string' ||
      !/^[a-z0-9-]+-jaemins-crafts\.vercel\.app$/.test(detail.url)
    )
      throw new Error('Drill deployment is not the exact project Preview');
    if (['ERROR', 'CANCELED'].includes(detail.readyState))
      throw new Error('Drill Preview failed; no redeployment retry');
    return {
      status: detail.readyState === 'READY' ? 'ready' : 'waiting',
      url: `https://${detail.url}`,
      id: detail.id,
      sha,
    };
  }
  async function withTemporaryAccess(task, onRevoked = async () => {}) {
    const before = await get(projectPath);
    if (before.id !== PROJECT) throw new Error('Unexpected Vercel project');
    const oldKeys = new Set(Object.keys(before.protectionBypass ?? {}));
    const response = await get(accessPath, 'PATCH', {});
    const keys = Object.keys(response.protectionBypass ?? {}).filter(
      key => !oldKeys.has(key)
    );
    if (keys.length !== 1)
      throw new Error(
        'Access creation outcome unknown; inspect before retrying'
      );
    const secret = keys[0];
    try {
      return await task(secret);
    } finally {
      // Revoke only this run's key. Never regenerate or delete someone else's access.
      await get(accessPath, 'PATCH', { revoke: { secret, regenerate: false } });
      const after = await get(projectPath);
      if (
        Object.hasOwn(after.protectionBypass ?? {}, secret) ||
        [...oldKeys].some(
          key => !Object.hasOwn(after.protectionBypass ?? {}, key)
        )
      )
        throw new Error(
          'Access revocation could not be verified; manual action required'
        );
      await onRevoked();
    }
  }
  return { preview, withTemporaryAccess };
}

export function protectedPreviewFetch(origin, secret, fetcher = fetch) {
  const expected = new URL(origin);
  if (
    expected.protocol !== 'https:' ||
    !/^[a-z0-9-]+-jaemins-crafts\.vercel\.app$/.test(expected.hostname)
  )
    throw new Error(
      'Only the verified drill Preview can receive temporary access'
    );
  return async (url, options = {}) => {
    if (new URL(url).origin !== expected.origin)
      throw new Error('Do not send Preview access to another origin');
    const response = await fetcher(url, {
      ...options,
      redirect: 'manual',
      headers: { ...options.headers, 'x-vercel-protection-bypass': secret },
    });
    // No credential-bearing redirect is followed. Access denials are returned for the probe to stop on.
    return response;
  };
}
