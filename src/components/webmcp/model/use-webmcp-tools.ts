'use client';

import { useTheme } from 'next-themes';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useSoundStore } from '@/components/sound';
import {
  createToolDescriptor,
  emptyObjectSchema,
  webMCPSchemas,
} from '@/components/webmcp/lib/schemas';
import {
  createLazyContentIndexFetcher,
  createWebMCPHandlers,
} from '@/components/webmcp/model/tool-handlers';
import type { AnyWebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

const fetchContentIndex = createLazyContentIndexFetcher();

export function useWebMCPTools() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const setSoundEnabled = useSoundStore(state => state.setSoundEnabled);

  return useCallback((): AnyWebMCPToolDescriptor[] => {
    const handlers = createWebMCPHandlers({
      pathname,
      router: {
        push: href => {
          router.push(href as Route);
        },
      },
      getTheme: () => (resolvedTheme === 'dark' ? 'dark' : 'light'),
      setTheme,
      getSoundEnabled: () => isSoundEnabled,
      setSoundEnabled,
      getCurrentHref: () => window.location.href,
      document,
      clipboard: navigator.clipboard,
      fetchContentIndex,
      dispatchWindowEvent: (name, detail) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      },
    });

    const tools = [
      createToolDescriptor({
        name: 'navigate_site',
        description: 'Navigate to a safe internal page on bendd.me.',
        inputSchema: webMCPSchemas.navigateSite,
        execute: handlers.navigateSite,
      }),
      createToolDescriptor({
        name: 'get_site_context',
        description:
          'Read the current bendd.me route, title, canonical URL, and available actions.',
        inputSchema: emptyObjectSchema,
        annotations: { readOnlyHint: true },
        execute: handlers.getSiteContext,
      }),
      createToolDescriptor({
        name: 'toggle_theme',
        description: 'Toggle the visible site theme between light and dark.',
        inputSchema: emptyObjectSchema,
        execute: handlers.toggleTheme,
      }),
      createToolDescriptor({
        name: 'set_sound',
        description: 'Enable or disable site interaction sounds.',
        inputSchema: webMCPSchemas.setSound,
        execute: handlers.setSound,
      }),
      createToolDescriptor({
        name: 'copy_current_url',
        description: 'Copy the current page URL to the clipboard.',
        inputSchema: emptyObjectSchema,
        execute: handlers.copyCurrentUrl,
      }),
      createToolDescriptor({
        name: 'find_content',
        description:
          'Search bendd.me article and craft metadata by title, summary, description, category, slug, or series.',
        inputSchema: webMCPSchemas.findContent,
        annotations: { readOnlyHint: true },
        execute: handlers.findContent,
      }),
      createToolDescriptor({
        name: 'open_content',
        description: 'Open an internal article or craft page by type and slug.',
        inputSchema: webMCPSchemas.openContent,
        execute: handlers.openContent,
      }),
      createToolDescriptor({
        name: 'get_current_content_context',
        description:
          'Read the current article or craft title, metadata, TL;DR, headings, and a short excerpt.',
        inputSchema: emptyObjectSchema,
        annotations: { readOnlyHint: true },
        execute: handlers.getCurrentContentContext,
      }),
      createToolDescriptor({
        name: 'open_series',
        description:
          'Open the current series page, previous article, or next article when available.',
        inputSchema: webMCPSchemas.openSeries,
        execute: handlers.openSeries,
      }),
      createToolDescriptor({
        name: 'jump_to_heading',
        description:
          'Scroll the current article or craft page to a heading by id.',
        inputSchema: webMCPSchemas.jumpToHeading,
        execute: handlers.jumpToHeading,
      }),
      createToolDescriptor({
        name: 'copy_code_block',
        description: 'Copy a visible MDX code block by zero-based index.',
        inputSchema: webMCPSchemas.copyCodeBlock,
        execute: handlers.copyCodeBlock,
      }),
      createToolDescriptor({
        name: 'list_page_actions',
        description:
          'List the WebMCP actions that are meaningful on the current route.',
        inputSchema: emptyObjectSchema,
        annotations: { readOnlyHint: true },
        execute: handlers.listPageActions,
      }),
      createToolDescriptor({
        name: 'run_shuffle_letters',
        description:
          'Fill and run the shuffle letters playground with visible values.',
        inputSchema: webMCPSchemas.runShuffleLetters,
        execute: handlers.runShuffleLetters,
      }),
      createToolDescriptor({
        name: 'stop_shuffle_letters',
        description: 'Stop the running shuffle letters animation.',
        inputSchema: emptyObjectSchema,
        execute: handlers.stopShuffleLetters,
      }),
    ];

    const available = new Set<string>(handlers.listPageActions().actions);

    return tools.filter(tool => available.has(tool.name));
  }, [
    isSoundEnabled,
    pathname,
    resolvedTheme,
    router,
    setSoundEnabled,
    setTheme,
  ]);
}
