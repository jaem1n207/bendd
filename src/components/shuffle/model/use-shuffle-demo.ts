'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { shuffleLetters } from '@/lib/shuffle-letters';
import {
  parseShuffleInput,
  type ShuffleInput,
} from '@/components/shuffle/lib/shuffle-input';
import {
  connectShuffleDemo,
  type ShuffleResult,
} from '@/components/shuffle/lib/shuffle-registry';

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (promise: Promise<unknown>) => void;
};

export function useShuffleDemo(initial: ShuffleInput, onComplete?: () => void) {
  const [text, setText] = useState(initial.text);
  const [iterations, setIterations] = useState(initial.iterations);
  const [fps, setFps] = useState(initial.fps);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedTextRef = useRef<HTMLDivElement>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const intendedRef = useRef(initial.text);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const stopAnimation = useCallback((): ShuffleResult => {
    const element = animatedTextRef.current;
    if (!element?.isConnected) {
      return { ok: false, error: '준비된 Shuffle 데모가 없습니다.' };
    }
    if (!clearRef.current) {
      return { ok: true };
    }
    clearRef.current();
    clearRef.current = null;
    element.textContent = intendedRef.current;
    setIsAnimating(false);
    return { ok: true };
  }, []);

  const startAnimation = useCallback((input: unknown): ShuffleResult => {
    const parsed = parseShuffleInput(input);
    if (!parsed.ok) {
      return parsed;
    }
    const element = animatedTextRef.current;
    if (!element?.isConnected) {
      return { ok: false, error: '준비된 Shuffle 데모가 없습니다.' };
    }
    if (clearRef.current) {
      return { ok: false, error: 'Shuffle 데모가 이미 실행 중입니다.' };
    }
    const value = parsed.value;
    intendedRef.current = value.text;
    element.textContent = value.text;
    clearRef.current = shuffleLetters(element, {
      iterations: value.iterations,
      fps: value.fps,
      onComplete: () => {
        clearRef.current = null;
        setIsAnimating(false);
        completeRef.current?.();
      },
    });
    setText(value.text);
    setIterations(value.iterations);
    setFps(value.fps);
    setIsAnimating(true);
    return { ok: true, ...value };
  }, []);

  useEffect(() => {
    const element = animatedTextRef.current;
    if (!element) {
      return;
    }
    const disconnect = connectShuffleDemo({
      element,
      run: startAnimation,
      stop: stopAnimation,
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopAnimation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      disconnect();
      clearRef.current?.();
      clearRef.current = null;
      element.textContent = intendedRef.current;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startAnimation, stopAnimation]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input: Record<string, unknown> = {};
    for (const control of Array.from(form.elements)) {
      if (control instanceof HTMLInputElement && control.name) {
        input[control.name] =
          control.type === 'number' ? control.valueAsNumber : control.value;
      }
    }
    const result = startAnimation(input);
    const native = event.nativeEvent as AgentSubmitEvent;
    if (native.agentInvoked && native.respondWith) {
      native.respondWith(Promise.resolve(result));
    }
  };

  return {
    text,
    setText,
    iterations,
    setIterations,
    fps,
    setFps,
    isAnimating,
    animatedTextRef,
    handleSubmit,
    isValid: parseShuffleInput({ text, iterations, fps }).ok,
  };
}
