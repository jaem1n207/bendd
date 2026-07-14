import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { frame } from 'motion/react';
import { vi } from 'vitest';

import {
  StepContentStoreProvider,
  useStepContentStore,
} from '@/mdx/common/step-content/provider';
import { StepInfo } from '@/mdx/common/step-content/step-content';

vi.mock('react-use-measure', () => ({
  default: () => [vi.fn(), { height: 100 }],
}));

function StepControls() {
  const { nextStep, previousStep } = useStepContentStore(state => state);

  return (
    <>
      <button onClick={previousStep}>이전</button>
      <button onClick={nextStep}>다음</button>
    </>
  );
}

const stepsData = [
  {
    title: '첫 번째 단계',
    description: '첫 번째 설명',
    content: null,
  },
  {
    title: '두 번째 단계',
    description: '두 번째 설명',
    content: null,
  },
];

const renderStepInfo = (currentStep: number) => {
  render(
    <StepContentStoreProvider
      initState={{
        stepsData,
        currentStep,
        direction: 0,
      }}
    >
      <StepInfo />
      <StepControls />
    </StepContentStoreProvider>
  );
};

const nextFrame = async () => {
  await new Promise<void>(resolve => {
    frame.postRender(() => resolve());
  });
};

const getStepElement = (title: string) => {
  const element = screen.getByText(title).parentElement;

  if (!(element instanceof HTMLElement)) {
    throw new Error(`${title}의 motion element를 찾을 수 없습니다.`);
  }

  return element;
};

describe('StepInfo', () => {
  it('다음 단계는 오른쪽에서 들어오고 현재 단계는 왼쪽으로 나간다', async () => {
    renderStepInfo(0);

    await act(nextFrame);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await act(nextFrame);

    await waitFor(() => {
      expect(getStepElement('첫 번째 단계').style.transform).toMatch(
        /^translateX\(-/
      );
      expect(getStepElement('두 번째 단계').style.transform).toMatch(
        /^translateX\((?!-)/
      );
    });
  });

  it('이전 단계는 왼쪽에서 들어오고 현재 단계는 오른쪽으로 나간다', async () => {
    renderStepInfo(1);

    await act(nextFrame);

    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await act(nextFrame);

    await waitFor(() => {
      expect(getStepElement('두 번째 단계').style.transform).toMatch(
        /^translateX\((?!-)/
      );
      expect(getStepElement('첫 번째 단계').style.transform).toMatch(
        /^translateX\(-/
      );
    });
  });
});
