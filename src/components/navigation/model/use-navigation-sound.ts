import { playSound, useSoundStore } from '@/components/sound';

export function useNavigationSound({ name }: { name: string }) {
  const enabled = useSoundStore(state => state.isSoundEnabled);

  const handleClick = () => {
    if (enabled && name !== 'Toggle sound') {
      playSound('/sounds/blop.mp3');
    }
  };

  return { handleClick };
}
