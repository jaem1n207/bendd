'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HighlighterCore } from 'shiki';
import { ShikiMagicMove } from 'shiki-magic-move/react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CopyToClipboard } from './copy-to-clipboard';

import { Paragraph } from '@/components/ui/typography';
import 'shiki-magic-move/dist/style.css';
import '../style/magic-move.css';
import { createMDXComponent } from './create-mdx-component';

type ShikiMagicMoveWrapperProps = z.infer<typeof ShikiMagicMoveWrapperSchema>;

const ShikiMagicMoveWrapperSchema = z.object({
  codeSnippets: z.array(
    z.object({
      code: z.string(),
      description: z.string(),
      title: z.string(),
    })
  ),
  lang: z.string(),
});

function ShikiMagicMoveWrapper({
  codeSnippets,
  lang,
}: ShikiMagicMoveWrapperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const highlighter = useHighlighter();

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % codeSnippets.length);
  }, [codeSnippets.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(
      prev => (prev - 1 + codeSnippets.length) % codeSnippets.length
    );
  }, [codeSnippets.length]);

  const handleSelectChange = useCallback((value: string) => {
    setCurrentIndex(parseInt(value, 10));
  }, []);

  const currentSnippet = useMemo(
    () => codeSnippets[currentIndex],
    [codeSnippets, currentIndex]
  );

  return (
    <div className="bd-relative">
      <div className="bd-mb-1 bd-flex bd-items-center bd-justify-between">
        <Select
          onValueChange={handleSelectChange}
          value={currentIndex.toString()}
        >
          <SelectTrigger className="bd-mr-1 bd-flex-1">
            <SelectValue placeholder="코드 예시 선택" />
          </SelectTrigger>
          <SelectContent>
            {codeSnippets.map((snippet, index) => (
              <SelectItem key={index} value={index.toString()}>
                {snippet.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="bd-flex bd-items-center bd-space-x-2">
          <Button
            size="icon"
            variant="outline"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="bd-size-4" />
          </Button>
          <span className="bd-text-sm">
            {currentIndex + 1} / {codeSnippets.length}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={goToNext}
            disabled={currentIndex === codeSnippets.length - 1}
          >
            <ChevronRight className="bd-size-4" />
          </Button>
        </div>
      </div>

      <div className="bd-rounded-md bd-border bd-border-border bd-bg-background bd-px-4 bd-py-2 bd-shadow">
        <Paragraph size="lg" className="bd-mb-2">
          {currentSnippet.title}
        </Paragraph>
        <Paragraph>{currentSnippet.description}</Paragraph>
      </div>

      {highlighter && (
        <div className="bd-relative">
          <ShikiMagicMove
            className={cn(
              'bd-overflow-x-auto bd-rounded-lg bd-border bd-border-solid bd-border-border bd-bg-neutral-900 bd-px-0 bd-py-3 dark:bd-bg-gray-100',
              'contrast-more:bd-border-current contrast-more:dark:bd-border-current'
            )}
            code={currentSnippet.code}
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
            <CopyToClipboard getValue={() => currentSnippet.code} />
          </div>
        </div>
      )}
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
