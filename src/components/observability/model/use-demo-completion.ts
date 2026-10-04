'use client';

import { useCallback, useEffect, useRef } from 'react';
import { reportDemoComplete } from '@/components/observability/lib/analytics';

export function useDemoCompletion(demoId: string) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return useCallback(() => {
    if (active.current) {
      reportDemoComplete(demoId);
    }
  }, [demoId]);
}
