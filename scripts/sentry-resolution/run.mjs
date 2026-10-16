import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { createGitHub, createSentry, DeploymentPending } from './api.mjs';
import { resolveIssues, verifyProduction } from './gates.mjs';

const execAsync = promisify(execFile);
const OUTPUT = '.sentry-resolution';
const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 30_000;

async function containsFix(commit, sha) {
  try {
    await execAsync('git', ['merge-base', '--is-ancestor', commit, sha]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const mode = process.argv[2];
  if (!['verify', 'resolve'].includes(mode)) {
    throw new Error(
      'Use: node scripts/sentry-resolution/run.mjs verify|resolve'
    );
  }
  const sha = process.env.DEPLOY_SHA;
  const { stdout } = await execAsync('git', ['rev-parse', 'HEAD']);
  if (stdout.trim() !== sha) {
    throw new Error('Checkout must match DEPLOY_SHA');
  }
  const plan = JSON.parse(
    await readFile(new URL('./issues.json', import.meta.url), 'utf8')
  );
  const github = createGitHub(process.env.GH_TOKEN);
  await mkdir(OUTPUT, { recursive: true });
  if (mode === 'verify') {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await github.production(sha);
        break;
      } catch (error) {
        if (!(error instanceof DeploymentPending) || attempt >= POLL_ATTEMPTS) {
          throw error;
        }
        console.log(
          `Waiting for Vercel Production deployment (${attempt}/${POLL_ATTEMPTS})`
        );
        await delay(POLL_INTERVAL_MS);
      }
    }
    const { chromium } = await import('@playwright/test');
    const { checkProduction } = await import('./regression.mjs');
    // The browser process does not need API credentials.
    const browserEnv = { ...process.env };
    delete browserEnv.GH_TOKEN;
    delete browserEnv.SENTRY_ISSUE_TOKEN;
    const browser = await chromium.launch({ env: browserEnv });
    try {
      const report = await verifyProduction({
        sha,
        plan,
        github,
        containsFix,
        check: async url => {
          const checks = await checkProduction(browser, url, sha);
          await writeFile(
            `${OUTPUT}/checks.json`,
            JSON.stringify(checks, null, 2)
          );
          return checks;
        },
      });
      await writeFile(
        `${OUTPUT}/verified.json`,
        JSON.stringify(report, null, 2)
      );
      console.log(`Production regression checks passed for ${sha}`);
    } finally {
      await browser.close();
    }
  } else {
    const report = JSON.parse(
      await readFile(`${OUTPUT}/verified.json`, 'utf8')
    );
    const result = await resolveIssues({
      sha,
      plan,
      report,
      github,
      containsFix,
      sentry: createSentry(process.env.SENTRY_ISSUE_TOKEN),
      save: result =>
        writeFile(`${OUTPUT}/resolution.json`, JSON.stringify(result, null, 2)),
    });
    console.log(
      `Verified resolved state: ${result.issues.map(issue => issue.shortId).join(', ')}`
    );
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
