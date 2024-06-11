import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribePrefersReducedMotion = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => mediaQuery.removeEventListener('change', onStoreChange);
};

const getPrefersReducedMotionSnapshot = () => {
  return window.matchMedia(QUERY).matches;
};

const getServerSnapshot = () => {
  return undefined;
};

export const usePrefersReducedMotion = () => {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    getServerSnapshot
  );
};
