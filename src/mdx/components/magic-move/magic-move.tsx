'use client';

import { useCallback, useDeferredValue, useState } from 'react';
import { ShikiMagicMove } from 'shiki-magic-move/react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { CopyToClipboard } from '@/mdx/common/copy-to-clipboard/copy-to-clipboard';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';
import {
  StepContentStoreProvider,
  useStepContentStore,
} from '@/mdx/common/step-content/provider';
import {
  StepActions,
  StepContent,
  StepInfo,
  StepSelect,
} from '@/mdx/common/step-content/step-content';
import type { StepData } from '@/mdx/common/step-content/step-data';
import { useHighlighter } from './use-highlighter';

import 'shiki-magic-move/dist/style.css';
import './magic-move.css';
import { HighlighterCore } from 'shiki';

const CodeSnippetSchema = z.object({
  content: z.string(),
  description: z.string(),
  title: z.string(),
});

const MagicMoveSchema = z.object({
  codeSnippets: z.array(CodeSnippetSchema),
  lang: z.string(),
});

type CodeSnippet = z.infer<typeof CodeSnippetSchema>;
type MagicMoveProps = z.infer<typeof MagicMoveSchema>;

function MagicMoveContent({
  lang,
  highlighter,
}: {
  lang: string;
  highlighter: HighlighterCore;
}) {
  const { stepsData, currentStep } = useStepContentStore(state => state);
  const deferredCurrentStep = useDeferredValue(currentStep);

  const renderContent = useCallback(
    (content: CodeSnippet) => {
      return (
        <div className="relative">
          <ShikiMagicMove
            className={cn(
              'overflow-x-auto rounded-lg border border-solid border-border px-0 py-3',
              'contrast-more:border-current contrast-more:dark:border-current'
            )}
            code={content.content}
            lang={lang}
            theme="vitesse-dark"
            highlighter={highlighter}
            options={{
              duration: 750,
              stagger: 3,
              lineNumbers: true,
            }}
          />
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition focus-within:opacity-100 [div:hover>&]:opacity-100">
            <CopyToClipboard getValue={() => content.content} />
          </div>
        </div>
      );
    },
    [highlighter, lang]
  );

  const stepData = stepsData[deferredCurrentStep] as StepData<CodeSnippet>;

  if (!stepData) return null;

  return renderContent(stepData.content);
}

function MagicMove({ codeSnippets, lang }: MagicMoveProps) {
  const [steps] = useState<StepData<CodeSnippet>[]>(() =>
    codeSnippets.map(snippet => ({
      title: snippet.title,
      description: snippet.description,
      content: snippet,
    }))
  );

  const highlighter = useHighlighter();

  return (
    <StepContentStoreProvider
      initState={{
        stepsData: steps,
        currentStep: 0,
        direction: 0,
      }}
    >
      <div>
        <div className="mb-1 flex items-center justify-between">
          <StepSelect />
          <StepActions />
        </div>
        <StepInfo />
        {highlighter && (
          <StepContent
            render={() => (
              <MagicMoveContent lang={lang} highlighter={highlighter} />
            )}
          />
        )}
      </div>
    </StepContentStoreProvider>
  );
}

export const MDXMagicMove = createMDXComponent(MagicMove, MagicMoveSchema);
