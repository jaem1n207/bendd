/**
 * 테마 토글 전환.
 *
 * 본문 요소의 색을 직접 transition하면(예전 `*` 크로스페이드) 두 가지 문제가 있다.
 *   - 깜빡임: next-themes의 클래스 적용·React 리렌더가 색 transition을 도중에
 *     재시작시켜, 색이 최종값에 도달했다가 다시 중간값으로 튀었다 돌아온다.
 *   - 성능: 모든 요소(`*`)에 transition을 걸면 토글 동안 페이지 전체가 반복 페인트된다.
 *
 * 그래서 색은 transition하지 않는다. 테마는 **즉시**(한 번의 페인트로) 적용하고,
 * 그 순간을 짧은 **불투명 오버레이**로 가린다. 오버레이는 `opacity`만 애니메이션하므로
 * 컴포지터에서 처리되어(GPU) 본문을 다시 페인트하지 않는다. 본문 애니메이션(서명
 * 스트로크, Motion)은 오버레이 아래에서 그대로 살아 돌아가며, 색 transition이
 * 없으니 전환이 끝난 뒤 깜빡이지 않는다.
 *
 * 두 단계로 진행한다.
 *   1. 페이드인: 오버레이를 새 테마 배경색으로 불투명하게 덮는다.
 *   2. 덮인 상태에서 테마를 적용하고, 새 테마 클래스가 실제로 반영(페인트)될 때까지
 *      기다린 뒤 페이드아웃한다. next-themes의 비동기 적용 타이밍과 무관하게
 *      색 변경이 항상 불투명 구간 안에서 일어나므로 깜빡임이 보이지 않는다.
 */

type ResolvedTheme = 'dark' | 'light';

// globals.css의 --background와 동일하게 유지한다(라이트/다크 배경색).
const BACKGROUND_HSL: Record<ResolvedTheme, string> = {
  light: 'hsl(0 0% 100%)',
  dark: 'hsl(0 0% 3.9%)',
};

const OVERLAY_ATTR = 'data-theme-transition';
const FADE_IN_MS = 150;
const FADE_OUT_MS = 170;

export function canTransitionTheme(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.body !== null &&
    typeof document.body.animate === 'function'
  );
}

// 가장 최근 호출만 후속(applyTheme·페이드아웃)을 진행하도록 하는 토큰.
// 전환 중 다시 호출되면 이전 호출의 비동기 체인은 토큰 불일치로 중단된다.
let activeTransitionToken = 0;

export function transitionTheme({
  nextResolvedTheme,
  applyTheme,
  onDone,
}: {
  /** 전환 후 적용될 테마 — 오버레이를 이 테마의 배경색으로 칠한다 */
  nextResolvedTheme: ResolvedTheme;
  /** 실제 테마를 적용한다(next-themes 토글). 오버레이가 불투명한 순간 호출된다 */
  applyTheme: () => void;
  /** 정리까지 끝났을 때 호출(성공/취소 무관) */
  onDone?: () => void;
}): void {
  const token = ++activeTransitionToken;

  // 진행 중이던 이전 전환이 남아 있으면 정리
  document.querySelectorAll(`[${OVERLAY_ATTR}]`).forEach(node => node.remove());

  const overlay = document.createElement('div');
  overlay.setAttribute(OVERLAY_ATTR, '');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    pointerEvents: 'none',
    background: BACKGROUND_HSL[nextResolvedTheme],
    opacity: '0',
    willChange: 'opacity',
  });
  document.body.appendChild(overlay);

  // 오버레이가 덮은 동안 모든 색 transition을 꺼서 테마가 한 번에(누수 없이) 바뀌게
  // 한다. transition:none은 애니메이션을 막는 억제이므로 성능 비용이 없다.
  let killTransitions: HTMLStyleElement | null = null;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    killTransitions?.remove();
    overlay.remove();
    onDone?.();
  };

  const fadeIn = overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: FADE_IN_MS,
    easing: 'ease-in',
    fill: 'forwards',
  });

  fadeIn.finished
    .then(() => {
      // 그사이 새 전환이 시작됐다면(토큰 불일치) 이 체인은 중단하고 정리만 한다.
      if (token !== activeTransitionToken) {
        finish();
        return;
      }

      killTransitions = document.createElement('style');
      killTransitions.textContent =
        '*,*::before,*::after{transition:none !important}';
      document.head.appendChild(killTransitions);

      // 화면이 완전히 가려진 상태에서 테마를 적용한다.
      applyTheme();

      // 새 테마가 실제로 반영(페인트)된 다음에야 억제를 풀고 페이드아웃을 시작한다.
      waitForThemeApplied(nextResolvedTheme, () => {
        if (token !== activeTransitionToken) {
          finish();
          return;
        }
        killTransitions?.remove();
        killTransitions = null;
        const fadeOut = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: FADE_OUT_MS,
          easing: 'ease-out',
          fill: 'forwards',
        });
        fadeOut.finished.then(finish).catch(finish);
      });
    })
    .catch(finish);
}

/** 실제 html에 새 테마 클래스가 적용·페인트될 때까지 기다렸다 콜백 실행(최대 8프레임 폴백) */
function waitForThemeApplied(theme: ResolvedTheme, done: () => void): void {
  const root = document.documentElement;
  let frames = 0;
  const check = () => {
    frames += 1;
    if (root.classList.contains(theme) || frames > 8) {
      // 새 테마가 페인트된 다음 프레임에 페이드아웃 시작
      requestAnimationFrame(done);
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
