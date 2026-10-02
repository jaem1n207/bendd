# 006 — 스크롤 중에도 초기 등장 순서 유지하기

- **Commit:** `5332fa0` + 2026-09-30 현재 미커밋 홈 구현
- **Status:** DONE · 로컬 구현·자동 검증·브라우저 관측 완료 · 실제 터치 기기 미확인
- **Severity:** MEDIUM
- **Category:** Interruptibility & input handling
- **Estimated scope:** 홈 모션 구현·회귀 테스트 2개 파일, 명세 보완 1개 파일
- **사용자 지정 범위:** 이미 내려간 위치에서 로드되어도 정상 등장한다. 재생 중 스크롤해도 처음 정한 등장 순서와 개별 900ms 재생을 끝까지 유지한다.

아래 Problem/Current code/Target/Steps는 구현 전 계획이다. 이후 승인된 손글씨 60ms 후행·360ms 회전과 실제 검증 범위는 하단 실행 기록 및 최신 [홈 모션 명세](../docs/design-docs/home-initial-motion-brief.md)를 기준으로 읽는다.

## Problem

현재 `window`의 `scroll` 이벤트는 초기 연출의 남은 지연을 취소하고 140ms 마무리로 전환한다. 이는 사용자가 새로 선택한 “스크롤해도 예정된 등장 순서를 끝까지 유지”하는 동작과 다르다.

스크롤 리스너만 제거해서는 충분하지 않다. 현재 `pointerdown`은 정적 본문을 누를 때도 해당 묶음을 즉시 표시하고, 홈 바깥을 누르면 모든 활성 효과를 끝낸다. 터치 스크롤 시작도 시간표를 끊을 수 있다. `keydown` 역시 모든 일반 키에서 전체 연출을 끝내므로 본문에서 PageDown·Space로 스크롤하는 경우를 구분해야 한다.

이 계획은 이전 006의 “사용자 스크롤 의도를 판별하여 140ms로 마무리”하는 제안을 대체한다. 입력 의도 추적이나 250ms 유효 기간은 더 이상 필요하지 않다. 이번 판단은 현재 코드를 다시 읽어 확인했으며, 계획 수정 단계에서는 브라우저 재현·테스트·빌드를 실행하지 않았다.

## Recon

- Next.js 14 / React 18. CSS + Web Animations API + IntersectionObserver를 사용한다.
- 첫 표시 안전장치는 `home-motion.module.css`, 재생과 입력 처리는 `HomeMotion`, 초기 시간표는 `home-reveal-plan.ts`에 있다.
- 초기 대상은 effect 초기화 시 실제 뷰포트와 겹치는 요소다. `scrollY > 0`만으로 초기 연출을 금지하는 조건은 없다.
- 초기 900ms와 `cubic-bezier(0.25, 0.1, 0.25, 1)`는 승인된 연출이다. 이를 일반 UI의 짧은 전환으로 바꾸지 않는다.
- 처음에 화면 밖이었던 요소는 최초 진입 시 지연 0ms·280ms, 메모는 200ms로 등장한다.
- 포커스, 실제 컨트롤 조작, reduced motion, 테마 변경, 페이지 이탈의 즉시 표시 정책은 유지한다. 단순 페이지 스크롤 입력에는 적용하지 않는다.

## Where

| File                                                                                                                              | Lines   | What's there                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| [home-motion.tsx](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:71)                      | 71–119  | 활성 효과와 `initial`·`entering`·`settling` 상태                  |
| [home-motion.tsx](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:151)                     | 151–200 | 실제 뷰포트 기준 초기 대상과 900ms 시간표                         |
| [home-motion.tsx](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:203)                     | 203–245 | 스크롤·키보드·포인터에 의한 조기 완료                             |
| [home-motion.tsx](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:268)                     | 268–283 | 이벤트 등록·정리                                                  |
| [home-motion.spec.tsx](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.spec.tsx:273)           | 273–319 | 스크롤 또는 정적 본문 pointerdown에서 조기 완료를 기대하는 테스트 |
| [home-initial-motion-brief.md](/Users/jaemin/programming/projects/active/bendd/docs/design-docs/home-initial-motion-brief.md:113) | 113–124 | 이전 스크롤 중단 정책                                             |

### Current code

```tsx
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:220
snapshots.forEach(({ element, inViewport, from }) => {
  if (inViewport) start(element, from, 'settling', 140);
  else show(element);
});
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:269
window.addEventListener('scroll', handleScroll, { passive: true });
```

```tsx
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:225
const handleKeyboard = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  keyboardNavigation = true;
  settleActive();
};
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:238
const handlePointer = (event: PointerEvent) => {
  keyboardNavigation = false;
  showTarget(event.target);
  // Includes the existing Dock theme control, before its click handler runs.
  if (event.target instanceof Node && !container.contains(event.target))
    settleActive();
};
```

```tsx
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.spec.tsx:283
fireEvent.scroll(window);
expect(animate).toHaveBeenCalledTimes(4);
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.spec.tsx:314
fireEvent.pointerDown(first);
expect(first.dataset.revealState).toBe('visible');
```

## Target

| 상황                                                    | 목표                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `scrollY > 0`인 위치에서 초기화                         | 현재 뷰포트의 요소에 정상 초기 시간표 적용. 양수 위치만으로 생략하지 않음 |
| 재생 중 휠·트랙패드·터치·스크롤바로 페이지 이동         | 기존 Animation 인스턴스·지연·시작 순서·900ms 지속 시간 유지               |
| 본문에서 방향키·PageUp·PageDown·Home·End·Space로 스크롤 | 스크롤만을 이유로 조기 완료하지 않음. 기본 브라우저 동작 유지             |
| 자동 위치 복원·프로그램에 의한 페이지 이동              | 스크롤 이벤트로 시간표를 취소하거나 다시 생성하지 않음                    |
| 초기 대상이 재생 도중 화면 밖으로 나감                  | 예정된 시간표로 자연 종료. 다시 보일 때 재시작하지 않음                   |
| 처음에 화면 밖이던 요소가 새로 진입                     | 기존 지연 없는 280ms 등장 유지. 메모는 200ms                              |
| 정적 본문·여백에서 pointerdown 또는 터치 이동           | 초기 연출 유지. 포인터 입력 모드만 갱신                                   |
| Tab 포커스 이동·링크/버튼 활성화·입력 컨트롤 조작       | 필요한 묶음을 즉시 선명하게 표시하여 읽기·조작 보장                       |
| reduced motion·실제 테마 변경·페이지 이탈               | 기존 즉시 표시·정리 동작 유지                                             |

**유지할 정확한 모션 값**

- 초기: 900ms, `cubic-bezier(0.25, 0.1, 0.25, 1)`. 각 효과의 기존 `delay`를 유지한다.
- 프로필 내부 36ms 간격, 다음 섹션은 앞 섹션의 마지막 시작에서 120ms 뒤. 목록은 제목 → 첫/선택 항목 → 나머지 순서다.
- 목록 첫 항목은 제목에서 36ms 뒤, 뒤따르는 항목은 60ms 간격이며 네 번째 시작 이후 추가 지연을 늘리지 않는다. 마지막 전체 시작이 600ms를 넘으면 기존 비례 압축을 유지한다.
- 화면 밖 첫 진입: delay 0ms, 280ms(메모 200ms), `cubic-bezier(0.19, 1, 0.22, 1)`.
- 마지막 프레임: opacity 1, `blur(0px)`, `translateY(0px)`. 자연 종료 후 기존 `show()`로 효과를 해제하여 CSS의 `filter: none`, `transform: none`으로 정리한다.
- 기존 기기 폭별 blur·이동 거리와 blur 12개 상한은 변경하지 않는다.

**입력 처리**

1. `handleScroll`과 `window`의 scroll 등록·해제를 제거한다. 140ms 전환과 `settling` 상태를 제거하고, 활성 효과에서 더 이상 쓰이지 않는 phase 메타데이터도 정리한다. 초기 대상과 시간표를 스크롤 때 다시 계산하지 않는다.
2. `pointerdown` 자체는 `keyboardNavigation = false`만 수행한다. 정적 본문, 여백, 스크롤바의 입력을 컨트롤 활성화로 간주하지 않는다.
3. 실제 컨트롤 활성화는 별도의 capture `click` 경로에서 처리한다. `Element` 타입 확인 후 가장 가까운 `a[href]`, `button`, `input`, `select`, `textarea`, `[role="button"]`, `[role="slider"]` 또는 편집 가능한 요소를 식별한다. 일반 텍스트를 클릭하면 조기 완료하지 않는다. 홈 안의 컨트롤은 해당 `data-reveal`만 즉시 표시하고, 홈 밖의 실제 컨트롤은 기존 활성 효과를 정리한 뒤 원래 동작을 실행하게 한다. 이벤트의 기본 동작을 막지 않는다.
4. 기존 `focusin` 즉시 표시를 보존한다. 입력·슬라이더처럼 click보다 먼저 포커스 또는 값 조작이 시작되는 컨트롤도 사용 가능해야 한다. 터치가 실제 조작 없이 페이지 스크롤로 끝난 경우에는 조기 완료하지 않는지 브라우저에서 검증한다.
5. 키보드 핸들러에서 본문을 대상으로 하는 스크롤 키(`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `PageUp`, `PageDown`, `Home`, `End`, ` `)는 시간표를 유지한다. 링크·버튼·입력·편집·ARIA 컨트롤에서 발생한 키 조작과 Tab 탐색은 기존 즉시 표시 정책을 유지한다. Shift+Space도 본문에서는 페이지 스크롤이다. modifier 단축키의 기존 처리와 기본 동작을 바꾸지 않는다.
6. `prefers-reduced-motion`, 실제 `dark` 클래스 변경, `pagehide`, cleanup은 그대로 둔다. 포커스나 접근성 정책으로 이미 표시한 내용을 다시 숨기지 않는다.

## Conventions to follow

- [HomeMotion의 자연 종료 정리](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:118)와 [포커스 대상 표시](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.tsx:230)를 재사용한다. 모션 엔진이나 전역 입력 관리자를 새로 만들지 않는다.
- [기존 홈 회귀 테스트](/Users/jaemin/programming/projects/active/bendd/src/components/home/ui/home-motion.spec.tsx:94)의 Vitest·Testing Library·observer/animation mock 구조를 재사용한다.
- 이벤트 등록과 cleanup의 핸들러·capture 옵션을 일치시킨다. React 상태, 매 프레임 측정, 휠/터치 의도 추적 타이머를 추가하지 않는다.
- pnpm만 사용하고 TS/TSX import는 `@/`를 쓴다. `as any`, `@ts-ignore`, 이벤트 타입 단언을 추가하지 않는다.
- 현재 홈 전체가 미커밋 상태다. HEAD만 새로 checkout하면 이 계획의 전제 코드가 없으므로 기존 작업을 보존한 상태에서 필요한 부분만 수정한다.

## Steps

1. 기존 스크롤 중단 테스트를 “반복 스크롤해도 초기 효과의 호출 수·인스턴스·duration·delay가 유지되고 cancel되지 않는다”로 바꾼다. 정적 본문 pointerdown 및 본문 스크롤 키에도 같은 회귀 기대를 추가하고 현재 구현에서 실패하는지 확인한다.
2. `HomeMotion`의 scroll 리스너, 140ms 마무리 경로, `settling` 상태를 제거한다. 초기 계획 생성과 IntersectionObserver는 유지한다.
3. 포인터 시작과 실제 컨트롤 활성화를 분리하고 본문 스크롤 키를 조기 완료 대상에서 제외한다. 링크/버튼 클릭, 컨트롤 키 조작, Tab·focus, 홈 밖 실제 컨트롤은 별도 테스트로 보호한다.
4. 초기 양수 스크롤 위치 테스트를 추가한다. `getBoundingClientRect` fixture가 문서 위치에서 mocked `scrollY`를 뺀 값을 반환하게 하여 현재 보이는 요소가 정상 초기 대상이 되는지 검증한다. 초기 대상이 화면 밖으로 나간 뒤에도 원래 `onfinish`로 끝나는지 확인한다.
5. 검증한 동작에 맞춰 `docs/design-docs/home-initial-motion-brief.md`의 Interrupt 요약, 입력 동작 표, 검증 기준을 갱신한다. 기존 140ms 측정 기록은 이전 구현의 기록으로 명확히 표시하고 새 정책의 증거로 인용하지 않는다. 과거 결과를 새로 측정한 값처럼 덮어쓰지 않는다.
6. 관련 단위 테스트 후 유효한 프로덕션 빌드로 브라우저 동작을 확인한다. 이전 구현의 26개 통과 기록을 이 수정의 검증으로 대신하지 않는다.

## Out of scope

- `home-reveal-plan.ts`의 순서·지연·blur 상한과 HomeStudio의 DOM 구성 변경.
- Dock의 디자인·애니메이션, 폰트, 콘텐츠 배치, 테마 전환 디자인, 새로운 모션 라이브러리.
- `history.scrollRestoration = 'manual'`, 강제 `scrollTo(0, 0)` 또는 스크롤 잠금.
- 사용자 스크롤과 자동 복원의 원인을 분류하는 제스처 추적·250ms 타이머.
- 클라이언트 홈 복귀·BFCache·`back_forward` 재생 생략 정책 변경. 기존 복귀 정책은 유지한다.
- 이미 CSS 복구로 읽히는 콘텐츠를 다시 숨기는 처리, reduced-motion 즉시 표시 정책 변경.
- 다른 파일의 기존 미커밋 작업 정리, 커밋·push·배포.

## Verification

**자동 검증**

- [x] `pnpm test:unit run src/components/home/ui/home-motion.spec.tsx` 통과.
- [x] 페이지 scroll을 여러 번 발생시켜도 초기 WAAPI 호출은 최초 2개 fixture 기준 2개 그대로이며, 자연 종료 전에 cancel 호출이 없다. duration 900ms와 기존 delay를 유지한다.
- [x] 초기 `scrollY > 0`에서도 현재 뷰포트의 요소가 정상 초기 시간표로 시작한다.
- [x] 초기 대상이 스크롤로 화면 밖으로 나가도 기존 인스턴스가 유지되고 원래 `onfinish`가 최종 상태로 정리한다.
- [x] 정적 본문·홈 바깥 여백의 pointerdown/click은 효과를 끝내지 않는다. 터치 시작을 나타내는 pointer 이벤트도 같은 기대를 가진다.
- [x] 본문의 방향키·PageDown·Home·End·Space·Shift+Space는 초기 효과를 끝내지 않는다.
- [x] 실제 링크/버튼 click과 포커스, 입력 컨트롤의 키 조작, Tab 탐색은 즉시 읽기·조작을 보장한다. 홈 밖 실제 컨트롤 활성화도 보존한다.
- [x] 새 화면 밖 요소는 기존 280ms·delay 0으로 한 번만 등장한다. 키보드 접근성 모드와 reduced motion은 기존 예외를 유지한다.
- [x] 지연 hydration, 실제 테마 변경, 내비게이션 복귀, pagehide, StrictMode 정리 회귀 유지.
- [x] 변경 후 `pnpm build`의 타입 검사와 lint·컴파일 통과. 같은 코드의 유효한 빌드가 있으면 재사용한다.

**브라우저 동작 및 feel-check**

- [ ] 최상단에서 재생 중 휠·트랙패드로 아래/위로 스크롤해도 기존 등장 순서와 속도를 유지한다. 갑자기 선명해지거나 새 효과가 재시작되지 않는다.
- [ ] Writing까지 내려간 상태에서 새로고침한다. 자동 복원에 따른 scroll만으로 재생을 급히 끝내지 않는다. 늦은 hydration으로 CSS가 이미 표시한 내용은 다시 숨기지 않는다.
- [ ] 정적 본문·빈 영역에서 터치 스크롤을 시작하고 네이티브 스크롤바도 드래그한다. pointerdown에 의한 조기 완료가 없어야 한다.
- [ ] 페이지를 PageDown·Space로 스크롤할 때는 시간표를 유지하고, Tab으로 링크를 선택하거나 실제 컨트롤을 조작하면 즉시 읽히고 동작한다.
- [ ] Projects 내부 스크롤, 내부 끝에서 페이지로 이어지는 스크롤, 실제 Projects 컨트롤 조작을 분리해 확인한다.
- [ ] 초기 대상이 화면 밖으로 나갔다 다시 보여도 원래 재생 시점 또는 완료 상태를 유지한다. 새로 진입한 요소에는 기존 280ms 효과가 적용된다.
- [ ] 정상 속도와 25% 속도를 기록해 프레임별로 검토한다. 스크롤 전후의 순서·선명화가 연속이고 지연이 갑자기 사라지지 않아야 한다.
- [ ] `prefers-reduced-motion: reduce`와 실제 테마 전환·페이지 이탈의 즉시 정리를 확인한다.
- [ ] 실제 터치 기기를 사용할 수 없으면 실기기 검증을 미확인으로 기록한다. 데스크톱 좁은 뷰포트를 실기기 검증으로 간주하지 않는다.

## Notes

이번 계획은 2026-09-30 사용자의 최신 선택을 반영한다. 이전의 “사용자 스크롤 때 140ms로 마무리” 요구는 더 이상 구현 목표가 아니다. 처음에 화면 밖이던 요소의 별도 진입 효과가 초기 시간표보다 먼저 끝나는 것은 기존 뷰포트 정책이며, 모든 문서 요소를 하나의 대기열에 넣지 않는다.

900ms 연출의 기존 LCP 비용을 다시 조정하거나 전체 모션 감사를 확장하지 않는다. 스크롤로 화면 밖에 나간 초기 효과가 자연 종료할 때까지 실행되는 비용은 실제 브라우저에서 관찰하되, 검증 없이 성능 개선을 주장하지 않는다.

계획 작성 시에는 `plans/`만 변경했다. 이후 사용자가 애니메이션 제작을 승인하여 아래 범위의 구현과 검증을 완료했다.

## 실행 기록 — 2026-09-30

- `HomeMotion`의 scroll 리스너와 140ms 조기 완료 경로를 제거했다. 정적 본문·여백의 pointerdown/click 및 본문 페이지 스크롤 키는 기존 시간표를 유지한다. 실제 컨트롤 click·focus, Tab, reduced motion, 실제 테마 변경과 페이지 이탈의 즉시 정리는 보존했다.
- 사용자가 추가로 승인한 손글씨 후행도 함께 구현했다. 같은 묶음의 마지막 본문 시작에서 60ms 뒤에 등장하고, 정상 완료 후 글씨만 360ms 동안 한 번 회전한다. 이 요구에 따라 계획 작성 당시 범위 밖이던 `home-reveal-plan.ts`, 해당 테스트, `home-studio.tsx`, CSS의 손글씨 회전 중심까지 범위를 확장했다. Dock의 코드와 디자인은 변경하지 않았다.
- 초기 시간표를 600ms로 압축하더라도 메모별 60ms 간격을 유지한다. 화면 밖 진입에서는 새 본문을 지연 없이 시작하고, 같은 진입 묶음의 손글씨에만 최대 60ms 후행을 적용한다. 아직 화면 밖인 본문을 기다리는 대기열은 만들지 않는다.
- 먼저 20개 회귀 실패를 확인한 뒤 수정했다. 최종 홈 단위 테스트 **47개(시간표 8·모션 33·기존 인터랙션 6)**와 `pnpm build`가 통과했다. 위 자동 검증 항목은 통과했으며, 초기 양수 스크롤·입력 구분·reduced motion·정리 경로는 단위 테스트로 확인했다.
- 실제 브라우저의 정상·25% 속도를 기록했다. 초기 재생 직후 페이지가 이동해도 원래 효과는 자연 종료했고 140ms 효과나 조기 취소가 없었다. opacity 역행이 없었고 화면 밖에서 새로 들어온 본문은 280ms·지연 0ms였다.
- 390×844와 1280×2700에서도 검증했다. 긴 화면의 세 메모는 각 마지막 본문보다 60ms 뒤였고, 글씨 회전은 한 번씩 실행 후 해제됐다. 일반 화면의 rAF 중앙값/p95는 16.7/17.5ms였다. 긴 화면에서는 초기 등장 중 25ms 초과 간격 2회를 관측했으며 회전 시작 전이었다. 자세한 단일 실행 측정과 한계는 명세에 기록했다.
- 위 브라우저 체크리스트 전체를 실기기로 실행한 것은 아니다. 실제 터치 기기·스크롤바 드래그·OS 설정 변경·자동 위치 복원 브라우저 시나리오·각 입력별 연속 조작은 미확인이다. 단위 테스트와 데스크톱 뷰포트 결과를 실기기 검증으로 간주하지 않는다.
- 기존 미커밋 작업을 보존했으며 커밋·push·배포는 수행하지 않았다.
