'use client';

import { useEffect, useState } from 'react';

import {
  GlobeReadiness,
  LOCATION_TIMEOUT_MS,
} from '@/components/connection-globe/consts/playback';

import {
  VisitorLocationResponseSchema,
  type VisitorLocation,
} from '@/lib/visitor-location';

type LocationState =
  | { status: 'loading'; location: null }
  | { status: 'ready'; location: VisitorLocation }
  | { status: 'unavailable'; location: null };

export function useVisitorLocation(readiness: GlobeReadiness) {
  const [state, setState] = useState<LocationState>({
    status: 'loading',
    location: null,
  });

  useEffect(() => {
    if (readiness !== GlobeReadiness.Ready) {
      return;
    }
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(
      () => controller.abort(),
      LOCATION_TIMEOUT_MS
    );

    async function load() {
      try {
        const response = await fetch('/api/visitor-location', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Location unavailable');
        }
        const body: unknown = await response.json();
        const result = VisitorLocationResponseSchema.safeParse(body);
        if (disposed) {
          return;
        }
        setState(
          result.success && result.data.location
            ? { status: 'ready', location: result.data.location }
            : { status: 'unavailable', location: null }
        );
      } catch {
        if (!disposed) {
          setState({ status: 'unavailable', location: null });
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [readiness]);

  return state;
}
