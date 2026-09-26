'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { codeToKeyedTokens } from 'shiki-magic-move/core';
import { ShikiMagicMove, ShikiMagicMoveRenderer } from 'shiki-magic-move/react';
import { useTheme } from 'next-themes';
import { z } from 'zod';

import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
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

const CODE_CLASS_NAME =
  'my-0 w-max min-w-full !overflow-visible !bg-transparent px-0 py-3';

enum CodeRenderMode {
  Pending,
  Static,
  Animated,
}

function StaticCode({
  highlighter,
  code,
  lang,
  theme,
}: {
  highlighter: HighlighterCore;
  code: string;
  lang: string;
  theme: string;
}) {
  const tokens = useMemo(
    () => codeToKeyedTokens(highlighter, code, { lang, theme }, true),
    [highlighter, code, lang, theme]
  );

  return (
    <ShikiMagicMoveRenderer
      animate={false}
      tokens={tokens}
      options={{ duration: 0, stagger: 0 }}
      className={`${CODE_CLASS_NAME} [--smm-duration:0ms] [--smm-stagger:0ms]`}
    />
  );
}

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
  const allowMotion = usePrefersReducedMotion() === false;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPosition = useRef(0);
  const renderMode = !resolvedTheme
    ? CodeRenderMode.Pending
    : allowMotion
      ? CodeRenderMode.Animated
      : CodeRenderMode.Static;
  useScrollFade(scrollRef, 'x', renderMode);

  useEffect(() => {
    // 새 renderer의 초기 측정이 빈 코드 영역의 스크롤을 0으로 만들 수 있다.
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollPosition.current;
    }
  }, [renderMode]);

  if (!resolvedTheme) {
    return null;
  }

  return (
    <div className="relative rounded-lg border border-solid border-border bg-background contrast-more:border-current dark:bg-gray-200 contrast-more:dark:border-current">
      <div
        ref={scrollRef}
        tabIndex={0}
        onScroll={event => {
          scrollPosition.current = event.currentTarget.scrollLeft;
        }}
        className="scroll-fade-x overflow-x-auto overflow-y-hidden rounded-[inherit] [--scroll-fade-reveal:32px] [--scroll-fade-size:16px]"
      >
        {allowMotion ? (
          <ShikiMagicMove
            className={CODE_CLASS_NAME}
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
        ) : (
          <StaticCode
            code={content.content}
            lang={lang}
            theme={resolvedTheme === 'dark' ? 'vitesse-dark' : 'github-light'}
            highlighter={highlighter}
          />
        )}
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
