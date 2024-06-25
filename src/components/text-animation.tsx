'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { Paragraph } from '@/components/ui/typography';
import { useInterval } from '@/hooks/use-interval';

type TextAnimationProps = {
  texts: string[];
  className?: string;
};

const MotionTitle = motion(Paragraph);

export const TextAnimation = ({ texts, className }: TextAnimationProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useInterval(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % texts.length);
  }, 3000);

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <MotionTitle
          key={currentIndex}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -25 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
          size="lg"
        >
          {texts[currentIndex]}
        </MotionTitle>
      </AnimatePresence>
    </div>
  );
};
