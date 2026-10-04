import { motion, useIsPresent, type HTMLMotionProps } from 'motion/react';
import type { Ref } from 'react';

export function PrivacySurface({
  panelRef,
  ...props
}: HTMLMotionProps<'aside'> & { panelRef: Ref<HTMLElement> }) {
  const present = useIsPresent();
  return (
    <motion.aside
      {...props}
      ref={panelRef}
      inert={!present}
      aria-hidden={present ? undefined : true}
    />
  );
}
