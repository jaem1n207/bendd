// @vitest-environment node
import { spawnSync } from 'node:child_process';

import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants';
import { describe, expect, test } from 'vitest';

const EXIT_SUCCESS = 0;
const CONFIG_OK = 'CONFIG_OK';
const TOKEN_SENTINEL = 'test-secret-never-print';
const UPLOAD_ENV = {
  SENTRY_ORG: 'jaemin',
  SENTRY_PROJECT: 'bendd',
  SENTRY_AUTH_TOKEN: TOKEN_SENTINEL,
};
const VERCEL_TARGETS = ['production', 'preview'];
const UPLOAD_KEYS = Object.keys(UPLOAD_ENV);
const LOAD_CONFIG = `
  import config from './next.config.mjs';
  try {
    const result = typeof config === 'function'
      ? await config(process.env.TEST_NEXT_PHASE, { defaultConfig: {} })
      : config;
    if (typeof result.webpack !== 'function' || !result.typedRoutes) {
      throw new Error('Next/Sentry configuration was lost');
    }
    if (typeof config === 'function') {
      const repeated = await config(process.env.TEST_NEXT_PHASE, { defaultConfig: {} });
      if (result.compiler === repeated.compiler) {
        throw new Error('Repeated config load shared Sentry compile hooks');
      }
    }
    console.log('${CONFIG_OK}');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unknown config error');
    process.exit(1);
  }
`;

function loadConfig(env: NodeJS.ProcessEnv, phase = PHASE_PRODUCTION_BUILD) {
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith('SENTRY_') &&
        !key.startsWith('VERCEL') &&
        !key.startsWith('NEXT_PUBLIC_') &&
        key !== 'NEXT_PHASE' &&
        key !== 'ANALYZE'
    )
  );

  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', LOAD_CONFIG],
    {
      cwd: process.cwd(),
      env: { ...cleanEnv, ...env, TEST_NEXT_PHASE: phase },
      encoding: 'utf8',
      timeout: 10_000,
    }
  );
}

describe('Sentry 배포 빌드 필수 설정', () => {
  for (const target of VERCEL_TARGETS) {
    for (const key of UPLOAD_KEYS) {
      test(`${target}에서 ${key}가 없으면 중단한다`, () => {
        const result = loadConfig({
          ...UPLOAD_ENV,
          VERCEL: '1',
          VERCEL_ENV: target,
          [key]: undefined,
        });

        expect(result.status).not.toBe(EXIT_SUCCESS);
        expect(result.stderr).toContain(key);
        expect(result.stderr).not.toContain(TOKEN_SENTINEL);
        expect(result.stdout).not.toContain(CONFIG_OK);
      });

      test(`${target}에서 ${key}가 공백이면 중단한다`, () => {
        const result = loadConfig({
          ...UPLOAD_ENV,
          VERCEL: '1',
          VERCEL_ENV: target,
          [key]: ' \t ',
        });

        expect(result.status).not.toBe(EXIT_SUCCESS);
        expect(result.stderr).toContain(key);
        expect(result.stderr).not.toContain(TOKEN_SENTINEL);
      });
    }

    test(`${target}에 필수 설정이 있으면 Sentry 설정을 유지한다`, () => {
      const result = loadConfig({
        ...UPLOAD_ENV,
        VERCEL: '1',
        VERCEL_ENV: target,
      });

      expect(result.status).toBe(EXIT_SUCCESS);
      expect(result.stdout).toContain(CONFIG_OK);
      expect(result.stdout + result.stderr).not.toContain(TOKEN_SENTINEL);
    });
  }

  test('누락된 모든 변수 이름을 한 번에 안내한다', () => {
    const result = loadConfig({ VERCEL: '1', VERCEL_ENV: 'production' });

    expect(result.status).not.toBe(EXIT_SUCCESS);
    for (const key of UPLOAD_KEYS) {
      expect(result.stderr).toContain(key);
    }
  });

  const tokenFreeBuilds: { name: string; env: NodeJS.ProcessEnv }[] = [
    { name: '로컬 빌드', env: {} },
    { name: 'GitHub CI', env: { CI: 'true', GITHUB_ACTIONS: 'true' } },
    {
      name: 'Vercel 개발 환경',
      env: { VERCEL: '1', VERCEL_ENV: 'development' },
    },
    {
      name: '공개 환경 변수만 있는 로컬',
      env: { NEXT_PUBLIC_VERCEL_ENV: 'production' },
    },
  ];

  for (const { name, env } of tokenFreeBuilds) {
    test(`${name}: 토큰 없이 설정을 로드한다`, () => {
      const result = loadConfig(env);

      expect(result.status).toBe(EXIT_SUCCESS);
      expect(result.stdout).toContain(CONFIG_OK);
    });
  }

  for (const phase of [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER]) {
    test(`${phase}는 배포 빌드 검증 대상이 아니다`, () => {
      const result = loadConfig(
        { VERCEL: '1', VERCEL_ENV: 'production' },
        phase
      );

      expect(result.status).toBe(EXIT_SUCCESS);
      expect(result.stdout).toContain(CONFIG_OK);
    });
  }
});
