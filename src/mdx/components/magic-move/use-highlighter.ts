import { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki/core';

export function useHighlighter(lang: string): HighlighterCore | undefined {
  const [ready, setReady] = useState<{
    lang: string;
    highlighter: HighlighterCore;
  }>();

  useEffect(() => {
    let disposed = false;
    let highlighter: HighlighterCore | undefined;
    setReady(undefined);
    async function initializeHighlighter() {
      const { createMagicMoveHighlighter } = await import(
        '@/mdx/components/magic-move/highlighter'
      );
      if (disposed) {
        return;
      }
      highlighter = await createMagicMoveHighlighter(lang);
      if (disposed) {
        highlighter.dispose();
        return;
      }
      setReady({ lang, highlighter });
    }

    void initializeHighlighter().catch(error => {
      if (!disposed) {
        console.error('MagicMove highlighter initialization failed', error);
      }
    });
    return () => {
      disposed = true;
      highlighter?.dispose();
    };
  }, [lang]);

  return ready?.lang === lang ? ready.highlighter : undefined;
}
