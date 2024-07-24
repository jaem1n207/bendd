// TODO: Tabs 컴포넌트 구현하고 탭 변경 시 코드 변경 애니메이션 실행하도록 수정

'use client';

import { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki';
import { ShikiMagicMove } from 'shiki-magic-move/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CopyToClipboard } from './copy-to-clipboard';

import 'shiki-magic-move/dist/style.css';
import '../style/magic-move.css';

interface ShikiMagicMoveWrapperProps {
  initCode: string;
  nextCode: string;
  lang: string;
}

export function ShikiMagicMoveWrapper({
  initCode,
  nextCode,
  lang,
}: ShikiMagicMoveWrapperProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [code, setCode] = useState(initCode);
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);

  useEffect(() => {
    async function initializeHighlighter() {
      const { createHighlighterCore } = await import('shiki');
      const getWasm = await import('shiki/wasm');
      const vitesseDark = await import('shiki/themes/vitesse-dark.mjs');
      const highlighter = await createHighlighterCore({
        themes: [vitesseDark],
        langs: [
          import('shiki/langs/typescript.mjs'),
          /**
           * 언어를 비동기 청크로 제공해 필요할 때 로드합니다.
           */
          () => import('shiki/langs/javascript.mjs'),
          () => import('shiki/langs/html.mjs'),
          () => import('shiki/langs/css.mjs'),
          () => import('shiki/langs/json.mjs'),
          () => import('shiki/langs/shell.mjs'),
          () => import('shiki/langs/markdown.mjs'),
          () => import('shiki/langs/yaml.mjs'),
          () => import('shiki/langs/svelte.mjs'),
        ],
        loadWasm: getWasm,
      });
      setHighlighter(highlighter);
    }
    initializeHighlighter();
  }, []);

  const animate = () => {
    setCode(nextCode);
  };

  const reset = () => {
    setCode(initCode);
  };

  return (
    <div className="magic-move-debug-style bd-relative">
      {highlighter && (
        <ShikiMagicMove
          className={cn(
            'bd-my-12 bd-overflow-x-auto bd-rounded-lg bd-border bd-border-solid bd-border-border bd-bg-neutral-900 bd-px-0 bd-py-3 dark:bd-bg-gray-100',
            'contrast-more:bd-border-current contrast-more:dark:bd-border-current'
          )}
          onStart={() => {
            setIsAnimating(true);
          }}
          onEnd={() => {
            setIsAnimating(false);
          }}
          code={code}
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
      )}
      <div className="bd-absolute -bd-top-8 bd-left-0 bd-m-2.5">
        {code === nextCode ? (
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            title="Original code"
            className="bd-group hover:[--active:1]"
          >
            원본 코드로 돌아가기
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={animate}
            title="Changed code"
            className="bd-group hover:[--active:1]"
          >
            변경된 코드 보기
          </Button>
        )}
        <span
          className={cn(
            'bd-transition bd-text-green-500 bd-text-sm bd-ml-2',
            isAnimating ? 'bd-animate-pulse' : 'bd-opacity-0'
          )}
        >
          코드 변경 중...
        </span>
      </div>
      <div className="bd-absolute bd-right-0 bd-top-0 bd-m-2.5 bd-flex bd-gap-1 bd-opacity-0 bd-transition focus-within:bd-opacity-100 [div:hover>&]:bd-opacity-100">
        <CopyToClipboard getValue={() => code} />
      </div>
    </div>
  );
}
