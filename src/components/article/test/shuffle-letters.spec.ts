import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shuffleLetters } from '../lib/shuffle-letters';

const MAX_FRAMES = 1000;
const FRAME_DURATION = 16;

// rAF를 수동 제어해 프레임 단위로 결정적으로 진행시킨다
let pendingFrames: Map<number, FrameRequestCallback>;
let nextRafId: number;
let frameTime: number;

function advanceFrame() {
  frameTime += FRAME_DURATION;
  const frames = [...pendingFrames.values()];
  pendingFrames.clear();
  frames.forEach(callback => callback(frameTime));
}

function advanceFramesUntil(predicate: () => boolean) {
  for (let frame = 0; frame < MAX_FRAMES && !predicate(); frame++) {
    advanceFrame();
  }
}

describe('shuffleLetters', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.textContent = 'Test content';
    document.body.appendChild(element);

    pendingFrames = new Map();
    nextRafId = 0;
    frameTime = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      nextRafId += 1;
      pendingFrames.set(nextRafId, callback);
      return nextRafId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
      pendingFrames.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.removeChild(element);
  });

  it('should throw error if iterations is out of range', () => {
    expect(() => shuffleLetters(element, { iterations: 0 })).toThrow(
      RangeError
    );
    expect(() => shuffleLetters(element, { iterations: 51 })).toThrow(
      RangeError
    );
  });

  it('should throw error if fps is out of range', () => {
    expect(() => shuffleLetters(element, { fps: 0 })).toThrow(RangeError);
    expect(() => shuffleLetters(element, { fps: 61 })).toThrow(RangeError);
  });

  it('should throw error if first argument is not HTMLElement', () => {
    const invalidElement = 'h1' as unknown as HTMLElement; // 잘못된 타입의 요소
    expect(() => shuffleLetters(invalidElement)).toThrow(TypeError);
  });

  it('should call the onComplete callback', () => {
    const onComplete = vi.fn();
    shuffleLetters(element, { onComplete });

    advanceFramesUntil(() => onComplete.mock.calls.length > 0);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(element);
  });

  it('the final text content of the element should be the same as in the beginning', () => {
    const initialText = element.textContent;
    const onComplete = vi.fn();
    shuffleLetters(element, { onComplete, iterations: 1, fps: 30 });

    advanceFramesUntil(() => onComplete.mock.calls.length > 0);

    expect(onComplete).toHaveBeenCalled();
    expect(element.textContent).toBe(initialText);
  });

  it('should cleanup when called', () => {
    const onComplete = vi.fn();
    const clearShuffleLetters = shuffleLetters(element, { onComplete });
    expect(typeof clearShuffleLetters).toBe('function');

    clearShuffleLetters();
    for (let frame = 0; frame < 100; frame++) {
      advanceFrame();
    }

    expect(onComplete).not.toHaveBeenCalled();
  });
});
