'use client';

import { X } from 'lucide-react';
import { motion, useIsPresent } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  DOCK_MAX_MAGNIFICATION,
  DOCK_MAX_SIZE,
  DOCK_MIN_MAGNIFICATION,
  DOCK_MIN_SIZE,
  DockMotionMode,
  DockInput,
  DockSetting,
} from '@/components/navigation/consts/dock';
import { trackDockInput } from '@/components/navigation/lib/dock-input';
import type { DockPreferences } from '@/components/navigation/lib/dock-geometry';
import { DockSettingSlider } from '@/components/navigation/ui/dock-setting-slider';
import styles from '@/components/navigation/ui/dock.module.css';

const PANEL_WIDTH = 320;
const PANEL_EDGE = 12;
const PANEL_GAP = 14;
export interface DockSettingsAnchor {
  x: number;
  y: number;
  trigger: HTMLElement;
  input: DockInput;
}

export function DockSettings({
  id,
  anchor,
  preferences,
  mode,
  onPreview,
  onCommit,
  onReset,
  onClose,
}: {
  id: string;
  anchor: DockSettingsAnchor;
  preferences: DockPreferences;
  mode: DockMotionMode;
  onPreview: (setting: DockSetting, value: number | null) => void;
  onCommit: (setting: DockSetting, value: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const isPresent = useIsPresent();
  const [position, setPosition] = useState({
    left: PANEL_EDGE,
    top: PANEL_EDGE,
    width: PANEL_WIDTH,
  });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useLayoutEffect(() => {
    const place = () => {
      const viewportWidth =
        document.documentElement.clientWidth || window.innerWidth;
      const width = Math.min(PANEL_WIDTH, viewportWidth - PANEL_EDGE * 2);
      const height = panel.current?.offsetHeight ?? 0;
      setPosition({
        width,
        left: Math.max(
          PANEL_EDGE,
          Math.min(viewportWidth - width - PANEL_EDGE, anchor.x - width / 2)
        ),
        top: Math.max(
          PANEL_EDGE,
          Math.min(
            window.innerHeight - height - PANEL_EDGE,
            anchor.y - height - PANEL_GAP
          )
        ),
      });
    };
    place();
    const releaseInput = panel.current
      ? trackDockInput(panel.current, anchor.input)
      : undefined;
    if (anchor.input === DockInput.Keyboard) {
      panel.current?.querySelector('input')?.focus({ preventScroll: true });
    }
    window.addEventListener('resize', place);
    return () => {
      releaseInput?.();
      window.removeEventListener('resize', place);
    };
  }, [anchor]);
  useEffect(() => {
    if (!isPresent) {
      return;
    }
    const pointer = (event: globalThis.PointerEvent) => {
      if (
        !(event.target instanceof Node) ||
        panel.current?.contains(event.target) ||
        anchor.trigger.contains(event.target)
      ) {
        return;
      }
      onCloseRef.current();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      onCloseRef.current();
      anchor.trigger.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', key);
    };
  }, [anchor, isPresent]);
  const animated = mode === DockMotionMode.Animated;
  return (
    <motion.section
      ref={panel}
      id={id}
      role="dialog"
      aria-label="Dock 설정"
      aria-modal="false"
      aria-hidden={!isPresent}
      inert={!isPresent}
      className={styles.settingsPanel}
      style={{
        ...position,
        pointerEvents: isPresent ? 'auto' : 'none',
        transformOrigin: `${Math.max(0, anchor.x - position.left)}px bottom`,
      }}
      initial={{
        opacity: animated ? 0 : 1,
        scale: animated ? 0.96 : 1,
        y: animated ? 4 : 0,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: animated ? 0.16 : 0, ease: [0.19, 1, 0.22, 1] },
      }}
      exit={{
        opacity: 0,
        scale: animated ? 0.98 : 1,
        y: animated ? 2 : 0,
        transition: { duration: animated ? 0.1 : 0 },
      }}
      data-motion={mode}
      data-dock-input={anchor.input}
    >
      <div className={styles.settingsHeader}>
        <strong>Dock 설정</strong>
        <button
          type="button"
          aria-label="Dock 설정 닫기"
          onClick={() => {
            onClose();
            anchor.trigger.focus({ preventScroll: true });
          }}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <DockSettingSlider
        label="Dock 크기"
        value={preferences.size}
        min={DOCK_MIN_SIZE}
        max={DOCK_MAX_SIZE}
        step={1}
        unit="px"
        mode={mode}
        onPreview={value => onPreview(DockSetting.Size, value)}
        onCommit={value => onCommit(DockSetting.Size, value)}
      />
      <DockSettingSlider
        label="아이콘 확대"
        value={preferences.magnification}
        min={DOCK_MIN_MAGNIFICATION}
        max={DOCK_MAX_MAGNIFICATION}
        step={0.05}
        unit="×"
        mode={mode}
        onPreview={value => onPreview(DockSetting.Magnification, value)}
        onCommit={value => onCommit(DockSetting.Magnification, value)}
      />
      <div className={styles.settingsFooter}>
        <button type="button" onClick={onReset}>
          기본값으로 복원
        </button>
        <p>클릭하여 적용</p>
      </div>
    </motion.section>
  );
}
