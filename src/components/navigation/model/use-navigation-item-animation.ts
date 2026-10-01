import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import useSound from 'use-sound';

import { DockInput } from '@/components/navigation/consts/dock';
import { useSoundStore } from '@/components/sound';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const PRESS_TRANSITION = 'transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const RELEASE_TRANSITION =
  'transform 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';

export function useNavigationItemAnimation({ name }: { name: string }) {
  const allowMotion = usePrefersReducedMotion() === false;
  const [pressed, setPressed] = useState(false);
  const [input, setInput] = useState(DockInput.Static);
  const pointer = useRef<number | null>(null);
  const enabled = useSoundStore(state => state.isSoundEnabled);
  const [play] = useSound('/sounds/blop.mp3', { soundEnabled: enabled });
  const stopMotion = useCallback(() => {
    pointer.current = null;
    setPressed(false);
  }, []);

  useEffect(() => {
    const release = (event: globalThis.PointerEvent) => {
      if (event.pointerId === pointer.current) {
        stopMotion();
      }
    };
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    window.addEventListener('blur', stopMotion);
    return () => {
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', stopMotion);
    };
  }, [stopMotion]);

  useEffect(() => {
    if (!allowMotion) {
      stopMotion();
    }
  }, [allowMotion, stopMotion]);

  const handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }
    pointer.current = event.pointerId;
    setInput(DockInput.Pointer);
    setPressed(true);
  };
  const handleKeyDown = () => {
    setInput(DockInput.Keyboard);
    stopMotion();
  };
  const handleClick = () => {
    if (name !== 'Toggle sound') {
      play();
    }
  };
  const animate = allowMotion && input === DockInput.Pointer;
  const bodyStyle = {
    transform: animate && pressed ? 'scale(0.97)' : 'none',
    transition: animate
      ? pressed
        ? PRESS_TRANSITION
        : RELEASE_TRANSITION
      : 'none',
  };

  return {
    handleClick,
    handlePointerDown,
    handleKeyDown,
    stopMotion,
    bodyStyle,
  };
}
