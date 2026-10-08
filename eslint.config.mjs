import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import tailwindcss from 'eslint-plugin-tailwindcss';
import testingLibrary from 'eslint-plugin-testing-library';
import vitest from '@vitest/eslint-plugin';

// 기존 Hooks 규칙을 유지한다. Compiler 규칙은 별도 도입한다.
const EXISTING_HOOK_RULES = new Set([
  'react-hooks/rules-of-hooks',
  'react-hooks/exhaustive-deps',
]);
const nextRules = nextCoreWebVitals.map(config => {
  if (!config.rules) {
    return config;
  }

  return {
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules).filter(
        ([rule]) =>
          !rule.startsWith('react-hooks/') || EXISTING_HOOK_RULES.has(rule)
      )
    ),
  };
});

export default defineConfig([
  ...nextRules,
  ...tailwindcss.configs['flat/recommended'].map(config => ({
    ...config,
    files: ['**/*.{ts,tsx,mts}'],
  })),
  {
    files: ['**/*.test.{ts,tsx}'],
    plugins: { vitest, 'testing-library': testingLibrary },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['**/*.spec.ts'],
  },
  prettier,
]);
