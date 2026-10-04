import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HTTP_OK, checkAvailability } from '../check-availability.mjs';
import { createGitHub } from './github.mjs';
import { advanceState, getTransition, parseState } from './state.mjs';

function explainResult(result) {
  if (result.ok) {
    return '확인 완료';
  }
  if (result.error) {
    return result.error;
  }
  if (result.status !== HTTP_OK) {
    return 'HTTP 오류';
  }
  if (!result.type_ok) {
    return '콘텐츠 형식 불일치';
  }
  return '콘텐츠 내용 불일치';
}

export function formatReport(report, runUrl) {
  const lines = report.results.map(result => {
    const status = result.status ?? result.error ?? 'UnknownError';
    const detail = explainResult(result);
    return `| ${result.path} | ${result.ok ? '정상' : '실패'} | ${status} | ${result.elapsed_ms} | ${detail} |`;
  });
  return [
    `점검 시각: ${report.checked_at}`,
    '',
    '| 경로 | 결과 | HTTP / 오류 | 응답 시간(ms) | 판정 근거 |',
    '| --- | --- | --- | --- | --- |',
    ...lines,
    '',
    'HTTP 200과 콘텐츠 형식·내용을 함께 확인해요.',
    '',
    `[점검 실행과 상세 결과](${runUrl})`,
  ].join('\n');
}

export async function runMonitor({
  github,
  check = checkAvailability,
  save,
  runUrl,
}) {
  const stored = await github.loadState();
  const previous = stored ? parseState(stored) : null;
  const incident = await github.findIncident();
  const report = await check();
  const state = advanceState(previous, report);
  const transition = getTransition(state, report, incident);

  // 알림 API 실패 뒤에도 다음 실행에서 연속 실패를 판단할 수 있도록 먼저 저장해요.
  await save({ state, report, transition });
  const details = formatReport(report, runUrl);
  if (transition === 'outage') {
    await github.openIncident(
      `같은 경로가 2회 연속 점검에 실패했어요.\n\n${details}`
    );
  }
  if (transition === 'recovered') {
    await github.recoverIncident(
      incident,
      `홈·글·RSS·OG 응답이 모두 정상으로 돌아왔어요.\n\n${details}`
    );
  }
  return { state, report, transition };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Availability notifications only run on main');
  }
  const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;
  const directory = '.availability';
  const result = await runMonitor({
    github: createGitHub(repo ?? '', runId ?? ''),
    runUrl,
    save: async ({ state, report, transition }) => {
      await mkdir(directory, { recursive: true });
      await writeFile(
        join(directory, 'state.json'),
        JSON.stringify(state, null, 2)
      );
      await writeFile(
        join(directory, 'report.json'),
        JSON.stringify({ ...report, transition }, null, 2)
      );
    },
  });
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(
      process.env.GITHUB_STEP_SUMMARY,
      `결과: ${result.transition}\n\n${formatReport(result.report, runUrl)}`
    );
  }
}
