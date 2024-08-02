import { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki';

export function useHighlighter(): HighlighterCore | undefined {
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
