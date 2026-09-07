import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import {
  StepContentStoreProvider,
  useStepContentStore,
} from '@/mdx/common/step-content/provider';
import { StepInfo } from '@/mdx/common/step-content/step-content';

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => false,
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

const getStepElement = (title: string) => {
  const element = screen.getByText(title).parentElement;

  if (!(element instanceof HTMLElement)) {
    throw new Error(`${title}의 설명 패널을 찾을 수 없습니다.`);
  }

  return element;
};

describe('StepInfo', () => {
  it('다음 단계만 노출하고 앞으로 슬라이드할 방향을 전달한다', () => {
    renderStepInfo(0);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(getStepElement('첫 번째 단계').getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(getStepElement('두 번째 단계').getAttribute('aria-hidden')).toBe(
      'false'
    );
    expect(
      getStepElement('두 번째 단계').parentElement?.dataset.direction
    ).toBe('1');
  });

  it('이전 단계만 노출하고 뒤로 슬라이드할 방향을 전달한다', () => {
    renderStepInfo(1);

    fireEvent.click(screen.getByRole('button', { name: '이전' }));

    expect(getStepElement('두 번째 단계').getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(getStepElement('첫 번째 단계').getAttribute('aria-hidden')).toBe(
      'false'
    );
    expect(
      getStepElement('첫 번째 단계').parentElement?.dataset.direction
    ).toBe('-1');
  });
});
