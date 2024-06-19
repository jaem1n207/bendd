import { useSyncExternalStore, type ReactNode } from 'react';

const emptySubscribe = () => () => {};

export function ClientGate({ children }: { children: ReactNode }) {
  const isServer = useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true
  );

  return isServer ? null : children;
}
