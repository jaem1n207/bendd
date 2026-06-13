/**
 * 테마 전환 원형 리빌.
 *
 * View Transition은 전환 동안 살아있는 DOM을 정지된 스냅샷으로 대체해, 본문에서
 * 재생 중이던 애니메이션(예: 좌상단 서명 스트로크)이 멈췄다가 점프해 보인다.
 * 그래서 VT를 쓰지 않고 다음과 같이 구현한다.
 *
 *   1. 실제 DOM은 옛 테마 그대로 둔다 → 본문 애니메이션이 끊김 없이 계속 재생된다.
 *   2. 현재 화면의 복제본을 만들어 "새 테마"로 칠한 오버레이를 그 위에 얹는다.
 *   3. 오버레이를 토글 버튼 위치에서부터 원형(clip-path)으로 펼친다.
 *      → 원 안은 새 테마, 원 밖은 살아있는 옛 테마가 보인다(영상 속 리빌).
 *   4. 화면을 가득 덮으면 실제 테마를 커밋하고, 한 프레임 뒤 오버레이를 제거한다.
 *      실제 DOM은 내내 살아 있었으므로 복귀 시 점프가 없다.
 *
 * 복제본은 html이 아닌 div에 .dark/.light 클래스를 입혀 칠하므로, dark: 유틸리티가
 * 적용되도록 tailwind.config의 darkMode에 `.dark &` 셀렉터가 추가돼 있어야 한다.
 */

type ResolvedTheme = 'dark' | 'light';

type RevealThemeOptions = {
  /** 리빌이 펼쳐지기 시작하는 중심점(보통 토글 버튼 중앙) */
  origin: { x: number; y: number };
  /** 전환 후 적용될 테마 — 복제본을 이 테마로 칠한다 */
  nextResolvedTheme: ResolvedTheme;
  /** 실제 테마를 적용한다(next-themes 토글). 오버레이가 화면을 덮은 뒤 호출된다 */
  onCommit: () => void;
  /** 정리까지 끝났을 때 호출(성공/취소 무관) */
  onFinished?: () => void;
  /** 리빌 지속 시간(ms) */
  duration?: number;
};

const REVEAL_ATTR = 'data-theme-reveal';

/** 이 환경에서 원형 리빌을 쓸 수 있는지 */
export function canRevealTheme(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.body !== 'undefined' &&
    typeof document.body.animate === 'function' &&
    typeof CSS !== 'undefined' &&
    CSS.supports('clip-path', 'circle(10px at 10px 10px)')
  );
}

export function revealTheme({
  origin,
  nextResolvedTheme,
  onCommit,
  onFinished,
  duration = 600,
}: RevealThemeOptions): void {
  // 진행 중이던 이전 리빌이 남아 있으면 정리
  document.querySelectorAll(`[${REVEAL_ATTR}]`).forEach(node => node.remove());

  const { x, y } = origin;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const bodyWidth = document.body.clientWidth;

  const overlay = document.createElement('div');
  overlay.setAttribute(REVEAL_ATTR, '');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
  // .dark / .light → 복제본을 새 테마로 칠한다(CSS 변수 + dark: 유틸리티 모두)
  overlay.className = nextResolvedTheme;
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    overflow: 'hidden',
    pointerEvents: 'none',
    // body 복제본은 배경이 투명하므로(배경색은 html에 있음) 새 테마 배경을 직접 칠한다
    background: 'hsl(var(--background))',
    // 첫 페인트부터 반지름 0으로 클리핑해 깜빡임 방지(아래 애니메이션이 덮어씀)
    clipPath: `circle(0px at ${x}px ${y}px)`,
  });

  const clone = document.body.cloneNode(true) as HTMLElement;
  // 재실행/중복 부작용이 있는 노드는 제거(스크립트, iframe(giscus 등), 캔버스, 비디오)
  clone
    .querySelectorAll(`script, iframe, canvas, video, [${REVEAL_ATTR}]`)
    .forEach(node => node.remove());
  // 중복 id로 인한 getElementById/앵커 충돌 방지
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    // 현재 스크롤 위치에 맞춰 normal-flow 콘텐츠를 끌어올린다.
    // position:fixed 후손(서명·dock)은 뷰포트 기준이라 이 offset의 영향을 받지 않는다.
    position: 'fixed',
    top: `${-scrollY}px`,
    left: `${-scrollX}px`,
    width: `${bodyWidth}px`,
    margin: '0',
  });

  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  const dx = Math.max(x, window.innerWidth - x);
  const dy = Math.max(y, window.innerHeight - y);
  const maxRadius = Math.hypot(dx, dy);

  const animation = overlay.animate(
    {
      clipPath: [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${maxRadius}px at ${x}px ${y}px)`,
      ],
    },
    { duration, easing: 'ease-in-out', fill: 'forwards' }
  );

  const cleanup = () => {
    overlay.remove();
    onFinished?.();
  };

  animation.finished
    .then(() => {
      // 새 테마 복제본이 화면을 가득 덮은 상태에서 실제 테마를 적용 → 깜빡임 없음
      onCommit();
      // 실제 DOM에 새 테마 클래스가 반영(페인트)된 뒤 오버레이 제거
      waitForThemeApplied(nextResolvedTheme, cleanup);
    })
    .catch(cleanup);
}

/** 실제 html에 새 테마 클래스가 적용될 때까지 기다렸다가 콜백 실행(최대 6프레임 폴백) */
function waitForThemeApplied(theme: ResolvedTheme, done: () => void): void {
  const docEl = document.documentElement;
  let frames = 0;
  const check = () => {
    frames += 1;
    if (docEl.classList.contains(theme) || frames > 6) {
      // 새 테마가 페인트된 다음 프레임에 제거
      requestAnimationFrame(done);
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
