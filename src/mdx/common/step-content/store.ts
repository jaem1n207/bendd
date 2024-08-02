import { createStore } from 'zustand/vanilla';
import type { StepData } from './step-data';

export type StepContentState = {
  stepsData: StepData<any>[];
  currentStep: number;
  /**
   * 다음으로 이동할 때는 1, 뒤로 이동할 때는 -1을 설정해 애니메이션 방향을 결정합니다.
   */
  direction: number;
};

export type StepContentActions = {
  setStepsData: (steps: StepData<any>[]) => void;
  setCurrentStep: (index: number) => void;
  nextStep: () => void;
  previousStep: () => void;
};

export type StepContentStore = StepContentState & StepContentActions;

export const defaultInitState: StepContentState = {
  stepsData: [],
  currentStep: 0,
  direction: 0,
};

export const createStepContentStore = (
  initState: StepContentState = defaultInitState
) => {
  return createStore<StepContentStore>()((set, get) => ({
    ...initState,
    setStepsData: stepsData => set({ stepsData, currentStep: 0 }),
    setCurrentStep: index => {
      const { currentStep } = get();
      const direction = index > currentStep ? 1 : -1;
      set({ currentStep: index, direction });
    },
    nextStep: () => {
      const { currentStep, stepsData } = get();
      const nextStep = Math.min(currentStep + 1, stepsData.length - 1);
      if (nextStep !== currentStep) {
        set({ currentStep: nextStep, direction: 1 });
      }
    },
    previousStep: () => {
      const { currentStep } = get();
      const previousStep = Math.max(currentStep - 1, 0);
      if (previousStep !== currentStep) {
        set({ currentStep: previousStep, direction: -1 });
      }
    },
  }));
};
