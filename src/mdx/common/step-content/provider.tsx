'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import {
  createStepContentStore,
  type StepContentState,
  type StepContentStore,
} from './store';

export type StepContentStoreApi = ReturnType<typeof createStepContentStore>;

export const StepContentStoreContext = createContext<
  StepContentStoreApi | undefined
>(undefined);

export interface StepContentStoreProviderProps {
  children: ReactNode;
  initState?: StepContentState;
}

/**
 * 이 컴포넌트의 경우 앱 전역이 아닌, 컴포넌트 인스턴스에 자체 스토어를 제공하도록 해야 합니다.
 *
 * 이를 위해 훅을 반환하는 `create`를 사용하지 않고 컴포넌트 내부에서
 * `createStore`를 통해 스토어를 생성해 스토어 값 자체가 아닌 스토어 인스턴스를 Context에 제공합니다.
 */
export function StepContentStoreProvider({
  children,
  initState,
}: StepContentStoreProviderProps) {
  // 스토어가 한 번만 생성되도록 합니다.
  const [store] = useState(() => createStepContentStore(initState));

  return (
    <StepContentStoreContext.Provider value={store}>
      {children}
    </StepContentStoreContext.Provider>
  );
}

export function useStepContentStore<T>(
  selector: (store: StepContentStore) => T
): T {
  const stepContentStoreContext = useContext(StepContentStoreContext);
  if (!stepContentStoreContext) {
    throw new Error(
      'useStepContentStore는 StepContentStoreProvider 내에서 사용해야 해요.'
    );
  }

  return useStore(stepContentStoreContext, selector);
}
