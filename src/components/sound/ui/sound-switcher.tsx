'use client';

import { track } from '@vercel/analytics';
import useSound from 'use-sound';

import { ClientGate } from '@/components/client-gate';
import { SoundMax, SoundMute } from '@/components/ui/icons';
import { useSoundStore } from '../model/sound-store';

export function SoundSwitcher() {
  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const toggleSoundEnabled = useSoundStore(state => state.toggleSoundEnabled);

  const [playUnmuteSound] = useSound('/sounds/unmute.mp3');
  const [playMuteSound] = useSound('/sounds/mute.mp3');

  const handleSoundToggle = () => {
    isSoundEnabled ? playMuteSound() : playUnmuteSound();
    toggleSoundEnabled();
    track('toggle_sound', {
      enabled: !isSoundEnabled,
    });
  };

  return (
    <button
      title="Toggle Sound"
      className="relative flex size-full items-center justify-center text-gray-950"
      onClick={handleSoundToggle}
    >
      <ClientGate>
        {isSoundEnabled ? (
          <SoundMax className="size-1/2" />
        ) : (
          <SoundMute className="size-1/2" />
        )}
      </ClientGate>
      <span className="sr-only">Toggle sound</span>
    </button>
  );
}
