'use client';

import { shuffleLetters } from '@/components/article/lib/shuffle-letters';
import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';

type ShuffleLettersPayload = {
  text: string;
  iterations: number;
  fps: number;
};

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (promise: Promise<unknown>) => void;
};

export default function ShuffleLettersDemo() {
  const [text, setText] = useState(
    '한글 English 123456789 @#$%^&*()_+-=[]{}|;:,.<>?'
  );
  const [iterations, setIterations] = useState(8);
  const [fps, setFps] = useState(30);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedTextRef = useRef<HTMLDivElement>(null);
  const clearAnimationRef = useRef<(() => void) | null>(null);

  const stopAnimation = useCallback(() => {
    if (clearAnimationRef.current) {
      clearAnimationRef.current();
      (
        clearAnimationRef as React.MutableRefObject<(() => void) | null>
      ).current = null;
      setIsAnimating(false);

      // 즉시 텍스트를 원래 상태로 되돌립니다.
      if (animatedTextRef.current) {
        animatedTextRef.current.textContent = text;
      }
    }
  }, [text]);

  const startAnimation = useCallback(
    ({
      text: nextText,
      iterations: nextIterations,
      fps: nextFps,
    }: ShuffleLettersPayload) => {
      if (isAnimating || !animatedTextRef.current) return false;

      setText(nextText);
      setIterations(nextIterations);
      setFps(nextFps);
      animatedTextRef.current.textContent = nextText;
      setIsAnimating(true);
      clearAnimationRef.current = shuffleLetters(animatedTextRef.current, {
        iterations: nextIterations,
        fps: nextFps,
        onComplete: () => {
          setIsAnimating(false);
          clearAnimationRef.current = null;
        },
      });

      return true;
    },
    [isAnimating]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const started = startAnimation({ text, iterations, fps });
    const nativeEvent = e.nativeEvent as AgentSubmitEvent;

    if (nativeEvent.agentInvoked && nativeEvent.respondWith) {
      nativeEvent.respondWith(
        Promise.resolve({
          ok: started,
          text,
          iterations,
          fps,
        })
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAnimating) {
        stopAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnimating, stopAnimation]);

  useEffect(() => {
    const handleRun = (event: Event) => {
      const { detail } = event as CustomEvent<ShuffleLettersPayload>;
      if (!detail) return;
      startAnimation(detail);
    };

    const handleStop = () => {
      stopAnimation();
    };

    window.addEventListener('webmcp:run-shuffle-letters', handleRun);
    window.addEventListener('webmcp:stop-shuffle-letters', handleStop);

    return () => {
      window.removeEventListener('webmcp:run-shuffle-letters', handleRun);
      window.removeEventListener('webmcp:stop-shuffle-letters', handleStop);
    };
  }, [startAnimation, stopAnimation]);

  const isValid =
    text.trim() !== '' &&
    iterations >= 1 &&
    iterations <= 50 &&
    fps >= 1 &&
    fps <= 60;

  return (
    <main className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Shuffle Letters Playground</h1>
      <p className="text-center">
        Rauno의 프로젝트 페이지 렌더링 애니메이션을 구현하는 데 사용되는
        문자열을 섞는 데모입니다.
      </p>

      <form
        aria-label="Shuffle letters playground"
        toolname="run_shuffle_letters"
        tooldescription="Runs the shuffle letters animation with visible form values."
        toolautosubmit=""
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg p-6 shadow-md"
      >
        <h2 className="mb-4 text-xl font-semibold">옵션</h2>

        <div className="mb-4">
          <label htmlFor="text" className="mb-2 block text-sm font-medium">
            text
          </label>
          <input
            id="text"
            name="text"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            toolparamdescription="Text to animate with the shuffle letters effect."
            className="w-full rounded-md border border-input px-3 py-2"
            required
          />
        </div>

        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="iterations"
              className="mb-2 block text-sm font-medium"
            >
              iterations
            </label>
            <input
              id="iterations"
              name="iterations"
              type="number"
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              min="1"
              max="50"
              toolparamdescription="Number of random character replacements per letter. Use 1 through 50."
              className="w-full rounded-md border border-input px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="fps" className="mb-2 block text-sm font-medium">
              fps
            </label>
            <input
              id="fps"
              name="fps"
              type="number"
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              min="1"
              max="60"
              toolparamdescription="Animation frames per second. Use 1 through 60."
              className="w-full rounded-md border border-input px-3 py-2"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!isValid || isAnimating}
          className="w-full"
        >
          {isAnimating ? 'Shuffling...' : 'Shuffle'}
        </Button>
      </form>

      <div className="w-full max-w-md rounded-lg p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">결과</h2>
        <div
          ref={animatedTextRef}
          className="min-h-8 text-center text-lg font-medium"
        >
          {text}
        </div>
      </div>

      <div className="mt-4 w-full max-w-md rounded-lg bg-muted p-4">
        <h3 className="mb-2 text-lg font-semibold">Help</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>&quot;text&quot; 필드에 원하는 텍스트를 입력합니다.</li>
          <li>iterations(1~50)와 초당 fps(1~60)를 설정합니다.</li>
          <li>애니메이션을 시작하려면 &quot;Shuffle&quot;을 클릭합니다.</li>
          <li>
            진행 중인 애니메이션을 중지하려면 언제든지 ESC 키를 눌러주세요.
          </li>
        </ul>
      </div>
    </main>
  );
}
