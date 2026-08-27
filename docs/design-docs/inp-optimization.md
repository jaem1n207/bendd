# INP 최적화

> `body.antialiased`에서 248ms UI 블로킹을 유발하는 INP(Interaction to Next Paint) 문제의 원인 분석과 해결 방법을 기록한다.

## 문제

Chrome DevTools Performance 패널에서 `body.antialiased` 요소의 이벤트 핸들러가 `keyup` 이벤트 처리 시 248ms 동안 UI 업데이트를 차단하는 것이 감지되었다.

- **Input delay**: 125ms (이벤트가 핸들러에 도달하기까지 대기)
- **Processing + Render**: 203ms (핸들러 실행 + 렌더링)

## 원인 분석

### 1. TOC 스크롤 핸들러 (`use-toc.ts`)

| 항목                    | 문제                                                                 | 영향                      |
| ----------------------- | -------------------------------------------------------------------- | ------------------------- |
| `getAbsoluteTop()`      | `offsetParent` 체인을 순회하여 강제 레이아웃 재계산 유발             | 렌더링 지연               |
| `querySelectorAll('a')` | 활성 링크 집합이 바뀔 때마다 DOM 쿼리 반복 실행                      | 불필요한 DOM 접근         |
| `activateLink()`        | 활성 링크가 변경되지 않아도 모든 링크의 클래스를 제거 후 재설정      | 203ms 렌더 시간의 주 원인 |
| 스크롤 리스너           | `{ passive: true }` 미설정으로 브라우저가 JS 실행을 기다린 후 스크롤 | 125ms 입력 지연의 주 원인 |

### 2. 동기적 Analytics 호출

`@vercel/analytics`의 `track()` 함수가 테마 변경(`use-theme-manger.ts`)과 사운드 토글(`sound-switcher.tsx`)에서 동기적으로 호출되어 메인 스레드를 차단한다.

## 해결

### TOC 스크롤 핸들러 최적화

```typescript
// Before: offsetParent 체인 순회
function getAbsoluteTop(element: HTMLElement): number {
  let offsetTop = 0;
  while (element !== document.body) {
    offsetTop += element.offsetTop;
    element = element.offsetParent as HTMLElement;
  }
  return offsetTop;
}

// After: getBoundingClientRect 단일 호출
function getAbsoluteTop(element: HTMLElement): number {
  if (!element.isConnected) return NaN;
  return element.getBoundingClientRect().top + window.scrollY;
}
```

```typescript
// Before: 매 스크롤마다 querySelectorAll + 무조건 클래스 제거
function activateLink(hash: string | null) {
  const links = containerRef.current.querySelectorAll('a');
  links.forEach(link => {
    link.classList.remove('!text-foreground');
  });
  // ...
}

// After: 활성 링크 집합 변경 시에만 라이브 DOM 업데이트
let prevActiveKey: string | undefined;

function activateLinks(hashes: string[]) {
  const activeKey = hashes.join('\n');
  if (activeKey === prevActiveKey) return; // 변경 없으면 건너뛰기
  prevActiveKey = activeKey;
  const links = containerRef.current?.querySelectorAll('a');
  // ...
}
```

`querySelectorAll()` 결과는 캐싱하지 않는다. React 리렌더링이 링크 노드를 교체할 수
있으므로 활성 집합이 바뀌는 시점마다 현재 DOM을 다시 조회한다.

활성 링크가 바뀌면 React state나 SVG path를 갱신하지 않고 목록의
`--toc-active-top`, `--toc-active-bottom` CSS 변수만 변경한다. base와 active
rail이 같은 path를 공유하고 active rail의 `clip-path`만 보간하므로 스크롤 중
layout 재측정을 피한다. 처음에는 transition을 비활성화한 상태로 inset을
동기화하고 다음 rAF에서만 활성화해 초기 flash도 막는다.

```typescript
// Before: 비-passive 리스너
window.addEventListener('scroll', onScroll);

// After: passive 리스너
window.addEventListener('scroll', onScroll, { passive: true });
```

### Analytics 호출 지연

```typescript
// Before: 동기적 track() 호출
track('preferred_theme', { theme: resolvedTheme ?? 'system' });

// After: requestIdleCallback으로 유휴 시간에 실행
const rIC =
  globalThis.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 0));
rIC(() => {
  track('preferred_theme', { theme: resolvedTheme ?? 'system' });
});
```

`requestIdleCallback`을 지원하지 않는 환경에서는 `setTimeout(cb, 0)` 폴백을 사용한다.

## 변경 파일

| 파일                                            | 변경 내용                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/mdx/common/table-of-contents/use-toc.ts`   | `getBoundingClientRect` 측정, 활성 집합 변경 감지, passive 리스너, active rail CSS 변수 갱신 |
| `src/mdx/common/table-of-contents/toc-tree.ts`  | 스크롤과 분리된 순수 SVG geometry 생성, 행 경계 안에서 depth 전환 완료                       |
| `src/mdx/common/table-of-contents/toc-rail.tsx` | 초기·레이아웃 변경 시에만 연속 SVG path 측정 (`ResizeObserver`)                              |
| `src/components/theme/use-theme-manger.ts`      | `track()` → `requestIdleCallback` 래핑, cleanup 추가                                         |
| `src/components/sound/ui/sound-switcher.tsx`    | `track()` → `requestIdleCallback` 래핑                                                       |

## 회귀 테스트

이 최적화가 제거되거나 무효화되는 것을 방지하기 위한 자동 테스트:

| 테스트 파일                | 검증 항목                                           |
| -------------------------- | --------------------------------------------------- |
| `use-toc.spec.ts`          | 스크롤 리스너 `passive: true` 등록                  |
| `use-toc.spec.ts`          | 활성 집합 변경 시 라이브 링크 노드 재조회           |
| `use-toc.spec.ts`          | 동일 활성 집합일 때 DOM 업데이트 건너뛰기           |
| `use-toc.spec.ts`          | 화면에 보이는 모든 헤더와 offset 섹션 동시 활성화   |
| `use-toc.spec.ts`          | active rail의 위·아래 endpoint를 독립적으로 갱신    |
| `use-toc.spec.ts`          | unmount 시 리스너 정리                              |
| `toc-tree.spec.ts`         | depth별 일정한 들여쓰기와 행 경계 내 connector 곡선 |
| `toc-rail.spec.tsx`        | 하나의 연속 active path와 ResizeObserver cleanup    |
| `toc-sidebar.spec.ts`      | endpoint 중간 보간·방향 전환·reduced motion         |
| `use-theme-manger.spec.ts` | `track()`이 `requestIdleCallback`을 통해 지연 호출  |
| `use-theme-manger.spec.ts` | cleanup 시 idle callback 취소                       |
| `use-theme-manger.spec.ts` | `requestIdleCallback` 미지원 시 `setTimeout` 폴백   |
| `sound-switcher.spec.tsx`  | 클릭 시 `track()`이 `requestIdleCallback`으로 지연  |
| `sound-switcher.spec.tsx`  | 클릭 핸들러에서 `track()` 동기 호출 방지            |
| `sound-switcher.spec.tsx`  | `requestIdleCallback` 미지원 시 `setTimeout` 폴백   |

## 설계 제약

- **IntersectionObserver 사용 금지**: TOC에서 IntersectionObserver API를 의도적으로 제거한 이력이 있다 (관련 글: "TOC에서 InterSectionObserver API를 제거한 이유"). 스크롤 기반 접근을 유지한다.
- **throttle 주기 100ms 유지**: 현재 `throttleAndDebounce(setActiveLink, 100)`의 주기를 유지한다. 해시 변경 감지로 불필요한 DOM 업데이트가 이미 제거되었으므로 주기 증가는 불필요하다.
- **레일 geometry를 스크롤 경로에서 재계산하지 않음**: 스크롤에서는 활성 inset만 갱신한다. 링크 줄바꿈·폰트·viewport 때문에 행 크기가 바뀔 때만 `ResizeObserver`로 path를 다시 만든다.
- **depth 전환은 텍스트 시작 전 완료**: 링크의 상단 padding은 `6px`다. 곡선은 행 경계 `-6px ~ +6px` 안에서 완료해 현재 depth의 수직 레일과 텍스트 간격을 `11.5px`로 유지한다.
