import { useAnimation, useSpring, useTransform } from 'framer-motion';
import useSound from 'use-sound';

import { useSoundStore } from '@/components/sound';
import {
  DEFAULT_DISTANCE,
  DEFAULT_ITEM_SIZE,
  DEFAULT_MAGNIFICATION,
} from '../consts/size';
import type { ItemMotionProps } from '../types/motion';

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
    [size, magnification, size]
  );
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 140,
    damping: 12,
  });

  const handleClick = async () => {
    name !== 'Toggle sound' && playClickSound();
    await controls.start({ top: -DEFAULT_ITEM_SIZE / 2 });
    controls.start({ top: 0 });
  };

  return { width, handleClick, controls };
};
