import { useCallback, useEffect } from 'react';
import { useThrottle } from 'react-use';

export const getDistanceFromCenter = (element: HTMLElement): number => {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  return Math.abs(rect.top + rect.height / 2 - windowHeight / 2);
};

export const useViewportTracking = (
  ref: React.RefObject<HTMLElement>,
  id: string,
  updateWrapperState: (
    id: string,
    state: { distanceFromCenter: number }
  ) => void
) => {
  const updatePosition = useCallback(() => {
    if (ref.current) {
      const distanceFromCenter = getDistanceFromCenter(ref.current);
      updateWrapperState(id, { distanceFromCenter });
    }
  }, [ref, id, updateWrapperState]);

  const throttledUpdatePosition = useThrottle(updatePosition, 100);

  useEffect(() => {
    window.addEventListener('scroll', throttledUpdatePosition);
    window.addEventListener('resize', throttledUpdatePosition);
    return () => {
      window.removeEventListener('scroll', throttledUpdatePosition);
      window.removeEventListener('resize', throttledUpdatePosition);
    };
  }, [throttledUpdatePosition]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);
};
