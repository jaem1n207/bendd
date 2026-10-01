'use client';

import { useLayoutEffect, type ReactNode } from 'react';

import {
  DOCK_INITIAL_SIZE_SCRIPT,
  DOCK_INITIAL_SIZE_STYLE,
} from '@/components/navigation/lib/dock-initial-size';
import { useDockPreferences } from '@/components/navigation/model/dock-preferences';
import { DockSurface } from '@/components/navigation/ui/dock-surface';

export function NavigationAnimateTrigger({
  children,
}: {
  children: ReactNode;
}) {
  const { size, setSize, magnification, setMagnification, reset } =
    useDockPreferences();
  useLayoutEffect(() => {
    void useDockPreferences.persist.rehydrate();
  }, []);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DOCK_INITIAL_SIZE_SCRIPT }} />
      <DockSurface
        size={size}
        initialSizeStyle={DOCK_INITIAL_SIZE_STYLE}
        onSizeChange={setSize}
        magnification={magnification}
        onMagnificationChange={setMagnification}
        onReset={reset}
        label="사이트 탐색 Dock"
      >
        {children}
      </DockSurface>
    </>
  );
}
