import { create } from 'zustand';
import { StepData } from './step-content-wrapper';

interface StepStore<T> {
  stepsData: StepData<T>[];
  currentStep: number;
  /**
   * 앞으로 이동할 때는 1, 뒤로 이동할 때는 -1을 설정해 애니메이션 방향을 결정합니다.
   */
  direction: number;
  setStepsData: (steps: StepData<T>[]) => void;
  setCurrentStep: (index: number) => void;
  nextStep: () => void;
  previousStep: () => void;
}

export const useStepStore = create<StepStore<any>>(set => ({
  stepsData: [],
  currentStep: 0,
  direction: 0,
  setStepsData: stepsData => set({ stepsData, currentStep: 0 }),
  setCurrentStep: index =>
    set(state => {
      const direction = index > state.currentStep ? 1 : -1;
      return { currentStep: index, direction };
    }),
  nextStep: () =>
    set(state => {
      const nextStep = Math.min(
        state.currentStep + 1,
        state.stepsData.length - 1
      );
      return {
        currentStep: nextStep,
        direction: nextStep > state.currentStep ? 1 : 0,
      };
    }),
  previousStep: () =>
    set(state => {
      const prevStep = Math.max(state.currentStep - 1, 0);
      return {
        currentStep: prevStep,
        direction: prevStep < state.currentStep ? -1 : 0,
      };
    }),
}));
