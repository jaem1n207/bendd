import { Skeleton } from '@/components/ui/skeleton';
import { createFixedArray } from '@/lib/utils';

export function SkeletonTableOfContents() {
  return (
    <div className="ml-4 mt-10 grid gap-4">
      {createFixedArray(5).map(i => (
        <Skeleton key={i} className="h-5 w-[10vw]" />
      ))}
    </div>
  );
}
