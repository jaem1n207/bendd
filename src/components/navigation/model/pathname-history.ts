/**
 * SPA 클라이언트 네비게이션의 직전 경로를 추적하는 모듈 상태.
 *
 * 모듈 스코프를 의도적으로 사용한다: 클라이언트 네비게이션(뒤로 가기 포함)
 * 에서는 유지되고, 새로고침이나 직접 진입 시에는 초기화된다. 서버에서는
 * effect가 실행되지 않아 기록이 항상 비어 있으므로 SSR 결과에 영향이 없다.
 */
let lastPathname: string | null = null;
let previousPathname: string | null = null;

export function recordPathname(pathname: string): void {
  // StrictMode 재실행 등으로 같은 경로가 중복 기록되면 직전 경로가 유실된다
  if (pathname === lastPathname) return;
  previousPathname = lastPathname;
  lastPathname = pathname;
}

/**
 * `current` 기준의 직전 경로를 반환한다.
 *
 * 레이아웃의 추적 effect가 새 경로를 먼저 기록한 뒤 페이지 컴포넌트가
 * 늦게 마운트되는 스트리밍 시나리오가 있어, 이미 기록된 현재 경로는
 * 건너뛰고 그 이전 경로를 돌려준다.
 */
export function getPreviousPathname(current: string): string | null {
  return lastPathname === current ? previousPathname : lastPathname;
}
