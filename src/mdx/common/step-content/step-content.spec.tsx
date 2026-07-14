import { fireEvent, render, screen } from '@testing-library/react';
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
  const { nextStep } = useStepContentStore(state => state);

  return <button onClick={nextStep}>다음</button>;
}

describe('StepInfo', () => {
  it('다음 단계로 이동할 때 이전 단계를 남겨 exit 애니메이션을 실행한다', () => {
    render(
      <StepContentStoreProvider
        initState={{
          stepsData: [
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
          ],
          currentStep: 0,
          direction: 0,
        }}
      >
        <StepInfo />
        <StepControls />
      </StepContentStoreProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.queryByText('첫 번째 단계')).not.toBeNull();
    expect(screen.queryByText('두 번째 단계')).not.toBeNull();
  });
});
