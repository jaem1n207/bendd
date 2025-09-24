'use client';

import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import useSound from 'use-sound';

import { useSoundStore } from '../model/sound-store';

type WithSoundProps = {
  children: ReactNode;
  assetPath: string;
};

export function WithSound({ children, assetPath }: WithSoundProps) {
  const child = Children.only(children);

  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const [playClickSound] = useSound(assetPath, {
    soundEnabled: isSoundEnabled,
  });

  const processChild = (child: ReactNode): ReactNode => {
    if (isValidElement(child)) {
      const childProps = child.props as Record<string, any>;
      return cloneElement(child as React.ReactElement<any>, {
        onClick: () => {
          if (childProps.onClick) {
            childProps.onClick();
          }
          playClickSound();
        },
      });
    }
    return child;
  };

  const processedChild = processChild(child);

  return processedChild;
}
