import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  clampDockSize,
  clampMagnification,
  readDockPreferences,
  type DockPreferences,
} from '@/components/navigation/lib/dock-geometry';

interface DockState extends DockPreferences {
  setSize: (size: number) => void;
  setMagnification: (value: number) => void;
  reset: () => void;
}

export const useDockPreferences = create<DockState>()(
  persist(
    set => ({
      ...readDockPreferences(null),
      setSize: size => set({ size: clampDockSize(size) }),
      setMagnification: value =>
        set({ magnification: clampMagnification(value) }),
      reset: () => set(readDockPreferences(null)),
    }),
    {
      name: 'dock-preferences',
      version: 2,
      migrate: persisted => ({
        ...readDockPreferences(null),
        size: readDockPreferences(persisted).size,
      }),
      skipHydration: true,
      partialize: ({ size, magnification }) => ({ size, magnification }),
      merge: (persisted, current) => ({
        ...current,
        ...readDockPreferences(persisted),
      }),
    }
  )
);
