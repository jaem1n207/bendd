'use client';

import { Settings2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useDockPreferences } from '@/components/navigation/model/dock-preferences';
import { DockControls } from '@/components/navigation/ui/dock-controls';
import { DockSurface } from '@/components/navigation/ui/dock-surface';
import styles from '@/components/navigation/ui/dock.module.css';
import { NavigationItemTooltip } from '@/components/navigation/ui/navigation-item-tooltip';

export function NavigationAnimateTrigger({
  children,
}: {
  children: ReactNode;
}) {
  const { size, magnification, setSize, setMagnification, reset } =
    useDockPreferences();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const pathname = usePathname();

  useEffect(() => {
    void useDockPreferences.persist.rehydrate();
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) {
      return;
    }
    panel.current
      ?.querySelector<HTMLInputElement>('input')
      ?.focus({ preventScroll: true });
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <>
      <DockSurface
        size={size}
        magnification={magnification}
        paused={open}
        label="사이트 탐색 Dock"
      >
        {children}
        <NavigationItemTooltip name="Dock 설정">
          <button
            ref={trigger}
            type="button"
            aria-label="Dock 설정"
            aria-expanded={open}
            aria-controls={open ? id : undefined}
            aria-haspopup="dialog"
            className="flex size-full items-center justify-center"
            onClick={() => setOpen(value => !value)}
          >
            <Settings2 aria-hidden="true" />
          </button>
        </NavigationItemTooltip>
      </DockSurface>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-labelledby={`${id}-title`}
            className={styles.settings}
          >
            <div className={styles.settingsHeader}>
              <h3 id={`${id}-title`}>Dock 설정</h3>
              <button
                type="button"
                aria-label="Dock 설정 닫기"
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus({ preventScroll: true });
                }}
              >
                <X size={16} />
              </button>
            </div>
            <DockControls
              size={size}
              magnification={magnification}
              onSizeChange={setSize}
              onMagnificationChange={setMagnification}
            />
            <div className={styles.settingsFooter}>
              <span>이 브라우저에 저장됩니다.</span>
              <button type="button" onClick={reset}>
                기본값으로
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
