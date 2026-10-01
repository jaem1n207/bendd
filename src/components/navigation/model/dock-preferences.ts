import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  clampDockSize,
  readDockPreferences,
  type DockPreferences,
} from '@/components/navigation/lib/dock-geometry';

interface DockState extends DockPreferences {
  setSize: (size: number) => void;
  reset: () => void;
}

export const useDockPreferences = create<DockState>()(
  persist(
    set => ({
      ...readDockPreferences(null),
      setSize: size => set({ size: clampDockSize(size) }),
      reset: () => set(readDockPreferences(null)),
    }),
    {
      name: 'dock-preferences',
      version: 1,
      skipHydration: true,
      partialize: ({ size }) => ({ size }),
      merge: (persisted, current) => ({
        ...current,
        ...readDockPreferences(persisted),
      }),
    }
  )
);
