const REPOSITORY = 'jaem1n207/bendd';
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const DEPLOY_HOST = /^bendd-[a-z0-9-]+-jaemins-crafts\.vercel\.app$/;
const API_TIMEOUT_MS = 15_000;
const ISSUE_WRITE_SCOPES = ['event:write', 'event:admin'];

export class DeploymentPending extends Error {}

function apiClient(root, token, label, fetcher) {
  return async (path, method = 'GET', body) => {
    let response;
    try {
      response = await fetcher(new URL(path, root), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch {
      throw new Error(`${label} request failed`);
    }
    if (!response.ok) {
      throw new Error(`${label} request failed (HTTP ${response.status})`);
    }
    return response.json();
  };
}

export function createGitHub(token, fetcher = fetch) {
  if (!token?.trim()) {
    throw new Error('GH_TOKEN is required');
  }
  const api = apiClient('https://api.github.com/', token, 'GitHub', fetcher);
  const root = `/repos/${REPOSITORY}`;

  async function production(sha) {
    if (!SHA_PATTERN.test(sha)) {
      throw new Error('Invalid deployment SHA');
    }
    const head = await api(`${root}/git/ref/heads/main`);
    if (head.object?.sha !== sha) {
      throw new Error('Deployment is not the current main commit');
    }
    const { workflow_runs: runs } = await api(
      `${root}/actions/workflows/ci.yml/runs?head_sha=${sha}&branch=main&event=push&per_page=1`
    );
    const ci = runs?.[0];
    if (
      ci?.head_sha !== sha ||
      ci.head_branch !== 'main' ||
      ci.event !== 'push' ||
      ci.status !== 'completed' ||
      ci.conclusion !== 'success'
    ) {
      throw new Error('Successful main CI is required for the deployment SHA');
    }
    const deployments = await api(
      `${root}/deployments?sha=${sha}&per_page=100`
    );
    const deployment = deployments.find(
      item => item.environment === 'Production'
    );
    if (!deployment) {
      throw new DeploymentPending(
        'Vercel Production deployment is not available'
      );
    }
    if (
      deployment.sha !== sha ||
      deployment.creator?.login !== 'vercel[bot]' ||
      !Number.isSafeInteger(deployment.id) ||
      deployment.id <= 0
    ) {
      throw new Error('Untrusted production deployment');
    }
    const statuses = await api(`${root}/deployments/${deployment.id}/statuses`);
    const status = statuses[0];
    if (
      !status ||
      ['pending', 'queued', 'in_progress'].includes(status.state)
    ) {
      throw new DeploymentPending('Vercel Production deployment is not ready');
    }
    if (
      status.state !== 'success' ||
      status.environment !== 'Production' ||
      status.creator?.login !== 'vercel[bot]'
    ) {
      throw new Error('Vercel Production deployment did not succeed');
    }
    const url = new URL(status.environment_url);
    if (
      url.protocol !== 'https:' ||
      !DEPLOY_HOST.test(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    ) {
      throw new Error('Untrusted production deployment URL');
    }
    return {
      id: deployment.id,
      sha,
      url: 'https://bendd.me',
      deploymentUrl: url.origin,
    };
  }

  return { production };
}

export function createSentry(token, fetcher = fetch) {
  if (!token?.trim()) {
    throw new Error('SENTRY_ISSUE_TOKEN is required');
  }
  const api = apiClient('https://us.sentry.io/', token, 'Sentry', fetcher);
  const authApi = apiClient('https://sentry.io/', token, 'Sentry', fetcher);
  async function checkAccess() {
    // Retain only the scope and stable user ID needed for assignment, never the profile.
    const response = await authApi('/api/0/');
    const scopes = response?.auth?.scopes;
    const issueWriteScope =
      Array.isArray(scopes) &&
      scopes.every(scope => typeof scope === 'string') &&
      ISSUE_WRITE_SCOPES.find(scope => scopes.includes(scope));
    if (!issueWriteScope) {
      throw new Error('Sentry token needs event:write (or event:admin)');
    }
    const id = response?.user?.id;
    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
      throw new Error('Sentry token must identify its resolving user');
    }
    return { issueWriteScope, resolver: { type: 'user', id } };
  }
  async function issue(id, method = 'GET', body) {
    if (!/^\d+$/.test(id)) {
      throw new Error('Invalid Sentry issue ID');
    }
    return api(`/api/0/organizations/jaemin/issues/${id}/`, method, body);
  }
  function actor(resolver) {
    if (resolver?.type !== 'user' || !/^[1-9]\d*$/.test(resolver.id)) {
      throw new Error('Invalid Sentry resolving user');
    }
    return `user:${resolver.id}`;
  }
  return {
    checkAccess,
    get: id => issue(id),
    resolve: (id, resolver) =>
      issue(id, 'PUT', {
        status: 'resolved',
        assignedTo: actor(resolver),
      }),
    assign: (id, resolver) => issue(id, 'PUT', { assignedTo: actor(resolver) }),
  };
}
