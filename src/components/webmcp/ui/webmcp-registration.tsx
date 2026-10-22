'use client';

import { useEffect } from 'react';
import { observeShuffleDemos } from '@/components/shuffle';

import {
  hasModelContext,
  registerWebMCPTools,
} from '@/components/webmcp/lib/register-tool';
import { useWebMCPTools } from '@/components/webmcp/model/use-webmcp-tools';

const requestIdleFallback = (callback: IdleRequestCallback) =>
  window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 0,
    });
  }, 0);

function getDeclarativeToolNames(doc: Document) {
  return new Set(
    [...doc.querySelectorAll<HTMLFormElement>('form[toolname]')]
      .map(form => form.getAttribute('toolname'))
      .filter((name): name is string => Boolean(name))
  );
}

export function WebMCPRegistration() {
  const buildTools = useWebMCPTools();

  useEffect(() => {
    if (!hasModelContext()) {
      return;
    }

    let cleanup = () => {};
    const requestIdle = globalThis.requestIdleCallback ?? requestIdleFallback;
    const cancelIdle = globalThis.cancelIdleCallback ?? window.clearTimeout;

    let idleId: number | undefined;
    const refresh = () => {
      if (idleId !== undefined) {
        cancelIdle(idleId);
      }
      cleanup();
      idleId = requestIdle(() => {
        try {
          const declarativeToolNames = getDeclarativeToolNames(document);
          const tools = buildTools().filter(
            tool => !declarativeToolNames.has(tool.name)
          );
          cleanup = registerWebMCPTools(tools);
        } catch {
          cleanup = () => {};
        }
      });
    };
    const unobserve = observeShuffleDemos(refresh);
    refresh();

    return () => {
      unobserve();
      if (idleId !== undefined) {
        cancelIdle(idleId);
      }
      cleanup();
    };
  }, [buildTools]);

  return null;
}
