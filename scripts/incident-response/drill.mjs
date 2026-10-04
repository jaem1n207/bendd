import { execFile } from 'node:child_process';
import {
  mkdir,
  readFile,
  realpath,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { checkAvailability } from '../check-availability.mjs';
import { runMonitor } from '../availability/monitor.mjs';
import { githubApi } from './control.mjs';
import { requireSubscription, runProjectTurn } from './dispatch.mjs';
import { createDrillVercel, protectedPreviewFetch } from './drill-access.mjs';
import { SOURCE_FILES, sha256 } from './integrity.mjs';
import { SOURCE_DIRECTORY, isMain, runtimeDirectory } from './paths.mjs';
import {
  INCIDENT_MARKER,
  OWNER,
  REPOSITORY,
  assertMerge,
  isIncident,
  validateState,
} from './policy.mjs';
import { createWatcher, checksReadiness } from './watch.mjs';
import { createVercelReader } from './vercel-read.mjs';

const exec = promisify(execFile);
const FULL_SHA = /^[a-f0-9]{40}$/;
const ID = /^[a-z0-9-]+$/;
const marker = id => `<!-- bendd-incident-drill:v1 id=${id} -->`;
const stamp = () => new Date().toISOString();
const koreanTime = value =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value)) + ' KST';
const save = async (path, value) =>
  writeFile(path, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
const progress = (stage, data = {}) =>
  console.log(JSON.stringify({ stage, ...data }));

export function assertDrillMerge({
  pr,
  files,
  checks,
  statuses,
  state,
  sha,
  id,
}) {
  if (
    !ID.test(id) ||
    pr.base?.ref !== `drill/${id}` ||
    pr.head?.ref !== `fix/drill-${id}` ||
    !pr.body?.includes(marker(id))
  )
    throw new Error(
      'Drill can only merge its own PR into its exact rehearsal branch; main is forbidden'
    );
  // The unchanged production gate still checks the exact SHA, author, scope, CI/CodeQL and Preview.
  return assertMerge({
    pr: {
      ...pr,
      head: { ...pr.head, ref: `fix/incident-${state.issue}` },
      base: { ...pr.base, ref: 'main' },
      body: `<!-- bendd-codex-fix:v1 issue=${state.issue} -->`,
    },
    files,
    checks,
    statuses,
    state,
    sha,
  });
}

async function waitFor(label, check, minutes = 20) {
  const deadline = Date.now() + minutes * 60_000;
  while (Date.now() < deadline) {
    const value = await check();
    if (value.status === 'ready') return value;
    if (value.status !== 'waiting')
      throw new Error(`${label} failed; no automatic retry`);
    await delay(15_000);
  }
  throw new Error(
    `${label} exceeded wait limit; inspect without restarting the model`
  );
}

async function gateData(pr, sha) {
  const [files, checkResult, statuses] = await Promise.all([
    githubApi(`pulls/${pr}/files?per_page=100`),
    githubApi(`commits/${sha}/check-runs?per_page=100`),
    githubApi(`commits/${sha}/statuses?per_page=100`),
  ]);
  if (
    files.length >= 100 ||
    checkResult.check_runs.length >= 100 ||
    statuses.length >= 100
  )
    throw new Error('Drill gate pagination requires manual review');
  return { files, checks: checkResult.check_runs, statuses };
}

export async function runDrill(directory) {
  const id = `availability-${Date.now()}`;
  if (!directory)
    directory = join(
      homedir(),
      '.codex',
      'automations',
      'bendd-incident-drills',
      id
    );
  directory = resolve(directory);
  const config = JSON.parse(
    await readFile(join(runtimeDirectory(), 'config.json'), 'utf8')
  );
  const project = await realpath(config.project_path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  directory = await realpath(directory);
  if (
    !relative(project, directory).startsWith('..') ||
    directory === runtimeDirectory() ||
    directory.startsWith(`${runtimeDirectory()}/`)
  )
    throw new Error(
      'Drill must use a separate directory outside the project and live responder'
    );
  const runPath = join(directory, 'drill.json');
  const record = {
    version: 1,
    id,
    directory,
    status: 'preparing',
    started_at: stamp(),
    model_calls: 0,
    access_revoked: false,
  };
  await writeFile(runPath, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
  await mkdir(join(directory, 'results'), { mode: 0o700 });
  await mkdir(join(directory, 'state'), { mode: 0o700 });
  await save(join(directory, 'config.json'), config);
  const persist = async update => {
    Object.assign(record, update);
    await save(runPath, record);
  };
  const git = async (args, cwd = project) =>
    (
      await exec('git', args, { cwd, timeout: 60_000, maxBuffer: 1024 * 1024 })
    ).stdout.trim();
  let responseState = null;
  let issue;
  try {
    const production = await createVercelReader().current();
    const baseline = await checkAvailability();
    if (production.state !== 'READY' || baseline.results.some(row => !row.ok))
      throw new Error('Production is not healthy; do not start a rehearsal');
    await requireSubscription(config);
    await git(['fetch', 'origin', 'main']);
    const mainSha = await git(['rev-parse', 'origin/main']);
    if (!FULL_SHA.test(mainSha))
      throw new Error('Missing immutable drill base');
    const base = join(directory, 'base');
    const worktree = join(directory, 'fix');
    await git(['worktree', 'add', '-b', `drill/${id}`, base, mainSha]);
    await symlink(
      join(SOURCE_DIRECTORY, '..', '..', 'node_modules'),
      join(base, 'node_modules')
    );
    const file = join(base, 'src/app/api/feed/route.ts');
    const content = await readFile(file, 'utf8');
    if (!content.includes('<rss xmlns:') || !content.includes('</rss>'))
      throw new Error('Fault fixture no longer matches RSS route');
    await writeFile(
      file,
      content
        .replace('<rss xmlns:', '<feed xmlns:')
        .replace('</rss>', '</feed>')
    );
    await git(['add', 'src/app/api/feed/route.ts'], base);
    await git(
      ['commit', '-m', 'test(drill): 리허설 전용 RSS 형식 오류 주입'],
      base
    );
    const brokenSha = await git(['rev-parse', 'HEAD'], base);
    await git(['push', 'origin', `HEAD:refs/heads/drill/${id}`], base);
    await git([
      'worktree',
      'add',
      '-b',
      `fix/drill-${id}`,
      worktree,
      brokenSha,
    ]);
    await symlink(
      join(SOURCE_DIRECTORY, '..', '..', 'node_modules'),
      join(worktree, 'node_modules')
    );
    await persist({
      main_sha: mainSha,
      broken_sha: brokenSha,
      base_branch: `drill/${id}`,
      fix_branch: `fix/drill-${id}`,
      worktree,
      production_before: production,
    });
    progress('waiting_for_fault_preview', { directory, branch: `drill/${id}` });
    const vercel = createDrillVercel();
    const broken = await waitFor('fault Preview', () =>
      vercel.preview(brokenSha)
    );
    await persist({ broken_preview: broken });
    await vercel.withTemporaryAccess(
      async secret => {
        const probeUrl = async url => {
          const report = await checkAvailability(
            url,
            protectedPreviewFetch(url, secret)
          );
          if (report.results.some(row => [401, 403].includes(row.status)))
            throw new Error('Preview HTTP 401/403; stop and request access');
          if (report.results.some(row => row.status >= 300 && row.status < 400))
            throw new Error(
              'Preview redirects to protected or unexpected content; stop'
            );
          return report;
        };
        let availability = null;
        const reports = [];
        const driver = {
          loadState: async () => availability,
          findIncident: async () => null,
          openIncident: async details => {
            issue = await githubApi('issues', 'POST', {
              title: `[장애 리허설] RSS 응답 복구 · ${id}`,
              body: `${marker(id)}\n\nPreview 전용 장애 리허설입니다. 운영 장애가 아니며 main에 병합하지 않습니다.\n\n${details}`,
              assignees: [OWNER],
            });
            if (isIncident(issue))
              throw new Error(
                'Rehearsal issue must never match the live responder'
              );
            await persist({
              issue: issue.number,
              issue_url: issue.html_url,
              detected_at: stamp(),
            });
          },
          recoverIncident: async () => {
            throw new Error('Unexpected early recovery');
          },
        };
        for (let index = 0; index < 2; index++) {
          await runMonitor({
            github: driver,
            check: async () => {
              const report = await probeUrl(broken.url);
              if (
                report.results.filter(row => !row.ok).length !== 1 ||
                report.results.find(row => row.path === '/rss.xml').ok
              )
                throw new Error(
                  'Fault is not restricted to the intended RSS content failure'
                );
              reports.push(report);
              return report;
            },
            save: async result => {
              availability = result.state;
              await save(
                join(directory, 'results', `failure-${index + 1}.json`),
                result
              );
            },
            runUrl: broken.url,
          });
          if (index === 0) await delay(2000);
        }
        if (!issue)
          throw new Error(
            'Two-failure detection did not create the rehearsal issue'
          );
        progress('fault_detected', {
          issue_url: issue.html_url,
          preview: broken.url,
        });
        const statePath = join(directory, 'state', `${issue.number}.json`);
        const rawIssue = async () => {
          const raw = await githubApi(`issues/${issue.number}`);
          if (
            raw.user.login !== OWNER ||
            !raw.body.startsWith(marker(id)) ||
            !raw.assignees.some(a => a.login === OWNER)
          )
            throw new Error('Rehearsal issue identity changed');
          return raw;
        };
        const control = {
          poll: async () =>
            responseState?.phase === 'completed'
              ? { status: 'healthy', message: 'Drill already completed' }
              : {
                  status: 'action',
                  actions: [
                    {
                      issue: issue.number,
                      issue_state: 'open',
                      issue_url: issue.html_url,
                      phase: 'new',
                      kind: 'drill',
                      state: responseState,
                    },
                  ],
                },
          claim: async number => {
            if (number !== issue.number || responseState)
              throw new Error('Rehearsal claim cannot repeat');
            responseState = validateState({
              version: 1,
              issue: number,
              phase: 'investigating',
              attempt: 1,
              pr: null,
              head_sha: null,
              started_at: stamp(),
              updated_at: stamp(),
              milestones: {},
            });
            await writeFile(statePath, JSON.stringify(responseState), {
              flag: 'wx',
              mode: 0o600,
            });
            return responseState;
          },
          checkpoint: async (number, update) => {
            if (number !== issue.number || !responseState)
              throw new Error('Drill state mismatch');
            responseState = validateState({
              ...responseState,
              ...update,
              updated_at: stamp(),
            });
            await save(statePath, responseState);
            return responseState;
          },
          readState: async () => responseState,
        };
        const fingerprints = Object.fromEntries(
          await Promise.all(
            SOURCE_FILES.map(async name => [
              name,
              sha256(await readFile(join(SOURCE_DIRECTORY, name))),
            ])
          )
        );
        const watcher = createWatcher({
          directory,
          control,
          // Explicit drill adapter: a verified human-authored drill issue is projected for the unchanged watcher core.
          api: async path => {
            if (path !== `issues/${issue.number}`)
              throw new Error('Unsupported drill API request');
            const raw = await rawIssue();
            return {
              ...raw,
              user: { login: 'github-actions[bot]' },
              body: `${INCIDENT_MARKER}\n${raw.body}`,
            };
          },
          integrity: async () => {
            for (const [name, hash] of Object.entries(fingerprints))
              if (sha256(await readFile(join(SOURCE_DIRECTORY, name))) !== hash)
                throw new Error('Trusted source changed during drill');
          },
          probe: () => probeUrl(broken.url),
          prepare: async () => worktree,
          alert: async () => {},
          runner: async input => {
            const prompt = `사용자는 Bendd 장애 대응 리허설과 테스트 PR 생성을 승인했습니다. 실제 운영 장애가 아닙니다. bendd 프로젝트의 새 세션, ChatGPT 구독, gpt-6.1-sol / High로 이 RSS 오류 한 건만 수정하세요.
이슈 ${issue.html_url}; Preview ${broken.url}; 관측 결과 ${JSON.stringify(reports[1])}.
현재 worktree ${worktree}, 브랜치 fix/drill-${id}는 RSS 오류를 주입한 drill/${id}에서 분리했습니다. 적용되는 AGENTS.md를 읽으세요. 원본 프로젝트, main, 제어 소스 ${SOURCE_DIRECTORY}, 서비스 설정/비밀 값은 변경하지 마세요. Preview 접근 키는 이 세션에 전달하지 않습니다.
먼저 RSS 루트와 응답을 확인하는 의미 있는 회귀 검사를 src/app/api/feed/에 추가하고 실제 실패를 확인하세요. 실패 증거를 ${join(directory, 'results/red.json')}에 {command,exit_code,stdout}로 저장하세요. 그 후 최소 수정과 같은 검사의 성공 증거를 results/green.json에 저장하세요. 인증/환경 변수 출력은 하지 마세요. pnpm만 사용하고 타입·lint·unit·build 등 적용되는 gate를 완료하세요. node_modules는 선언된 동일 lockfile 설치에 연결되어 있습니다.
커밋은 한국어 Conventional Commit입니다. fix/drill-${id}만 push하세요. PR은 제목에 [장애 리허설], 본문 첫 줄 ${marker(id)}, Assignee jaem1n207로 만드세요. 기존 CodeQL default setup 실행을 위해 base main의 Draft PR로 생성하세요. 이 Draft는 병합 금지이며 제어기가 검사 후 base를 drill/${id}로 전환합니다. 직접 병합·배포·PR ready·브랜치 삭제를 하지 마세요. 다른 PR을 만들지 마세요. 실제 원인과 RED/GREEN 검증 결과를 PR 본문에 설명하세요. PR 생성 직후 attach_artifact 도구가 있으면 연결하세요.
${join(directory, 'results/fix.json')}에 {pr: 실제번호, head_sha: 40자리 실제커밋, root_cause: 짧은한국어원인}를 저장하세요. 없던 이슈/PR/테스트 성공을 지어내지 마세요. 401/403, 자동 승인 검토 거부, 구독 한도는 재시도·우회 없이 중단하고 필요한 사용자 조치를 최종 응답에 적으세요. 기존 세션 resume/fork나 메시지 전달은 하지 마세요. 최종 응답은 한국어로 실제 PR URL과 검증을 짧게 보고하세요.`;
            await persist({ model_started_at: stamp() });
            const result = await runProjectTurn({
              ...input,
              prompt,
              timeoutMs: 45 * 60_000,
            });
            await persist({
              model_calls: result.thread_id ? 1 : 0,
              model_result: result,
              model_finished_at: stamp(),
            });
            if (result.exit_code !== 0) return result;
            const plan = JSON.parse(
              await readFile(join(directory, 'results/fix.json'), 'utf8')
            );
            if (
              !Number.isSafeInteger(plan.pr) ||
              !FULL_SHA.test(plan.head_sha ?? '') ||
              typeof plan.root_cause !== 'string'
            )
              throw new Error('Missing verified model repair result');
            const pr = await githubApi(`pulls/${plan.pr}`);
            if (
              pr.head.ref !== `fix/drill-${id}` ||
              pr.head.sha !== plan.head_sha ||
              pr.base.ref !== 'main' ||
              pr.draft !== true ||
              !pr.body?.startsWith(marker(id)) ||
              pr.user.login !== OWNER
            )
              throw new Error('Draft drill PR identity mismatch');
            for (const [name, expected] of [
              ['red', false],
              ['green', true],
            ]) {
              const proof = JSON.parse(
                await readFile(
                  join(directory, 'results', `${name}.json`),
                  'utf8'
                )
              );
              if (
                typeof proof.command !== 'string' ||
                (proof.exit_code === 0) !== expected
              )
                throw new Error('Missing RED/GREEN proof');
            }
            await persist({
              pr: plan.pr,
              pr_url: pr.html_url,
              fix_sha: plan.head_sha,
              root_cause: plan.root_cause,
            });
            await control.checkpoint(issue.number, {
              phase: 'awaiting_checks',
              pr: plan.pr,
              head_sha: plan.head_sha,
            });
            return result;
          },
        });
        const executed = await watcher.run();
        await persist({
          watcher_result: executed,
          model_calls: executed.codex_invocations_this_run,
        });
        if (
          executed.status !== 'responded' ||
          executed.codex_invocations_this_run !== 1
        )
          throw new Error(
            `Drill did not complete the repair: ${executed.message}`
          );
        progress('repair_pr_created', {
          pr_url: record.pr_url,
          session: record.model_result.session_name,
        });
        await waitFor('Draft CI/CodeQL/Preview', async () => {
          const data = await gateData(record.pr, record.fix_sha);
          return {
            status: checksReadiness(data.checks, data.statuses, record.fix_sha),
          };
        });
        // main was only the Draft validation base. Move away before making the PR mergeable.
        const moved = await githubApi(`pulls/${record.pr}`, 'PATCH', {
          base: `drill/${id}`,
        });
        if (moved.base.ref !== `drill/${id}` || moved.draft !== true)
          throw new Error('Could not verify rehearsal-only PR base');
        await exec(
          'gh',
          ['pr', 'ready', String(record.pr), '--repo', REPOSITORY],
          { timeout: 30_000 }
        );
        await waitFor('rehearsal CI/Preview', async () => {
          const data = await gateData(record.pr, record.fix_sha);
          return {
            status: checksReadiness(data.checks, data.statuses, record.fix_sha),
          };
        });
        const fixed = await waitFor('fixed Preview', () =>
          vercel.preview(record.fix_sha)
        );
        const fixedReport = await probeUrl(fixed.url);
        if (fixedReport.results.some(row => !row.ok))
          throw new Error('Repair Preview did not recover all four routes');
        await save(join(directory, 'results/fixed-preview.json'), fixedReport);
        const data = await gateData(record.pr, record.fix_sha);
        const pr = await githubApi(`pulls/${record.pr}`);
        assertDrillMerge({
          ...data,
          pr,
          state: responseState,
          sha: record.fix_sha,
          id,
        });
        const merged = await githubApi(`pulls/${record.pr}/merge`, 'PUT', {
          sha: record.fix_sha,
          merge_method: 'merge',
        });
        if (merged.merged !== true || !FULL_SHA.test(merged.sha ?? ''))
          throw new Error('Drill merge outcome unknown');
        await persist({ merge_sha: merged.sha, merged_at: stamp() });
        progress('merged_into_rehearsal_branch', {
          merge_sha: merged.sha,
          base: `drill/${id}`,
        });
        const recovered = await waitFor('merged Preview', () =>
          vercel.preview(merged.sha)
        );
        for (let index = 0; index < 2; index++) {
          const report = await probeUrl(recovered.url);
          if (report.results.some(row => !row.ok))
            throw new Error('Merged Preview failed recovery verification');
          await save(
            join(directory, 'results', `recovery-${index + 1}.json`),
            report
          );
          if (index === 0) await delay(2000);
        }
        await control.checkpoint(issue.number, { phase: 'completed' });
        const duplicate = await watcher.run();
        if (
          duplicate.codex_invocations_this_run !== 0 ||
          duplicate.codex_invocations_total !== 1
        )
          throw new Error('Completed drill caused duplicate model usage');
        await persist({
          recovered_at: stamp(),
          recovered_preview: recovered,
          duplicate_result: duplicate,
        });
      },
      () => persist({ access_revoked: true })
    );
    const after = await createVercelReader().current();
    if (
      after.id !== record.production_before.id ||
      after.sha !== record.production_before.sha
    )
      throw new Error(
        'Production identity changed during rehearsal; inspect before claiming isolation'
      );
    const report = `${marker(id)}\n\n## 장애 대응 리허설 결과\n\nPreview 전용 리허설을 완료했어요. 운영 장애나 운영 복구 시간이 아닙니다. 두 번의 실패·복구 관측 간격은 각각 2초로 단축했으며, 30분 예약 실행을 증명하지 않습니다.\n\n- 원인: ${record.root_cause}\n- 수정 PR: ${record.pr_url}\n- 장애 주입 커밋: \`${record.broken_sha}\`\n- 수정 커밋: \`${record.fix_sha}\`\n- 리허설 병합 커밋: \`${record.merge_sha}\`\n- 감지: ${koreanTime(record.detected_at)}\n- 모델 시작: ${koreanTime(record.model_started_at)}\n- PR 준비: ${koreanTime(record.model_finished_at)}\n- 병합: ${koreanTime(record.merged_at)}\n- 복구 확인: ${koreanTime(record.recovered_at)}\n- 감지부터 복구 확인: ${Math.round((Date.parse(record.recovered_at) - Date.parse(record.detected_at)) / 1000)}초\n- 모델 호출: 1회 · ChatGPT 구독 · gpt-6.1-sol / High · 새 Bendd 세션\n- 세션: \`${record.model_result.thread_id}\`\n- 정상·완료 재점검 모델 호출: 0회\n- 필수 CI·CodeQL·Preview, RED/GREEN, 네 경로 복구: 통과\n- Production 배포 ID·SHA: 전후 동일\n- 임시 Preview 접근 키: 삭제 및 회수 확인\n\n실제 운영 bot 이슈의 출처·Production alias·지역별 업체 장애·3단계 모델 재개·실제 30분 예약 실행은 이 리허설에서 별도로 증명하지 않았어요. 회귀 검사와 실제 장애 증거를 구분해 기록합니다.\n`;
    await writeFile(join(directory, 'results/postmortem.md'), report, {
      mode: 0o600,
    });
    const comment = await githubApi(`issues/${record.issue}/comments`, 'POST', {
      body: report,
    });
    await githubApi(`issues/${record.issue}`, 'PATCH', {
      state: 'closed',
      state_reason: 'completed',
    });
    // Only this run's fully merged rehearsal branches are cleaned up.
    await git([
      'fetch',
      'origin',
      `refs/heads/drill/${id}:refs/remotes/origin/drill/${id}`,
    ]);
    for (const [path, branch] of [
      [join(directory, 'fix'), `fix/drill-${id}`],
      [join(directory, 'base'), `drill/${id}`],
    ]) {
      if (await git(['status', '--porcelain'], path))
        throw new Error('Drill worktree is dirty; preserve it');
      await git([
        'fetch',
        'origin',
        `refs/heads/${branch}:refs/remotes/origin/${branch}`,
      ]);
      const localSha = await git(['rev-parse', branch]);
      if (!FULL_SHA.test(localSha))
        throw new Error('Invalid cleanup branch SHA');
      await git(['merge-base', '--is-ancestor', localSha, record.merge_sha]);
      await git(['branch', `--set-upstream-to=origin/${branch}`, branch]);
      await git(['worktree', 'remove', path]);
      await git(['branch', '-d', branch]);
      await githubApi(`git/refs/heads/${branch}`, 'DELETE');
    }
    await persist({
      status: 'completed',
      finished_at: stamp(),
      postmortem_url: comment.html_url,
      production_after: after,
    });
    progress('completed', {
      directory,
      issue_url: record.issue_url,
      pr_url: record.pr_url,
      postmortem_url: comment.html_url,
      model_calls: 1,
      access_revoked: true,
    });
    return record;
  } catch (error) {
    await persist({
      status: 'needs_action',
      message: error.message,
      stopped_at: stamp(),
    });
    progress('needs_action', {
      directory,
      message: error.message,
      issue_url: record.issue_url,
      pr_url: record.pr_url,
    });
    throw error;
  }
}

if (isMain(import.meta.url)) {
  if (process.argv[2] !== '--run-authorized')
    throw new Error(
      'A real drill needs explicit authorization and --run-authorized'
    );
  try {
    await runDrill(process.argv[3]);
  } catch {
    process.exitCode = 1;
  }
}
