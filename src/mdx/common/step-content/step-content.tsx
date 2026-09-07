import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

import { Typography } from '@/components/ui/typography';
import { useStepContentStore } from '@/mdx/common/step-content/provider';
import type { StepData } from '@/mdx/common/step-content/step-data';
import styles from '@/mdx/common/step-content/step-content.module.css';

export function StepSelect() {
  const { stepsData, currentStep, setCurrentStep } = useStepContentStore(
    state => state
  );

  if (stepsData.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentStep.toString()}
      onValueChange={value => setCurrentStep(Number(value))}
    >
      <SelectTrigger className="mr-1 flex-1">
        <SelectValue placeholder="단계 선택" />
      </SelectTrigger>
      <SelectContent>
        {stepsData.map((step, index) => (
          <SelectItem key={index} value={index.toString()}>
            {step.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export enum StepMotion {
  Animated = 'animated',
  Immediate = 'immediate',
}

export function StepInfo({
  className,
  onStepSettled,
  motion = StepMotion.Animated,
}: {
  className?: string;
  onStepSettled?: (step: number) => void;
  motion?: StepMotion;
}) {
  const stepsData = useStepContentStore(state => state.stepsData);
  const currentStep = useStepContentStore(state => state.currentStep);
  const direction = useStepContentStore(state => state.direction);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Reduced motion has no animationend event, including when toggled mid-slide.
    if (
      direction === 0 ||
      prefersReducedMotion ||
      motion === StepMotion.Immediate
    ) {
      onStepSettled?.(currentStep);
    }
  }, [currentStep, direction, motion, onStepSettled, prefersReducedMotion]);

  if (!stepsData[currentStep]) {
    return null;
  }

  return (
    <div
      data-direction={direction}
      data-motion={motion}
      className={cn(
        styles.panel,
        'relative overflow-hidden rounded-md border border-border bg-background px-4 py-2 shadow-inner',
        className
      )}
    >
      {/* Overlap descriptions to reserve their intrinsic maximum height at any width. */}
      {stepsData.map((step, index) => (
        <div
          key={index}
          className={styles.content}
          aria-hidden={index !== currentStep}
          onAnimationEnd={event => {
            if (index === currentStep && event.target === event.currentTarget) {
              onStepSettled?.(currentStep);
            }
          }}
        >
          <Typography variant="p" affects="large" asChild className="mb-2">
            <p>{step.title}</p>
          </Typography>
          <Typography variant="p" asChild>
            <p>{step.description}</p>
          </Typography>
        </div>
      ))}
    </div>
  );
}

export function StepContent<T>({
  render,
  className,
}: {
  render: (content: T) => React.ReactNode;
  className?: string;
}) {
  const { stepsData, currentStep } = useStepContentStore(state => state);

  const stepData = stepsData[currentStep] as StepData<T>;

  if (!stepData) {
    return null;
  }

  return (
    <div className={cn('mt-4', className)}>{render(stepData.content)}</div>
  );
}

export function StepActions({ className }: { className?: string }) {
  const { stepsData, currentStep, nextStep, previousStep } =
    useStepContentStore(state => state);

  if (stepsData.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        aria-label="이전 단계"
        size="icon"
        variant="outline"
        onClick={previousStep}
        disabled={currentStep === 0}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm">
        {currentStep + 1} / {stepsData.length}
      </span>
      <Button
        aria-label="다음 단계"
        size="icon"
        variant="outline"
        onClick={nextStep}
        disabled={currentStep === stepsData.length - 1}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
