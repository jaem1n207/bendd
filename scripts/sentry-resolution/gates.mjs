import { createHash } from 'node:crypto';

export const CHECK_NAMES = [
  'article:property',
  'article:getItem',
  'article:setItem',
  'article:removeItem',
  'home:property',
  'article:normal',
];
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const MAX_REPORT_AGE_MS = 30 * 60_000;
const PROJECT_ID = '4512194092859392';

function validatePlan(plan) {
  const ids = new Set();
  const shortIds = new Set();
  if (
    plan?.version !== 1 ||
    !Array.isArray(plan.issues) ||
    !plan.issues.length
  ) {
    throw new Error('Invalid resolution plan');
  }
  for (const issue of plan.issues) {
    if (
      !/^\d+$/.test(issue.id) ||
      !/^BENDD-[A-Z0-9]+$/.test(issue.shortId) ||
      !SHA_PATTERN.test(issue.fixCommit) ||
      !Number.isFinite(Date.parse(issue.observedThrough)) ||
      ids.has(issue.id) ||
      shortIds.has(issue.shortId)
    ) {
      throw new Error('Invalid resolution plan issue');
    }
    ids.add(issue.id);
    shortIds.add(issue.shortId);
  }
}

function hashPlan(plan) {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

function validateChecks(checks) {
  if (
    !Array.isArray(checks) ||
    checks.length !== CHECK_NAMES.length ||
    new Set(checks.map(check => check.name)).size !== CHECK_NAMES.length ||
    !checks.every(
      check => CHECK_NAMES.includes(check.name) && check.passed === true
    )
  ) {
    throw new Error('All production regression checks must pass');
  }
}

function sameDeployment(left, right) {
  if (
    left?.id !== right.id ||
    left.sha !== right.sha ||
    left.url !== right.url ||
    left.deploymentUrl !== right.deploymentUrl
  ) {
    throw new Error('Production deployment changed');
  }
}

async function validateFixes(plan, sha, containsFix) {
  validatePlan(plan);
  if (!SHA_PATTERN.test(sha)) {
    throw new Error('Invalid deployment SHA');
  }
  for (const commit of new Set(plan.issues.map(issue => issue.fixCommit))) {
    if (!(await containsFix(commit, sha))) {
      throw new Error('Deployment does not contain the fix commit');
    }
  }
}

export async function verifyProduction({
  sha,
  plan,
  github,
  containsFix,
  check,
  now = Date.now,
}) {
  await validateFixes(plan, sha, containsFix);
  const deployment = await github.production(sha);
  const checks = await check(deployment.url);
  validateChecks(checks);
  sameDeployment(deployment, await github.production(sha));
  return {
    version: 1,
    sha,
    deployment,
    checks,
    planHash: hashPlan(plan),
    checkedAt: new Date(now()).toISOString(),
  };
}

function validateIssue(issue, expected) {
  if (
    issue?.id !== expected.id ||
    issue.shortId !== expected.shortId ||
    issue.project?.id !== PROJECT_ID ||
    issue.project.slug !== 'bendd' ||
    !['unresolved', 'resolved'].includes(issue.status) ||
    !Number.isFinite(Date.parse(issue.lastSeen)) ||
    Date.parse(issue.lastSeen) > Date.parse(expected.observedThrough)
  ) {
    throw new Error(
      `Sentry issue identity, state, or recurrence changed: ${expected.shortId}`
    );
  }
}

function readAssignee(issue) {
  const assignee = issue.assignedTo;
  if (assignee == null) {
    return null;
  }
  if (
    !['user', 'team'].includes(assignee.type) ||
    !/^[1-9]\d*$/.test(assignee.id)
  ) {
    throw new Error('Invalid Sentry assignee response');
  }
  return { type: assignee.type, id: assignee.id };
}

function sameAssignee(assignee, resolver) {
  return assignee?.type === resolver.type && assignee.id === resolver.id;
}

export async function resolveIssues({
  sha,
  plan,
  report,
  github,
  containsFix,
  sentry,
  save,
  now = Date.now,
}) {
  await validateFixes(plan, sha, containsFix);
  const age = now() - Date.parse(report?.checkedAt);
  if (
    report?.version !== 1 ||
    report.sha !== sha ||
    report.planHash !== hashPlan(plan) ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > MAX_REPORT_AGE_MS
  ) {
    throw new Error('Invalid or stale production verification report');
  }
  validateChecks(report.checks);
  sameDeployment(report.deployment, await github.production(sha));
  const sentryAccess = await sentry.checkAccess();
  const resolver = sentryAccess?.resolver;
  if (
    resolver?.type !== 'user' ||
    typeof resolver.id !== 'string' ||
    !/^[1-9]\d*$/.test(resolver.id)
  ) {
    throw new Error('Sentry token must identify its resolving user');
  }
  const issues = [];
  // Preflight the entire explicit list before changing any issue.
  for (const expected of plan.issues) {
    const current = await sentry.get(expected.id);
    validateIssue(current, expected);
    readAssignee(current);
    issues.push({
      id: expected.id,
      shortId: expected.shortId,
      status: 'pending',
    });
  }
  const result = { ...report, sentryAccess, phase: 'verified', issues };
  await save(result);
  sameDeployment(report.deployment, await github.production(sha));
  for (const [index, expected] of plan.issues.entries()) {
    const current = await sentry.get(expected.id);
    validateIssue(current, expected);
    const previousStatus = current.status;
    const previousAssignee = readAssignee(current);
    const expectedAssignee =
      current.status === 'resolved' && previousAssignee
        ? previousAssignee
        : resolver;
    let action = 'none';
    if (current.status !== 'resolved') {
      await sentry.resolve(expected.id, resolver);
      action = 'resolve';
    } else if (previousAssignee === null) {
      await sentry.assign(expected.id, resolver);
      action = 'assign';
    }
    const updated = action === 'none' ? current : await sentry.get(expected.id);
    validateIssue(updated, expected);
    const assignedTo = readAssignee(updated);
    if (
      updated.status !== 'resolved' ||
      !sameAssignee(assignedTo, expectedAssignee)
    ) {
      throw new Error(
        `Sentry resolution/assignee read-back failed: ${expected.shortId}`
      );
    }
    Object.assign(issues[index], {
      previousStatus,
      previousAssignee,
      action,
      status: 'resolved',
      assignedTo,
    });
    await save(result);
  }
  result.phase = 'resolved';
  await save(result);
  return result;
}
