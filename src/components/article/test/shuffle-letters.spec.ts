import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shuffleLetters } from '../lib/shuffle-letters';

describe('shuffleLetters', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.textContent = 'Test content';
    document.body.appendChild(element);
  });

  afterEach(() => {
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
    const onComplete = vi.fn(() => {
      expect(onComplete).toHaveBeenCalled();
    });
    shuffleLetters(element, { onComplete });
  });

  it('the final text content of the element should be the same as in the beginning', () => {
    const initialText = element.textContent;
    const onComplete = () => {
      expect(element.textContent).toBe(initialText);
    };
    shuffleLetters(element, { onComplete, iterations: 1, fps: 1 });
  });

  it('should cleanup when called', () => {
    const clearShuffleLetters = shuffleLetters(element);
    expect(typeof clearShuffleLetters).toBe('function');
    clearShuffleLetters();
  });
});
