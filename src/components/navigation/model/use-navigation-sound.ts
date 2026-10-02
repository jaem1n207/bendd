import useSound from 'use-sound';

import { useSoundStore } from '@/components/sound';

export function useNavigationSound({ name }: { name: string }) {
  const enabled = useSoundStore(state => state.isSoundEnabled);
  const [play] = useSound('/sounds/blop.mp3', { soundEnabled: enabled });

  const handleClick = () => {
    if (name !== 'Toggle sound') {
      play();
    }
  };

  return { handleClick };
}
