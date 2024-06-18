'use client';

import { SoundMax, SoundMute } from './icons';
import { useSoundEnabled } from './model/sound';

export function SoundSwitcher() {
  const [isSoundEnabled, setIsSoundEnabled] = useSoundEnabled();

  return (
    <button
      title="Toggle Sound"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center"
      onClick={() => setIsSoundEnabled(!isSoundEnabled)}
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
