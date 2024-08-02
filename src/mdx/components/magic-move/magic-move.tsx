'use client';

import { useCallback, useState } from 'react';
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

function MagicMoveContent({ lang }: { lang: string }) {
  const highlighter = useHighlighter();
  const { stepsData, currentStep } = useStepContentStore(state => state);

  const renderContent = useCallback(
    (content: CodeSnippet) => {
      if (!highlighter) return null;

      return (
        <div className="bd-relative">
          <ShikiMagicMove
            className={cn(
              'bd-overflow-x-auto bd-rounded-lg bd-border bd-border-solid bd-border-border bd-px-0 bd-py-3',
              'contrast-more:bd-border-current contrast-more:dark:bd-border-current'
            )}
            code={content.content}
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
            <CopyToClipboard getValue={() => content.content} />
          </div>
        </div>
      );
    },
    [highlighter, lang]
  );

  const stepData = stepsData[currentStep] as StepData<CodeSnippet>;

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

  return (
    <StepContentStoreProvider
      initState={{
        stepsData: steps,
        currentStep: 0,
        direction: 0,
        isAnimating: false,
      }}
    >
      <div>
        <div className="bd-mb-1 bd-flex bd-items-center bd-justify-between">
          <StepSelect />
          <StepActions />
        </div>
        <StepInfo />
        <StepContent render={() => <MagicMoveContent lang={lang} />} />
      </div>
    </StepContentStoreProvider>
  );
}

export const MDXMagicMove = createMDXComponent(MagicMove, MagicMoveSchema);
