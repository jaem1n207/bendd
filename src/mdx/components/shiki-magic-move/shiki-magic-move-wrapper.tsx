'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HighlighterCore } from 'shiki';
import { ShikiMagicMove } from 'shiki-magic-move/react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { CopyToClipboard } from '@/mdx/common/copy-to-clipboard/copy-to-clipboard';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';
import {
  Step,
  StepContent,
  StepInfo,
  StepNavigation,
  StepSelect,
} from '@/mdx/common/step-content-wrapper/step-content-wrapper';

import 'shiki-magic-move/dist/style.css';
import './magic-move.css';

const CodeSnippetSchema = z.object({
  code: z.string(),
  description: z.string(),
  title: z.string(),
});

const ShikiMagicMoveWrapperSchema = z.object({
  codeSnippets: z.array(CodeSnippetSchema),
  lang: z.string(),
});

type CodeSnippet = z.infer<typeof CodeSnippetSchema>;
type ShikiMagicMoveWrapperProps = z.infer<typeof ShikiMagicMoveWrapperSchema>;

function ShikiMagicMoveWrapper({
  codeSnippets,
  lang,
}: ShikiMagicMoveWrapperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const highlighter = useHighlighter();

  const steps: Step<CodeSnippet>[] = useMemo(
    () =>
      codeSnippets.map(snippet => ({
        title: snippet.title,
        description: snippet.description,
        content: snippet,
      })),
    [codeSnippets]
  );

  const currentStep = steps[currentIndex];

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
  }, [steps.length]);

  const renderContent = useCallback(
    (content: CodeSnippet) => {
      if (!highlighter) return null;

      return (
        <div className="bd-relative">
          <ShikiMagicMove
            className={cn(
              'bd-overflow-x-auto bd-rounded-lg bd-border bd-border-solid bd-border-border bd-bg-neutral-900 bd-px-0 bd-py-3 dark:bd-bg-gray-100',
              'contrast-more:bd-border-current contrast-more:dark:bd-border-current'
            )}
            code={content.code}
            lang={lang}
            theme="vitesse-dark"
            highlighter={highlighter}
            options={{
              splitTokens: true,
              duration: 750,
              stagger: 3,
              lineNumbers: true,
            }}
          />
          <div className="bd-absolute bd-right-2 bd-top-2 bd-flex bd-gap-1 bd-opacity-0 bd-transition focus-within:bd-opacity-100 [div:hover>&]:bd-opacity-100">
            <CopyToClipboard getValue={() => content.code} />
          </div>
        </div>
      );
    },
    [highlighter, lang]
  );

  return (
    <div>
      <div className="bd-mb-1 bd-flex bd-items-center bd-justify-between">
        <StepSelect
          steps={steps}
          currentIndex={currentIndex}
          onStepChange={setCurrentIndex}
        />
        <StepNavigation
          currentIndex={currentIndex}
          totalSteps={steps.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      </div>
      <StepInfo step={currentStep} />
      <StepContent step={currentStep} render={renderContent} />
    </div>
  );
}

function useHighlighter(): HighlighterCore | undefined {
  const [highlighter, setHighlighter] = useState<HighlighterCore>();

  useEffect(() => {
    async function initializeHighlighter() {
      const { createHighlighterCore } = await import('shiki');
      const getWasm = await import('shiki/wasm');
      const vitesseDark = await import('shiki/themes/vitesse-dark.mjs');
      const newHighlighter = await createHighlighterCore({
        themes: [vitesseDark],
        langs: [
          import('shiki/langs/typescript.mjs'),
          import('shiki/langs/javascript.mjs'),
          import('shiki/langs/html.mjs'),
          import('shiki/langs/css.mjs'),
          import('shiki/langs/json.mjs'),
          import('shiki/langs/shell.mjs'),
          import('shiki/langs/markdown.mjs'),
          import('shiki/langs/yaml.mjs'),
          import('shiki/langs/svelte.mjs'),
        ],
        loadWasm: getWasm,
      });
      setHighlighter(newHighlighter);
    }

    initializeHighlighter();
  }, []);

  return highlighter;
}

export const MDXShikiMagicMoveWrapper = createMDXComponent(
  ShikiMagicMoveWrapper,
  ShikiMagicMoveWrapperSchema
);
