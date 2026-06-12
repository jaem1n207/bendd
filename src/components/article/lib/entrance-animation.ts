import { getPreviousPathname } from '@/components/navigation';

/**
 * 목록 입장 애니메이션(stagger + 셔플)은 "섹션에 들어왔다"는 신호이므로
 * 직전 경로가 해당 목록의 하위 경로(글 상세, 시리즈 등)일 때만 생략한다.
 * 글을 읽고 뒤로 가기로 돌아온 직후에는 목록을 즉시 훑어볼 수 있어야 하고,
 * 다른 섹션에서 넘어올 때(/article ↔ /craft)는 다시 재생한다.
 *
 * 경로 기록(pathname-history)은 SPA 네비게이션에서만 유지되므로
 * 새로고침이나 직접 진입 시에는 항상 재생되고, hydration이 일어나는 최초
 * 로드에서는 기록이 비어 있어 SSR 결과(재생 상태)와 어긋나지 않는다.
 */
export function shouldPlayEntranceAnimation(listPathname: string): boolean {
  const previous = getPreviousPathname(listPathname);
  if (!previous) return true;

  // '/article-foo'처럼 접두사만 같은 형제 경로를 하위 경로로 오인하지 않도록
  // 경계 문자('/')까지 포함해 비교한다
  const childPrefix = listPathname.endsWith('/')
    ? listPathname
    : `${listPathname}/`;
  return !previous.startsWith(childPrefix);
}
