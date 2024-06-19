'use client';

import useSound from 'use-sound';

import { SoundMax, SoundMute } from './icons';
import { useSoundEnabled } from './model/sound';

export function SoundSwitcher() {
  const [isSoundEnabled, setIsSoundEnabled] = useSoundEnabled();

  const [playUnmuteSound] = useSound('/sounds/unmute.mp3');
  const [playMuteSound] = useSound('/sounds/mute.mp3');

  const handleSoundToggle = () => {
    isSoundEnabled ? playMuteSound() : playUnmuteSound();
    setIsSoundEnabled(!isSoundEnabled);
  };

  return (
    <button
      title="Toggle Sound"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center"
      onClick={handleSoundToggle}
    >
      {isSoundEnabled ? (
        <SoundMax className="bd-size-1/2" />
      ) : (
        <SoundMute className="bd-size-1/2" />
      )}
      <span className="bd-sr-only">Toggle sound</span>
    </button>
  );
}
