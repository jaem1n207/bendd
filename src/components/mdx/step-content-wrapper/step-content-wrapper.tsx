import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Paragraph } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

export type Step<T> = {
  title: string;
  description: string;
  content: T;
};

type CommonProps = {
  className?: string;
};

type StepSelectProps<T> = {
  steps: Step<T>[];
  currentIndex: number;
  onStepChange: (index: number) => void;
};

export function StepSelect<T>({
  steps,
  currentIndex,
  onStepChange,
}: StepSelectProps<T>) {
  return (
    <Select
      value={currentIndex.toString()}
      onValueChange={value => onStepChange(Number(value))}
    >
      <SelectTrigger className="bd-mr-1 bd-flex-1">
        <SelectValue placeholder="단계 선택" />
      </SelectTrigger>
      <SelectContent>
        {steps.map((step, index) => (
          <SelectItem key={index} value={index.toString()}>
            {step.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type StepInfoProps<T> = {
  step: Step<T>;
} & CommonProps;

export function StepInfo<T>({ step, className }: StepInfoProps<T>) {
  return (
    <div
      className={cn(
        'bd-rounded-md bd-border bd-border-border bd-bg-background bd-px-4 bd-py-2 bd-shadow',
        className
      )}
    >
      <Paragraph size="lg" className="bd-mb-2">
        {step.title}
      </Paragraph>
      <Paragraph>{step.description}</Paragraph>
    </div>
  );
}

type StepContentProps<T> = {
  step: Step<T>;
  render: (content: T) => React.ReactNode;
} & CommonProps;

export function StepContent<T>({
  step,
  render,
  className,
}: StepContentProps<T>) {
  return <div className={cn('bd-mt-4', className)}>{render(step.content)}</div>;
}

type StepNavigationProps = {
  currentIndex: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
} & CommonProps;

export function StepNavigation({
  currentIndex,
  totalSteps,
  onPrevious,
  onNext,
  className,
}: StepNavigationProps) {
  return (
    <div className={cn('bd-flex bd-items-center bd-space-x-2', className)}>
      <Button
        size="icon"
        variant="outline"
        onClick={onPrevious}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="bd-size-4" />
      </Button>
      <span className="bd-text-sm">
        {currentIndex + 1} / {totalSteps}
      </span>
      <Button
        size="icon"
        variant="outline"
        onClick={onNext}
        disabled={currentIndex === totalSteps - 1}
      >
        <ChevronRight className="bd-size-4" />
      </Button>
    </div>
  );
}
