import { cn } from '@/lib/utils';
import type { DetailedHTMLProps, VideoHTMLAttributes } from 'react';

export function MDXAutoplayVideo({
  src,
  className,
  ...props
}: DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>) {
  return (
    <div className="bd:relative bd:my-3 bd:h-auto bd:w-full bd:overflow-hidden bd:rounded-xl bd:bg-gray-100 bd:ring-1 bd:ring-gray-200">
      <video
        autoPlay
        loop
        muted
        playsInline
        src={src}
        className={cn(
          'bd:w-full bd:object-contain bd:h-auto bd:block bd:my-0',
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
    <div className="bd:relative bd:my-3 bd:h-auto bd:w-full bd:overflow-hidden bd:rounded-xl bd:bg-gray-100 bd:ring-1 bd:ring-gray-200">
      <video
        controls
        preload="metadata"
        loop
        muted
        playsInline
        className="bd:my-0 bd:block bd:h-auto bd:w-full bd:object-contain"
        aria-label="Video player"
        {...props}
      >
        <source src={src as string} type="video/mp4" />
        동영상을 지원하지 않는 브라우저에요.
      </video>
    </div>
  );
}
