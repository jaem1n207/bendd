import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arrayCache: Record<number, readonly number[]> = {};
/**
 * 지정된 길이의 배열을 생성합니다.
 * @example
 * ```jsx
 * <div className="space-y-2">
 *  {createFixedArray(5).map((i) => (
 *     <Skeleton key={i} className="h-4 w-[200px]" />
 *   ))}
 * </div>
 * ```
 */
export const createFixedArray = (length: number): readonly number[] => {
  arrayCache[length] ||=
    arrayCache[length] ||
    Array(length)
      .fill(0)
      .map((_, i) => i);

  return arrayCache[length];
};
