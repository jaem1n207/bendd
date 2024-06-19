import { useLocalStorage } from 'react-use';

const soundEnabledKey = 'sound_enabled';

export function getSoundEnabled() {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    return true;
  }

  return localStorage.getItem(soundEnabledKey) === 'true';
}

export function useSoundEnabled() {
  return useLocalStorage(soundEnabledKey, true);
}
