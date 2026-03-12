'use client';

import { shuffleLetters } from '@/components/article/lib/shuffle-letters';
import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAnimating) return;

    setIsAnimating(true);
    clearAnimationRef.current = shuffleLetters(animatedTextRef.current!, {
      iterations,
      fps,
      onComplete: () => {
        setIsAnimating(false);
        clearAnimationRef.current = null;
      },
    });
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

  const isValid =
    text.trim() !== '' &&
    iterations >= 1 &&
    iterations <= 50 &&
    fps >= 1 &&
    fps <= 60;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Shuffle Letters Playground</h1>
      <p className="text-center">
        Rauno의 프로젝트 페이지 렌더링 애니메이션을 구현하는 데 사용되는
        문자열을 섞는 데모입니다.
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg p-6 shadow-md"
      >
        <h2 className="mb-4 text-xl font-semibold">옵션</h2>

        <div className="mb-4">
          <label
            htmlFor="text"
            className="mb-2 block text-sm font-medium"
          >
            text
          </label>
          <input
            id="text"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
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
              type="number"
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              min="1"
              max="50"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="fps"
              className="mb-2 block text-sm font-medium"
            >
              fps
            </label>
            <input
              id="fps"
              type="number"
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              min="1"
              max="60"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
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

      <div className="mt-4 w-full max-w-md rounded-lg bg-gray-100 p-4">
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
    </div>
  );
}
