import { useAnimation } from 'motion/react';
import { useEffect, useRef } from 'react';
import useSound from 'use-sound';

import { DockInput } from '@/components/navigation/consts/dock';
import { useSoundStore } from '@/components/sound';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const BOUNCE_HEIGHT = 20;

export function useNavigationItemAnimation({ name }: { name: string }) {
  const controls = useAnimation();
  const allowMotion = usePrefersReducedMotion() === false;
  const runGeneration = useRef(0);
  const enabled = useSoundStore(state => state.isSoundEnabled);
  const [play] = useSound('/sounds/blop.mp3', { soundEnabled: enabled });

  useEffect(() => {
    runGeneration.current += 1;
    if (!allowMotion) {
      controls.stop();
      controls.set({ y: 0 });
    }
    return () => {
      runGeneration.current += 1;
      controls.stop();
    };
  }, [allowMotion, controls]);

  const stopMotion = () => {
    runGeneration.current += 1;
    controls.stop();
    controls.set({ y: 0 });
  };

  const handleClick = async (input = DockInput.Pointer) => {
    if (name !== 'Toggle sound') {
      play();
    }
    const generation = ++runGeneration.current;
    if (!allowMotion || input !== DockInput.Pointer) {
      stopMotion();
      return;
    }
    await controls.start({ y: -BOUNCE_HEIGHT });
    if (generation === runGeneration.current) {
      void controls.start({ y: 0 });
    }
  };

  return { handleClick, stopMotion, controls, allowMotion };
}
