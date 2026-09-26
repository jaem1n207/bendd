import { useAnimation, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import useSound from 'use-sound';

import { useSoundStore } from '@/components/sound';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  DEFAULT_DISTANCE,
  DEFAULT_ITEM_SIZE,
  DEFAULT_MAGNIFICATION,
} from '@/components/navigation/consts/size';
import type { ItemMotionProps } from '@/components/navigation/types/motion';

type UseNavigationItemAnimationProps = {
  bounds: { x: number; width: number };
  size: number;
  name: string;
} & ItemMotionProps;

export const useNavigationItemAnimation = ({
  mousex,
  bounds,
  size = DEFAULT_ITEM_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  name,
}: UseNavigationItemAnimationProps) => {
  const controls = useAnimation();
  const allowMotion = usePrefersReducedMotion() === false;
  const runGeneration = useRef(0);
  const [hasPointerMoved, setHasPointerMoved] = useState(false);

  useEffect(() => {
    if (!allowMotion) {
      setHasPointerMoved(false);
      return;
    }
    return mousex?.on('change', position => {
      if (Number.isFinite(position)) {
        setHasPointerMoved(true);
      }
    });
  }, [allowMotion, mousex]);

  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const [playClickSound] = useSound('/sounds/blop.mp3', {
    soundEnabled: isSoundEnabled,
  });

  // `NavigationAnimateTrigger` 컴포넌트에서 `mouseX` 값을 전달하므로 값이 존재한다는 것을 보장할 수 있습니다.
  const distanceCalc = useTransform(mousex!, (val: number) => {
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, allowMotion ? magnification : size, size]
  );
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 140,
    damping: 12,
  });

  useEffect(() => {
    runGeneration.current += 1;
    if (!allowMotion) {
      controls.stop();
      controls.set({ top: 0 });
      width.jump(size);
    }

    return () => {
      runGeneration.current += 1;
      controls.stop();
    };
  }, [allowMotion, controls, size, width]);

  const handleClick = async () => {
    name !== 'Toggle sound' && playClickSound();
    const generation = ++runGeneration.current;
    if (!allowMotion) {
      return;
    }

    await controls.start({ top: -DEFAULT_ITEM_SIZE / 2 });
    if (generation === runGeneration.current) {
      void controls.start({ top: 0 });
    }
  };

  return {
    width: hasPointerMoved ? width : size,
    handleClick,
    controls,
    allowMotion,
  };
};
