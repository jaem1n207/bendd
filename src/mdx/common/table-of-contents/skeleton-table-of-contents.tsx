import { Skeleton } from '@/components/ui/skeleton';
import { createFixedArray } from '@/lib/utils';

export function SkeletonTableOfContents() {
  return (
    <div className="bd-ml-4 bd-mt-10 bd-grid bd-gap-4">
      {createFixedArray(5).map(i => (
        <Skeleton key={i} className="bd-h-5 bd-w-[10vw]" />
      ))}
    </div>
  );
}
