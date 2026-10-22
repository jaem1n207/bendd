'use client';

import { shuffleInputSchema, useShuffleDemo } from '@/components/shuffle';
import { Button } from '@/components/ui/button';

export default function ShuffleLettersDemo() {
  const {
    text,
    setText,
    iterations,
    setIterations,
    fps,
    setFps,
    isAnimating,
    animatedTextRef,
    handleSubmit,
    isValid,
  } = useShuffleDemo({
    text: '한글 English 123456789 @#$%^&*()_+-=[]{}|;:,.<>?',
    iterations: 8,
    fps: 30,
  });

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
              min={shuffleInputSchema.properties.iterations.minimum}
              max={shuffleInputSchema.properties.iterations.maximum}
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
              min={shuffleInputSchema.properties.fps.minimum}
              max={shuffleInputSchema.properties.fps.maximum}
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
