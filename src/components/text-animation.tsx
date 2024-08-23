'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { useInterval } from '@/hooks/use-interval';
import { Typography } from './ui/typography';

type TextAnimationProps = {
  texts: string[];
  className?: string;
};

const MotionTitle = motion(Typography);

export const TextAnimation = ({ texts, className }: TextAnimationProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useInterval(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % texts.length);
  }, 3000);

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -25 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
          className="bd-text-lg bd-font-semibold bd-leading-7"
        >
          {texts[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};
