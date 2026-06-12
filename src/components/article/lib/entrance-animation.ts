/**
 * 목록 입장 애니메이션(stagger + 셔플)을 경로별로 한 번만 재생하기 위한 기록.
 *
 * 모듈 스코프 상태를 의도적으로 사용한다:
 * - SPA 클라이언트 네비게이션(뒤로 가기 포함)에서는 모듈이 유지되므로
 *   재방문 시 애니메이션을 생략해 목록을 즉시 훑어볼 수 있다.
 * - 새로고침이나 직접 진입 시에는 모듈이 초기화되어 애니메이션이 다시 재생된다.
 * - 서버에서는 effect가 실행되지 않아 기록이 비어 있으므로
 *   SSR 결과는 항상 "애니메이션 재생" 상태와 일치한다 (hydration mismatch 없음).
 *
 * sessionStorage를 쓰지 않는 이유: 탭 세션 전체에서 효과가 사라지는 데다,
 * 첫 로드 hydration 시점에 서버 HTML과 클라이언트 판정이 어긋날 수 있다.
 */
const playedPathnames = new Set<string>();

export function shouldPlayEntranceAnimation(pathname: string): boolean {
  return !playedPathnames.has(pathname);
}

export function markEntranceAnimationPlayed(pathname: string): void {
  playedPathnames.add(pathname);
}
