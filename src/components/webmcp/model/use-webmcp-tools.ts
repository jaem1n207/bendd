'use client';

import { useTheme } from 'next-themes';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useSoundStore } from '@/components/sound';
import {
  createLazyContentIndexFetcher,
  createWebMCPActions,
} from '@/components/webmcp/model/actions';
import type { AnyWebMCPToolDescriptor } from '@/components/webmcp/types/webmcp';

const fetchContentIndex = createLazyContentIndexFetcher();

export function getVisibleTheme(doc: Document = document) {
  return doc.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useWebMCPTools() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const setSoundEnabled = useSoundStore(state => state.setSoundEnabled);

  return useCallback((): AnyWebMCPToolDescriptor[] => {
    return createWebMCPActions({
      pathname,
      router: {
        push: href => {
          router.push(href as Route);
        },
      },
      getTheme: () => getVisibleTheme(document),
      setTheme,
      getSoundEnabled: () => isSoundEnabled,
      setSoundEnabled,
      getCurrentHref: () => window.location.href,
      document,
      clipboard: navigator.clipboard,
      fetchContentIndex,
    }).getTools();
  }, [isSoundEnabled, pathname, router, setSoundEnabled, setTheme]);
}
