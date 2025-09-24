import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bd:bg-accent bd:animate-pulse bd:rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
