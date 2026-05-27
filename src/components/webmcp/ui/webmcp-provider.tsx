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

export function WebMCPProvider() {
  const tools = useWebMCPTools();

  useEffect(() => {
    if (!hasModelContext()) {
      return;
    }

    let cleanup = () => {};
    const requestIdle = globalThis.requestIdleCallback ?? requestIdleFallback;
    const cancelIdle = globalThis.cancelIdleCallback ?? window.clearTimeout;

    const idleId = requestIdle(() => {
      cleanup = registerWebMCPTools(tools);
    });

    return () => {
      cancelIdle(idleId);
      cleanup();
    };
  }, [tools]);

  return null;
}
