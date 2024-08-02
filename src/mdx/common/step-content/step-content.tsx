import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

import useMeasure from 'react-use-measure';
import { useStepContentStore } from './provider';
import type { StepData } from './step-data';

export function StepSelect() {
  const { stepsData, currentStep, isAnimating, setCurrentStep } =
    useStepContentStore(state => state);

  if (stepsData.length === 0) return null;

  return (
    <Select
      value={currentStep.toString()}
      onValueChange={value => setCurrentStep(Number(value))}
      disabled={isAnimating}
    >
      <SelectTrigger className="bd-mr-1 bd-flex-1">
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

export function StepInfo({ className }: { className?: string }) {
  const { stepsData, currentStep, direction, setIsAnimating } =
    useStepContentStore(state => state);

  const [ref, bounds] = useMeasure();

  const stepData = stepsData[currentStep];

  if (!stepData) return null;

  return (
    <MotionConfig
      transition={{
        duration: 0.4,
        type: 'spring',
        bounce: 0.15,
      }}
    >
      <motion.div
        animate={{ height: bounds.height }}
        className={cn(
          'bd-relative bd-overflow-hidden bd-rounded-md bd-border bd-border-border bd-bg-background bd-shadow-inner',
          className
        )}
      >
        <div ref={ref} className="bd-px-4 bd-py-2">
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={direction}
            onExitComplete={() => setIsAnimating(false)}
          >
            <motion.div
              key={currentStep}
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              custom={direction}
            >
              <Paragraph size="lg" className="bd-mb-2">
                {stepData.title}
              </Paragraph>
              <Paragraph>{stepData.description}</Paragraph>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

const variants = {
  initial: (direction: number) => ({ x: `${110 * direction}%`, opacity: 0 }),
  active: { x: '0%', opacity: 1 },
  exit: (direction: number) => ({ x: `${-110 * direction}%`, opacity: 0 }),
};

export function StepContent<T>({
  render,
  className,
}: {
  render: (content: T) => React.ReactNode;
  className?: string;
}) {
  const { stepsData, currentStep } = useStepContentStore(state => state);

  const stepData = stepsData[currentStep] as StepData<T>;

  if (!stepData) return null;

  return (
    <div className={cn('bd-mt-4', className)}>{render(stepData.content)}</div>
  );
}

export function StepActions({ className }: { className?: string }) {
  const { stepsData, currentStep, isAnimating, nextStep, previousStep } =
    useStepContentStore(state => state);

  if (stepsData.length === 0) return null;

  return (
    <motion.div
      layout
      className={cn('bd-flex bd-items-center bd-space-x-2', className)}
    >
      <Button
        size="icon"
        variant="outline"
        onClick={previousStep}
        disabled={currentStep === 0 || isAnimating}
      >
        <ChevronLeft className="bd-size-4" />
      </Button>
      <span className="bd-text-sm">
        {currentStep + 1} / {stepsData.length}
      </span>
      <Button
        size="icon"
        variant="outline"
        onClick={nextStep}
        disabled={currentStep === stepsData.length - 1 || isAnimating}
      >
        <ChevronRight className="bd-size-4" />
      </Button>
    </motion.div>
  );
}
