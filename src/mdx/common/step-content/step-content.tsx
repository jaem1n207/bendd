import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useMeasure from 'react-use-measure';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { useStepContentStore } from '@/mdx/common/step-content/provider';
import type { StepData } from '@/mdx/common/step-content/step-data';

export function StepSelect() {
  const { stepsData, currentStep, setCurrentStep } = useStepContentStore(
    state => state
  );

  if (stepsData.length === 0) return null;

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

export function StepInfo({ className }: { className?: string }) {
  const { stepsData, currentStep, direction } = useStepContentStore(
    state => state
  );
  const stepData = stepsData[currentStep];

  const [ref, bounds] = useMeasure();

  return (
    <MotionConfig
      transition={{
        type: 'spring',
        bounce: 0.15,
      }}
    >
      <motion.div
        animate={{ height: bounds.height }}
        className={cn(
          'relative overflow-hidden rounded-md border border-border bg-background shadow-inner',
          className
        )}
      >
        <div ref={ref} className="relative px-4 py-2">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {stepData && (
              <motion.div
                key={currentStep}
                variants={variants}
                initial="initial"
                animate="active"
                exit="exit"
                custom={direction}
              >
                <Typography
                  variant="p"
                  affects="large"
                  asChild
                  className="mb-2"
                >
                  <p>{stepData.title}</p>
                </Typography>
                <Typography variant="p" asChild>
                  <p>{stepData.description}</p>
                </Typography>
              </motion.div>
            )}
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
    <div className={cn('mt-4', className)}>{render(stepData.content)}</div>
  );
}

export function StepActions({ className }: { className?: string }) {
  const { stepsData, currentStep, nextStep, previousStep } =
    useStepContentStore(state => state);

  if (stepsData.length === 0) return null;

  return (
    <motion.div layout className={cn('flex items-center space-x-2', className)}>
      <Button
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
        size="icon"
        variant="outline"
        onClick={nextStep}
        disabled={currentStep === stepsData.length - 1}
      >
        <ChevronRight className="size-4" />
      </Button>
    </motion.div>
  );
}
