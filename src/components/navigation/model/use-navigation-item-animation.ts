import { animate, useMotionValue } from 'motion/react';
import { useEffect, useRef, type MouseEvent } from 'react';
import useSound from 'use-sound';

import {
  DOCK_BOUNCE_DURATION,
  DOCK_BOUNCE_RATIO,
  DOCK_BOUNCE_RISE,
  DOCK_DEFAULT_SIZE,
} from '@/components/navigation/consts/dock';
import { useSoundStore } from '@/components/sound';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function useNavigationItemAnimation({ name }: { name: string }) {
  const allowMotion = usePrefersReducedMotion() === false;
  const y = useMotionValue(0);
  const cancel = useRef<(() => void) | null>(null);
  const enabled = useSoundStore(state => state.isSoundEnabled);
  const [play] = useSound('/sounds/blop.mp3', { soundEnabled: enabled });

  useEffect(() => {
    const stop = () => {
      cancel.current?.();
      y.set(0);
    };
    if (!allowMotion) {
      stop();
    }
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('blur', stop);
      stop();
    };
  }, [allowMotion, y]);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (name !== 'Toggle sound') {
      play();
    }
    if (!allowMotion || event.detail === 0 || event.button !== 0) {
      return;
    }
    cancel.current?.();
    const size = event.currentTarget.offsetWidth || DOCK_DEFAULT_SIZE;
    const motion = animate(y, [y.get(), -size * DOCK_BOUNCE_RATIO, 0], {
      duration: DOCK_BOUNCE_DURATION,
      times: [0, DOCK_BOUNCE_RISE / DOCK_BOUNCE_DURATION, 1],
      ease: [
        [0.22, 1, 0.36, 1],
        [0.65, 0, 0.35, 1],
      ],
    });
    cancel.current = () => motion.stop();
  };
  const handleKeyDown = () => {
    cancel.current?.();
    y.set(0);
  };
  return { handleClick, handleKeyDown, bodyStyle: { y } };
}
