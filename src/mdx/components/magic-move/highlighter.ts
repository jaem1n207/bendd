import { createHighlighterCore, type LanguageInput } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import vitesseDark from 'shiki/themes/vitesse-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';
import getWasm from 'shiki/wasm';

// 현재 문법과 필수 내장 언어만 내려받는다.
const languages: Record<string, () => LanguageInput> = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  svelte: () => import('shiki/langs/svelte.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  postcss: () => import('shiki/langs/postcss.mjs'),
};

const aliases: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  bash: 'shellscript',
  sh: 'shellscript',
  shell: 'shellscript',
  zsh: 'shellscript',
  md: 'markdown',
  yml: 'yaml',
};

export async function createMagicMoveHighlighter(lang: string) {
  const name = Object.hasOwn(aliases, lang) ? aliases[lang] : lang;
  const loadLanguage = Object.hasOwn(languages, name)
    ? languages[name]
    : undefined;
  const isPlain = ['text', 'txt', 'plain', 'ansi'].includes(lang);
  if (!loadLanguage && !isPlain) {
    throw new Error(`Unsupported MagicMove language: ${lang}`);
  }
  return createHighlighterCore({
    themes: [vitesseDark, githubLight],
    langs: loadLanguage ? [loadLanguage()] : [],
    engine: createOnigurumaEngine(getWasm),
  });
}
