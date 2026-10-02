'use client';

import { AnimatePresence } from 'motion/react';
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import {
  DOCK_DEFAULT_MAGNIFICATION,
  DockInput,
  DockInteraction,
  DockMotionMode,
  DockSetting,
} from '@/components/navigation/consts/dock';
import {
  readDockPreferences,
  type DockPreferences,
} from '@/components/navigation/lib/dock-geometry';
import {
  createDockMotion,
  type DockTooltipState,
} from '@/components/navigation/lib/dock-motion';
import { trackDockInput } from '@/components/navigation/lib/dock-input';
import { createDockPress } from '@/components/navigation/lib/dock-press';
import { createDockResize } from '@/components/navigation/lib/dock-resize';
import { DockContext } from '@/components/navigation/model/dock-context';
import {
  DockSettings,
  type DockSettingsAnchor,
} from '@/components/navigation/ui/dock-settings';
import { DockTooltip } from '@/components/navigation/ui/dock-tooltip';
import styles from '@/components/navigation/ui/dock.module.css';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useScrollFade } from '@/hooks/use-scroll-fade';

export function DockSurface({
  children,
  size,
  initialSizeStyle,
  magnification = DOCK_DEFAULT_MAGNIFICATION,
  onSizeChange,
  onMagnificationChange,
  onReset,
  label = 'Dock',
}: {
  children: ReactNode;
  size: number;
  initialSizeStyle?: string;
  magnification?: number;
  onSizeChange: (size: number) => void;
  onMagnificationChange?: (value: number) => void;
  onReset?: () => void;
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const resize = useRef<ReturnType<typeof createDockResize> | null>(null);
  const motion = useRef<ReturnType<typeof createDockMotion> | null>(null);
  const saved = useRef(readDockPreferences({ size, magnification }));
  const current = useRef(saved.current);
  const callbacks = useRef({ onSizeChange, onMagnificationChange, onReset });
  callbacks.current = { onSizeChange, onMagnificationChange, onReset };
  const interaction = useRef(DockInteraction.Idle);
  const settingsOpen = useRef(false);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortal(document.body);
  }, []);
  const [anchor, setAnchor] = useState<DockSettingsAnchor | null>(null);
  const [tooltip, setTooltip] = useState<DockTooltipState | null>(null);
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const mode =
    reduced === false ? DockMotionMode.Animated : DockMotionMode.Static;
  useScrollFade(viewport, 'x', Children.count(children));

  const setInteraction = useCallback((value: DockInteraction) => {
    interaction.current = value;
    if (root.current) {
      root.current.dataset.dockSettings = String(
        value !== DockInteraction.Idle
      );
    }
    motion.current?.setInteraction(value);
  }, []);
  const apply = useCallback((value: DockPreferences) => {
    current.current = value;
    resize.current?.setSize(value.size);
    if (!resize.current) {
      motion.current?.setPreferences(value);
    }
  }, []);
  const close = useCallback(() => {
    settingsOpen.current = false;
    setAnchor(null);
    setInteraction(DockInteraction.Idle);
    apply(saved.current);
  }, [apply, setInteraction]);
  const open = useCallback(
    (handle: HTMLElement, input: DockInput) => {
      settingsOpen.current = true;
      const rect = handle.getBoundingClientRect();
      setAnchor({
        x: rect.left + rect.width / 2,
        y: rect.top,
        trigger: handle,
        input,
      });
      setInteraction(DockInteraction.Settings);
      apply(saved.current);
    },
    [apply, setInteraction]
  );

  useEffect(() => {
    if (!root.current) {
      return;
    }
    const releaseInput = trackDockInput(root.current);
    const releasePress = createDockPress(root.current);
    const driver = createDockResize({
      root: root.current,
      handles: Array.from(
        root.current.querySelectorAll<HTMLElement>('[data-dock-separator]')
      ),
      size: saved.current.size,
      onPreview: value => {
        current.current = { ...current.current, size: value };
        motion.current?.setPreferences(current.current);
      },
      onCommit: value => {
        saved.current = { ...saved.current, size: value };
        callbacks.current.onSizeChange(value);
      },
      onOpen: open,
    });
    resize.current = driver;
    return () => {
      releaseInput();
      releasePress();
      driver.dispose();
      resize.current = null;
    };
  }, [open]);
  useEffect(() => {
    if (!root.current) {
      return;
    }
    const driver = createDockMotion({
      root: root.current,
      mode,
      tooltipId: id,
      onTooltip: setTooltip,
    });
    motion.current = driver;
    driver.setPreferences(current.current);
    driver.setInteraction(interaction.current);
    return () => {
      driver();
      motion.current = null;
    };
  }, [mode, id]);
  useEffect(() => {
    saved.current = readDockPreferences({ size, magnification });
    apply(saved.current);
  }, [size, magnification, apply]);

  const preview = (setting: DockSetting, value: number | null) => {
    if (!settingsOpen.current) {
      return;
    }
    setInteraction(
      value !== null && setting === DockSetting.Magnification
        ? DockInteraction.Preview
        : DockInteraction.Settings
    );
    apply(
      value === null ? saved.current : { ...saved.current, [setting]: value }
    );
  };
  const commit = (setting: DockSetting, value: number) => {
    if (!settingsOpen.current || saved.current[setting] === value) {
      return;
    }
    const next = readDockPreferences({ ...saved.current, [setting]: value });
    saved.current = next;
    apply(next);
    if (setting === DockSetting.Size) {
      callbacks.current.onSizeChange(next.size);
    } else {
      callbacks.current.onMagnificationChange?.(next.magnification);
    }
  };
  const reset = () => {
    const next = readDockPreferences(null);
    saved.current = next;
    setInteraction(DockInteraction.Settings);
    apply(next);
    if (callbacks.current.onReset) {
      callbacks.current.onReset();
      return;
    }
    callbacks.current.onSizeChange(next.size);
    callbacks.current.onMagnificationChange?.(next.magnification);
  };
  const preferences = readDockPreferences({ size, magnification });
  const variables: CSSProperties & { '--dock-size': string } = {
    '--dock-size': initialSizeStyle ?? `${preferences.size}px`,
  };
  return (
    <DockContext.Provider
      value={{ size: preferences.size, id, expanded: anchor !== null }}
    >
      <div
        ref={root}
        className={styles.dock}
        style={variables}
        role="group"
        aria-label={label}
        data-dock=""
        data-dock-mode={mode}
        data-dock-input={DockInput.Pointer}
      >
        <div className={styles.backdrop} data-dock-backdrop="" />
        <div
          className={styles.hoverArea}
          data-dock-hover-area=""
          aria-hidden="true"
        />
        <div
          ref={viewport}
          className={`${styles.viewport} scroll-fade-x [--scroll-fade-reveal:32px] [--scroll-fade-size:12px]`}
          data-dock-viewport=""
        >
          <div className={styles.rail} data-dock-rail="">
            {children}
          </div>
        </div>
        <span id={`${id}-resize-help`} className="sr-only">
          위아래로 끌어 크기를 조절합니다. 우클릭이나 Enter로 설정을 엽니다.
        </span>
        <div className={styles.tooltipAnchor} data-dock-tooltip="">
          <DockTooltip id={id} state={tooltip} mode={mode} />
        </div>
      </div>
      {portal &&
        createPortal(
          <AnimatePresence>
            {anchor && (
              <DockSettings
                key={id}
                id={`${id}-settings`}
                anchor={anchor}
                preferences={preferences}
                mode={mode}
                onPreview={preview}
                onCommit={commit}
                onReset={reset}
                onClose={close}
              />
            )}
          </AnimatePresence>,
          portal
        )}
    </DockContext.Provider>
  );
}
