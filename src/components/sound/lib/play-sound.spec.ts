import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('on-demand interaction audio', () => {
  const play = vi.fn(() => Promise.resolve());
  const audio = { currentTime: 4, play };
  const createAudio = vi.fn(function () {
    return audio;
  });

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    play.mockResolvedValue(undefined);
    vi.stubGlobal('Audio', createAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not create or download audio on import', async () => {
    await import('@/components/sound/lib/play-sound');
    expect(createAudio).not.toHaveBeenCalled();
  });

  it('reuses the same audio element and restarts it on repeated clicks', async () => {
    const { playSound } = await import('@/components/sound/lib/play-sound');
    playSound('/sounds/blop.mp3');
    audio.currentTime = 1;
    playSound('/sounds/blop.mp3');
    expect(createAudio).toHaveBeenCalledOnce();
    expect(createAudio).toHaveBeenCalledWith('/sounds/blop.mp3');
    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('loads each different sound only when requested', async () => {
    const { playSound } = await import('@/components/sound/lib/play-sound');
    playSound('/sounds/unmute.mp3');
    expect(createAudio).toHaveBeenCalledTimes(1);
    playSound('/sounds/mute.mp3');
    expect(createAudio).toHaveBeenCalledTimes(2);
  });

  it('tolerates denied playback and browsers without audio', async () => {
    const { playSound } = await import('@/components/sound/lib/play-sound');
    play.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    expect(() => playSound('/sounds/blop.mp3')).not.toThrow();
    await Promise.resolve();
    vi.stubGlobal('Audio', undefined);
    expect(() => playSound('/sounds/mute.mp3')).not.toThrow();
  });
});
