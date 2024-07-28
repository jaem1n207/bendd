import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bd-animate-pulse bd-rounded-md bd-bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
