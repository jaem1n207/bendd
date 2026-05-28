'use client';

import { useEffect } from 'react';

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

export function WebMCPProvider() {
  const buildTools = useWebMCPTools();

  useEffect(() => {
    if (!hasModelContext()) {
      return;
    }

    let cleanup = () => {};
    const requestIdle = globalThis.requestIdleCallback ?? requestIdleFallback;
    const cancelIdle = globalThis.cancelIdleCallback ?? window.clearTimeout;

    const idleId = requestIdle(() => {
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

    return () => {
      cancelIdle(idleId);
      cleanup();
    };
  }, [buildTools]);

  return null;
}
