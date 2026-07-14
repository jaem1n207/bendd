'use client';

import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import useSound from 'use-sound';

import { useSoundStore } from '@/components/sound/model/sound-store';

type WithSoundProps = {
  children: ReactNode;
  assetPath: string;
};

type ClickableChildProps = {
  onClick?: () => void;
};

export function WithSound({ children, assetPath }: WithSoundProps) {
  const child = Children.only(children);

  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const [playClickSound] = useSound(assetPath, {
    soundEnabled: isSoundEnabled,
  });

  const processChild = (child: ReactNode): ReactNode => {
    if (isValidElement<ClickableChildProps>(child)) {
      return cloneElement(child, {
        onClick: () => {
          child.props.onClick?.();
          playClickSound();
        },
      });
    }
    return child;
  };

  const processedChild = processChild(child);

  return processedChild;
}
