import {
  bundledLanguages,
  bundledLanguagesInfo,
  codeToTokens,
  type BundledLanguage,
} from 'shiki';
import { toKeyedTokens } from 'shiki-magic-move/core';

import type { CodeAnnotation } from '@/components/code-walkthrough/lib/code-walkthrough';
import { CodeWalkthroughViewer } from '@/components/code-walkthrough/ui/code-walkthrough-viewer';

interface CodeWalkthroughProps {
  lang: string;
  filename?: string;
  label?: string;
  steps: {
    title: string;
    code: string;
    annotations: (Omit<CodeAnnotation, 'focus'> & {
      focus?: CodeAnnotation['focus'];
    })[];
  }[];
}

function isBundledLanguage(value: string): value is BundledLanguage {
  return Object.hasOwn(bundledLanguages, value);
}

export async function CodeWalkthrough({
  steps,
  lang,
  filename,
  label,
}: CodeWalkthroughProps) {
  if (!steps.length || steps.some(step => !step.annotations.length)) {
    throw new Error(
      'CodeWalkthrough requires steps with at least one annotation.'
    );
  }
  const language = bundledLanguagesInfo.find(
    language => language.id === lang || language.aliases?.includes(lang)
  );
  if (!language || !isBundledLanguage(language.id)) {
    throw new Error(`Unsupported CodeWalkthrough language: ${lang}`);
  }
  const languageId = language.id;

  // Tokenize on the server: readers receive tokens, never Shiki or its WASM.
  const prepared = await Promise.all(
    steps.map(async step => {
      const result = await codeToTokens(step.code, {
        lang: languageId,
        theme: 'github-light',
      });
      return {
        title: step.title,
        annotations: step.annotations.map(annotation => ({
          ...annotation,
          focus: annotation.focus ?? [],
        })),
        tokens: toKeyedTokens(
          step.code,
          result.tokens.map(line =>
            line.map(token => ({
              content: token.content,
              offset: token.offset,
              color: 'hsl(var(--foreground))',
            }))
          )
        ),
      };
    })
  );

  return (
    <CodeWalkthroughViewer
      steps={prepared}
      filename={filename}
      language={language.name}
      label={label}
    />
  );
}
