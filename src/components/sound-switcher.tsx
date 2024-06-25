'use client';

import useSound from 'use-sound';

import { ClientGate } from './client-gate';
import { SoundMax, SoundMute } from './icons';
import { useSoundStore } from './sound';

export function SoundSwitcher() {
  const isSoundEnabled = useSoundStore(state => state.isSoundEnabled);
  const toggleSoundEnabled = useSoundStore(state => state.toggleSoundEnabled);

  const [playUnmuteSound] = useSound('/sounds/unmute.mp3');
  const [playMuteSound] = useSound('/sounds/mute.mp3');

  const handleSoundToggle = () => {
    isSoundEnabled ? playMuteSound() : playUnmuteSound();
    toggleSoundEnabled();
  };

  return (
    <button
      title="Toggle Sound"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center bd-text-gray-950"
      onClick={handleSoundToggle}
    >
      <ClientGate>
        {isSoundEnabled ? (
          <SoundMax className="bd-size-1/2" />
        ) : (
          <SoundMute className="bd-size-1/2" />
        )}
      </ClientGate>
      <span className="bd-sr-only">Toggle sound</span>
    </button>
  );
}
