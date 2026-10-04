'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react';

import { playSound } from '@/components/sound/lib/play-sound';
import { useSoundStore } from '@/components/sound/model/sound-store';

type WithSoundProps = {
  children: ReactNode;
  assetPath: string;
};

export function WithSound({ children, assetPath }: WithSoundProps) {
  const child = Children.only(children);

  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  if (!isValidElement<{ onClick?: MouseEventHandler }>(child)) {
    return child;
  }

  return cloneElement(child, {
    onClick: (event: MouseEvent) => {
      child.props.onClick?.(event);
      if (isSoundEnabled) {
        playSound(assetPath);
      }
    },
  });
}
