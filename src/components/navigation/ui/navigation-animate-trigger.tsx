'use client';

import { useEffect, type ReactNode } from 'react';

import { useDockPreferences } from '@/components/navigation/model/dock-preferences';
import { DockSurface } from '@/components/navigation/ui/dock-surface';

export function NavigationAnimateTrigger({
  children,
}: {
  children: ReactNode;
}) {
  const { size, setSize } = useDockPreferences();
  useEffect(() => {
    void useDockPreferences.persist.rehydrate();
  }, []);
  return (
    <DockSurface size={size} onSizeChange={setSize} label="사이트 탐색 Dock">
      {children}
    </DockSurface>
  );
}
