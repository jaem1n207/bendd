import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { playSound } from '@/components/sound/lib/play-sound';
import { useSoundStore } from '@/components/sound/model/sound-store';
import { WithSound } from '@/components/sound/ui/with-sound';

vi.mock('@/components/sound/lib/play-sound', () => ({ playSound: vi.fn() }));

describe('WithSound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSoundStore.setState({ isSoundEnabled: false });
  });

  it('preserves the click event while muted and never loads audio', () => {
    const onClick = vi.fn();
    render(
      <WithSound assetPath="/sounds/blop.mp3">
        <button onClick={onClick}>Action</button>
      </WithSound>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'click' })
    );
    expect(playSound).not.toHaveBeenCalled();
  });

  it('plays only after an enabled interaction', () => {
    useSoundStore.setState({ isSoundEnabled: true });
    render(
      <WithSound assetPath="/sounds/blop.mp3">
        <button>Action</button>
      </WithSound>
    );
    expect(playSound).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(playSound).toHaveBeenCalledWith('/sounds/blop.mp3');
  });
});
