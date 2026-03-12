import { cn } from '@/lib/utils';
import type { DetailedHTMLProps, VideoHTMLAttributes } from 'react';

export function MDXAutoplayVideo({
  src,
  className,
  ...props
}: DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>) {
  return (
    <div className="relative my-3 h-auto w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
      <video
        autoPlay
        loop
        muted
        playsInline
        src={src}
        className={cn(
          'w-full object-contain h-auto block my-0',
          className
        )}
        aria-label="Video player"
        {...props}
      />
    </div>
  );
}

export function MDXPreLoadVideo({
  src,
  className,
  ...props
}: DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>) {
  return (
    <div className="relative my-3 h-auto w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
      <video
        controls
        preload="metadata"
        loop
        muted
        playsInline
        className="my-0 block h-auto w-full object-contain"
        aria-label="Video player"
        {...props}
      >
        <source src={src} type="video/mp4" />
        동영상을 지원하지 않는 브라우저에요.
      </video>
    </div>
  );
}
