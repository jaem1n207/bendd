'use client';

import { shuffleLetters } from '@/components/article/lib/shuffle-letters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { createMDXComponent } from '../../common/create-mdx-component';

const ShuffleLettersDemoSchema = z.object({
  initialText: z.string().optional().default('한글 English 123 @#$%'),
  initialIterations: z.number().min(1).max(50).optional().default(8),
  initialFps: z.number().min(1).max(60).optional().default(30),
});

type ShuffleLettersDemoProps = z.infer<typeof ShuffleLettersDemoSchema>;

function ShuffleLettersDemo({
  initialText = '한글 English 123 @#$%',
  initialIterations = 15,
  initialFps = 40,
}: ShuffleLettersDemoProps) {
  const [text, setText] = useState(initialText);
  const [iterations, setIterations] = useState(initialIterations);
  const [fps, setFps] = useState(initialFps);
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
    text &&
    text.trim() !== '' &&
    iterations >= 1 &&
    iterations <= 50 &&
    fps >= 1 &&
    fps <= 60;

  return (
    <div className="bd-mt-6 bd-flex bd-flex-col bd-items-center bd-gap-4 bd-rounded-lg bd-border bd-border-gray-200 bd-bg-secondary bd-p-6">
      <div className="bd-mb-4 bd-text-center">
        <h3 className="bd-mb-2 bd-text-xl bd-font-bold">
          Shuffle Letters Playground
        </h3>
        <p className="bd-text-sm bd-text-secondary-foreground dark:bd-text-secondary-foreground">
          `iterations`와 `fps` 값을 조정하여 애니메이션 효과를 실험해보세요
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bd-w-full bd-max-w-md bd-space-y-4"
      >
        <div>
          <label
            htmlFor="text"
            className="bd-mb-2 bd-block bd-text-sm bd-font-medium"
          >
            텍스트
          </label>
          <Input
            id="text"
            type="text"
            value={text || ''}
            onChange={e => setText(e.target.value)}
            required
          />
        </div>

        <div className="bd-flex bd-gap-4">
          <div className="bd-flex-1">
            <label
              htmlFor="iterations"
              className="bd-mb-2 bd-block bd-text-sm bd-font-medium"
            >
              iterations (1-50)
            </label>
            <Input
              id="iterations"
              type="number"
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              min="1"
              max="50"
              required
            />
          </div>
          <div className="bd-flex-1">
            <label
              htmlFor="fps"
              className="bd-mb-2 bd-block bd-text-sm bd-font-medium"
            >
              fps (1-60)
            </label>
            <Input
              id="fps"
              type="number"
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              min="1"
              max="60"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={!isValid || isAnimating}
          className="bd-w-full"
        >
          {isAnimating ? 'Shuffling...' : 'Shuffle'}
        </Button>
      </form>

      <div className="bd-w-full bd-max-w-md bd-rounded-lg bd-border bd-border-gray-200 bd-bg-white bd-p-4 dark:bd-border-gray-600 dark:bd-bg-gray-800">
        <h4 className="bd-mb-3 bd-text-center bd-text-lg bd-font-semibold">
          결과
        </h4>
        <div
          ref={animatedTextRef}
          className="bd-min-h-8 bd-py-2 bd-text-center bd-text-lg bd-font-medium"
        >
          {text || ''}
        </div>
      </div>

      <div className="bd-w-full bd-max-w-md bd-space-y-1 bd-text-xs bd-text-gray-500 dark:bd-text-gray-400">
        <p>
          • 텍스트를 입력하고 옵션을 조정한 후 &quot;Shuffle&quot; 버튼을
          클릭하세요
        </p>
        <p>• 애니메이션 중 ESC 키로 언제든 중단할 수 있습니다</p>
        <p>• iterations: 각 문자당 랜덤 변환 횟수</p>
        <p>• fps: 초당 프레임 수 (높을수록 빠름)</p>
      </div>
    </div>
  );
}

export const MDXShuffleLettersDemo = createMDXComponent(
  ShuffleLettersDemo,
  ShuffleLettersDemoSchema
);
