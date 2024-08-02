import { createStore } from 'zustand/vanilla';
import type { StepData } from './step-data';

export type StepContentState = {
  stepsData: StepData<any>[];
  currentStep: number;
  /**
   * 다음으로 이동할 때는 1, 뒤로 이동할 때는 -1을 설정해 애니메이션 방향을 결정합니다.
   */
  direction: number;
  /**
   * 애니메이션 중인지 여부를 나타냅니다.
   * 애니메이션 중엔 다음 단계로 넘어가거나 이전 단계로 돌아갈 수 없습니다.
   */
  isAnimating: boolean;
};

export type StepContentActions = {
  setStepsData: (steps: StepData<any>[]) => void;
  setCurrentStep: (index: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setIsAnimating: (isAnimating: boolean) => void;
};

export type StepContentStore = StepContentState & StepContentActions;

export const defaultInitState: StepContentState = {
  stepsData: [],
  currentStep: 0,
  direction: 0,
  isAnimating: false,
};

export const createStepContentStore = (
  initState: StepContentState = defaultInitState
) => {
  return createStore<StepContentStore>()((set, get) => ({
    ...initState,
    setStepsData: stepsData => set({ stepsData, currentStep: 0 }),
    setCurrentStep: index => {
      const { currentStep, isAnimating } = get();
      if (isAnimating) return;
      const direction = index > currentStep ? 1 : -1;
      set({ currentStep: index, direction, isAnimating: true });
    },
    nextStep: () => {
      const { currentStep, stepsData, isAnimating } = get();
      if (isAnimating) return;
      const nextStep = Math.min(currentStep + 1, stepsData.length - 1);
      if (nextStep !== currentStep) {
        set({ currentStep: nextStep, direction: 1, isAnimating: true });
      }
    },
    previousStep: () => {
      const { currentStep, isAnimating } = get();
      if (isAnimating) return;
      const previousStep = Math.max(currentStep - 1, 0);
      if (previousStep !== currentStep) {
        set({ currentStep: previousStep, direction: -1, isAnimating: true });
      }
    },
    setIsAnimating: isAnimating => set({ isAnimating }),
  }));
};
