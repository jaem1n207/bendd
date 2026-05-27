import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SoundState = {
  isSoundEnabled: boolean;
  toggleSoundEnabled: () => void;
  setSoundEnabled: (enabled: boolean) => void;
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      isSoundEnabled: false,
      toggleSoundEnabled: () => {
        set({ isSoundEnabled: !get().isSoundEnabled });
      },
      setSoundEnabled: enabled => {
        set({ isSoundEnabled: enabled });
      },
    }),
    {
      name: 'sound-enabled',
    }
  )
);
