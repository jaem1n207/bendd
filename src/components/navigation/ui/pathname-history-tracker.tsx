'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { recordPathname } from '../model/pathname-history';

/**
 * 루트 레이아웃에 마운트되어 모든 경로 변경을 기록하는 null 컴포넌트.
 * 페이지 컴포넌트는 render 단계에서 기록을 읽고, 기록 갱신은 effect
 * 단계에서 일어나므로 같은 커밋 안에서는 항상 "이전" 경로가 보인다.
 */
export function PathnameHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    recordPathname(pathname);
  }, [pathname]);

  return null;
}
