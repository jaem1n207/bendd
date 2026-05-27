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

type ShuffleLettersPayload = {
  text: string;
  iterations: number;
  fps: number;
};

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (promise: Promise<unknown>) => void;
};

function parseShuffleLettersPayload(
  detail: unknown
): ShuffleLettersPayload | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const { text, iterations, fps } = detail as Partial<
    Record<keyof ShuffleLettersPayload, unknown>
  >;

  if (typeof text !== 'string' || text.trim() === '') return null;
  if (
    typeof iterations !== 'number' ||
    !Number.isFinite(iterations) ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > 50
  ) {
    return null;
  }
  if (
    typeof fps !== 'number' ||
    !Number.isFinite(fps) ||
    !Number.isInteger(fps) ||
    fps < 1 ||
    fps > 60
  ) {
    return null;
  }

  return { text, iterations, fps };
}

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
  const intendedDisplayTextRef = useRef(initialText);

  const stopAnimation = useCallback(() => {
    if (clearAnimationRef.current) {
      clearAnimationRef.current();
      clearAnimationRef.current = null;
      setIsAnimating(false);

      // 즉시 텍스트를 원래 상태로 되돌립니다.
      if (animatedTextRef.current) {
        animatedTextRef.current.textContent = intendedDisplayTextRef.current;
      }
    }
  }, []);

  const startAnimation = useCallback(
    ({
      text: nextText,
      iterations: nextIterations,
      fps: nextFps,
    }: ShuffleLettersPayload) => {
      if (clearAnimationRef.current || !animatedTextRef.current) return false;

      intendedDisplayTextRef.current = nextText;
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
    []
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
      const { detail } = event as CustomEvent<unknown>;
      const payload = parseShuffleLettersPayload(detail);
      if (!payload) return;
      startAnimation(payload);
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
    text &&
    text.trim() !== '' &&
    iterations >= 1 &&
    iterations <= 50 &&
    fps >= 1 &&
    fps <= 60;

  return (
    <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-secondary p-6">
      <div className="mb-4 text-center">
        <h3 className="mb-2 text-xl font-bold">Shuffle Letters Playground</h3>
        <p className="text-sm text-secondary-foreground dark:text-secondary-foreground">
          `iterations`와 `fps` 값을 조정하여 애니메이션 효과를 실험해보세요
        </p>
      </div>

      <form
        aria-label="Shuffle letters playground"
        toolname="run_shuffle_letters"
        tooldescription="Runs the shuffle letters animation with visible form values."
        toolautosubmit=""
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4"
      >
        <div>
          <label htmlFor="text" className="mb-2 block text-sm font-medium">
            텍스트
          </label>
          <Input
            id="text"
            name="text"
            type="text"
            value={text || ''}
            onChange={e => setText(e.target.value)}
            toolparamdescription="Text to animate with the shuffle letters effect."
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="iterations"
              className="mb-2 block text-sm font-medium"
            >
              iterations (1-50)
            </label>
            <Input
              id="iterations"
              name="iterations"
              type="number"
              value={iterations}
              onChange={e => setIterations(Number(e.target.value))}
              min="1"
              max="50"
              toolparamdescription="Number of random character replacements per letter. Use 1 through 50."
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="fps" className="mb-2 block text-sm font-medium">
              fps (1-60)
            </label>
            <Input
              id="fps"
              name="fps"
              type="number"
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              min="1"
              max="60"
              toolparamdescription="Animation frames per second. Use 1 through 60."
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

      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
        <h4 className="mb-3 text-center text-lg font-semibold">결과</h4>
        <div
          ref={animatedTextRef}
          className="min-h-8 py-2 text-center text-lg font-medium"
        >
          {text || ''}
        </div>
      </div>

      <div className="w-full max-w-md space-y-1 text-xs text-gray-500 dark:text-gray-400">
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
