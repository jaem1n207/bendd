'use client';

import { useRef, useState } from 'react';
import { ShikiMagicMove } from 'shiki-magic-move/react';
import { useTheme } from 'next-themes';
import { z } from 'zod';

import { useScrollFade } from '@/hooks/use-scroll-fade';
import { CopyToClipboard } from '@/mdx/common/copy-to-clipboard/copy-to-clipboard';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';
import { StepContentStoreProvider } from '@/mdx/common/step-content/provider';
import {
  StepActions,
  StepInfo,
  StepMotion,
  StepSelect,
} from '@/mdx/common/step-content/step-content';
import type { StepData } from '@/mdx/common/step-content/step-data';
import { useHighlighter } from '@/mdx/components/magic-move/use-highlighter';

import 'shiki-magic-move/dist/style.css';
import '@/mdx/components/magic-move/magic-move.css';
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
  content,
}: {
  lang: string;
  highlighter: HighlighterCore;
  content: CodeSnippet;
}) {
  const { resolvedTheme } = useTheme();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useScrollFade(scrollRef, 'x', resolvedTheme ? 1 : 0);

  if (!resolvedTheme) {
    return null;
  }

  return (
    <div className="relative rounded-lg border border-solid border-border bg-background contrast-more:border-current dark:bg-gray-200 contrast-more:dark:border-current">
      <div
        ref={scrollRef}
        tabIndex={0}
        className="scroll-fade-x overflow-x-auto overflow-y-hidden rounded-[inherit] [--scroll-fade-reveal:32px] [--scroll-fade-size:16px]"
      >
        <ShikiMagicMove
          className="my-0 w-max min-w-full !overflow-visible !bg-transparent px-0 py-3"
          code={content.content}
          lang={lang}
          theme={resolvedTheme === 'dark' ? 'vitesse-dark' : 'github-light'}
          highlighter={highlighter}
          options={{
            duration: 750,
            stagger: 3,
            lineNumbers: true,
            animateContainer: true,
          }}
        />
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition focus-within:opacity-100 [div:hover>&]:opacity-100">
        <CopyToClipboard getValue={() => content.content} />
      </div>
    </div>
  );
}

function MagicMove({ codeSnippets, lang }: MagicMoveProps) {
  const [displayedStep, setDisplayedStep] = useState(0);
  const [motion, setMotion] = useState(StepMotion.Animated);
  const [steps] = useState<StepData<CodeSnippet>[]>(() =>
    codeSnippets.map(snippet => ({
      title: snippet.title,
      description: snippet.description,
      content: snippet,
    }))
  );

  const highlighter = useHighlighter();
  const displayedContent = steps[displayedStep]?.content;

  return (
    <StepContentStoreProvider
      initState={{
        stepsData: steps,
        currentStep: 0,
        direction: 0,
      }}
    >
      <div
        data-step-motion={motion}
        onKeyDownCapture={() => setMotion(StepMotion.Immediate)}
        onPointerDownCapture={() => setMotion(StepMotion.Animated)}
      >
        <div className="mb-1 flex items-center justify-between">
          <StepSelect />
          <StepActions />
        </div>
        <StepInfo motion={motion} onStepSettled={setDisplayedStep} />
        {highlighter && displayedContent && (
          <div className="mt-4">
            <MagicMoveContent
              lang={lang}
              highlighter={highlighter}
              content={displayedContent}
            />
          </div>
        )}
      </div>
    </StepContentStoreProvider>
  );
}

export const MDXMagicMove = createMDXComponent(MagicMove, MagicMoveSchema);
