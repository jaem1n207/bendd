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
import { cn } from '@/lib/utils';

import { Typography } from '@/components/ui/typography';
import useMeasure from 'react-use-measure';
import { useStepContentStore } from './provider';
import type { StepData } from './step-data';

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
  const direction = useStepContentStore(state => state.direction);

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
          'bd-relative bd-overflow-hidden bd-rounded-md bd-border bd-border-border bd-bg-background bd-shadow-inner',
          className
        )}
      >
        <div ref={ref} className="bd-px-4 bd-py-2">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {/* 애니메이션 중 변경된 요소가 컴포넌트 트리에 여전히 존재하는지 액세스 가능하도록 */}
            <StepInfoContent />
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

function StepInfoContent() {
  const { stepsData, currentStep, direction } = useStepContentStore(
    state => state
  );

  const stepData = stepsData[currentStep];

  if (!stepData) return null;

  return (
    <motion.div
      key={currentStep}
      variants={variants}
      initial="initial"
      animate="active"
      exit="exit"
      custom={direction}
    >
      <Typography variant="p" affects="large" asChild className="bd-mb-2">
        <p>{stepData.title}</p>
      </Typography>
      <Typography variant="p" asChild>
        <p>{stepData.description}</p>
      </Typography>
    </motion.div>
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
  const { stepsData, currentStep, nextStep, previousStep } =
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
        disabled={currentStep === 0}
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
        disabled={currentStep === stepsData.length - 1}
      >
        <ChevronRight className="bd-size-4" />
      </Button>
    </motion.div>
  );
}
