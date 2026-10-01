# 008 — 코드가 이동하는 과정을 읽을 수 있도록 전환 속도 조정

- **Commit:** `5332fa0` (`main`) + 2026-10-01 현재 미커밋 Home 구현
- **Status:** DONE · 로컬 구현·브라우저 검증 완료 · 실기기·연속 영상 미확인
- **Severity:** MEDIUM
- **Category:** 2. Easing & duration
- **Estimated scope:** 소스 2개 + 직접 회귀 테스트 1개, 약 40–60줄
- **대상:** 홈 `/#home-craft`의 `단계별 코드 설명` 데모
- **저장소:** `/Users/jaemin/programming/projects/active/bendd`

## Problem

사용자가 코드 이동이 너무 빨라 핵심 모션을 보기 어렵다고 피드백했다. 현재 코드 토큰은 `280ms`와 `cubic-bezier(0.19, 1, 0.22, 1)`을 사용한다. 이 곡선은 이동 거리의 90%를 약 **86.1ms**에 통과한다. 명목상 280ms여도 대부분의 위치 변화는 초반에 끝난다.

이 데모의 목적은 코드가 단계 사이에서 어떻게 이어지는지 보여주는 것이다. 즉각적인 버튼 피드백과, 사용자가 눈으로 따라갈 코드 이동에 같은 속도를 적용하지 않는다. `AUDIT.md`의 화면 안에서 이동·변형하는 요소에는 `ease-in-out`을 사용한다는 기준, 설명용·드문 노출에는 긴 모션을 허용한다는 기준을 적용한다. 선택 표시는 즉시, 설명은 기존 160ms, 코드 이동은 650ms로 역할을 나눈다.

수치는 CSS cubic-bezier의 시간과 진행률을 계산한 값이다. 브라우저 프레임 측정값이 아니며, React 반영·FLIP 측정에 필요한 프레임 시간은 포함하지 않는다.

## Where

아래 파일 경로는 모두 저장소 루트 `/Users/jaemin/programming/projects/active/bendd` 기준이다.

| File                                                | Lines        | 현재 동작                                                           |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| `src/components/home/ui/code-steps-demo.tsx`        | 40–57        | 코드 이동 중 새 입력은 정적 렌더로 마무리하는 마지막 입력 우선 정책 |
| `src/components/home/ui/code-steps-demo.tsx`        | 63–82        | 설명 160ms 이후 코드 반영, 키보드·reduced motion 즉시 반영          |
| `src/components/home/ui/code-steps-demo.tsx`        | 103–124      | 280ms 토큰 이동, 강한 ease-out, 이동·등장 지연과 완료 콜백          |
| `src/components/home/ui/code-steps-demo.module.css` | 36–38        | 토큰의 transition 대상을 transform·opacity로 제한                   |
| `src/components/home/ui/code-steps-demo.module.css` | 138–162      | 설명 160ms, 버튼 누름 150ms, reduce에서 토큰 transition 제거        |
| `src/components/home/ui/code-steps-demo.spec.tsx`   | 7–19, 62–135 | 렌더러 mock 및 대기·키보드·reduce·마지막 선택 테스트                |

### Current code

```tsx
// /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/code-steps-demo.tsx:108
options={{
  duration: 280,
  easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
  stagger: 0,
  delayMove: 0,
  delayEnter: 0.15,
  animateContainer: false,
  containerStyle: false,
}}
```

```css
/* /Users/jaemin/programming/projects/active/bendd/src/components/home/ui/code-steps-demo.module.css:36 */
.code :global(.shiki-magic-move-item) {
  transition-property: transform, opacity;
}
```

설치된 `shiki-magic-move@0.4.3`의 `dist/style.css`는 등장·퇴장에도 `--smm-duration`을 사용한다. 지속시간만 늘리면 오래 겹치는 글자가 생길 수 있으므로 opacity 시간은 별도로 지정한다. 또한 `dist/renderer.mjs:17–27`의 실제 기본 `delayLeave`는 `0.1`이다. 설치된 타입 주석의 `@default 0`과 다르므로 목표 설정에서는 명시적으로 `0`을 지정한다. `delayEnter` 등은 밀리초가 아니라 duration에 곱하는 비율이다.

## Target

```tsx
// code-steps-demo.tsx — options만 조정한다.
options={{
  duration: 650,
  easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  stagger: 0,
  delayMove: 0,
  delayLeave: 0,
  delayEnter: 0.65,
  animateContainer: false,
  containerStyle: false,
}}
```

```css
/* code-steps-demo.module.css — 기존 토큰 규칙을 확장한다. */
.code :global(.shiki-magic-move-item) {
  transition-property: transform, opacity;
  transition-duration: var(--smm-duration, 650ms), 180ms;
  transition-timing-function: var(
      --smm-easing,
      cubic-bezier(0.645, 0.045, 0.355, 1)
    ), var(--home-ease);
}
```

`transform`에는 650ms와 renderer의 이동 곡선, `opacity`에는 180ms와 기존 `--home-ease`가 각각 대응한다. 라이브러리가 역변환을 준비할 때 쓰는 inline `transition-duration: 0ms`는 그대로 우선해야 한다. `!important`를 추가하지 않는다. 기존 reduce 규칙은 파일 뒤에 그대로 두어 두 속성 모두 즉시 반영되게 한다.

### 클릭 기준 시간표

| 요소                    | 시작    | 종료    | 의도                                     |
| ----------------------- | ------- | ------- | ---------------------------------------- |
| 선택 번호·카운터        | 0ms     | 즉시    | 입력이 접수됐음을 바로 표시              |
| 설명 교체               | 0ms     | 160ms   | 기존 설명 → 코드 순서 보존               |
| 공통 코드 토큰의 이동   | 160ms   | 810ms   | 가속·이동·감속을 눈으로 따라갈 시간 확보 |
| 사라지는 토큰의 opacity | 160ms   | 340ms   | 이동할 자리를 빠르게 비움                |
| 새 토큰의 opacity       | 582.5ms | 762.5ms | 공통 토큰이 이동한 자리에 뒤이어 등장    |

**Why these values**

- **650ms:** 이 작은 설명 데모에 제안하는 시작값이다. `AUDIT.md`에 코드 모핑의 정해진 지속시간은 없으며, 650ms를 일반 UI 규칙이라고 주장하지 않는다. 기존 본문 MagicMove가 의도적으로 유지한 750ms보다 짧게 잡되, 현재 280ms보다 이동 경로가 충분히 읽히도록 한다.
- **`cubic-bezier(0.645, 0.045, 0.355, 1)`:** `AUDIT.md`의 화면 안 왕복 이동용 `--ease-in-out-cubic` 값을 그대로 사용한다. 이미 번호와 설명이 반응하므로 코드 이동의 완만한 시작이 입력 무응답으로 보이지 않게 한다.
- **180ms opacity:** 짧은 텍스트 교체에 해당하는 125–200ms 구간 안에서 선택한다. 코드 이동의 긴 시간과 글자 겹침의 시간을 분리한다.
- **`delayMove: 0`, `delayLeave: 0`:** 설명이 끝난 뒤 추가로 기다리지 않는다. 사라질 글자도 먼저 정리한다.
- **`delayEnter: 0.65`:** 코드 이동 시작 후 422.5ms, 이동 거리 약 83.4%에서 새 글자가 나타나기 시작한다. 접두어 `async`·`await`가 이동 중인 기존 글자를 일찍 덮지 않게 한다. 새 글자의 등장도 전체 이동이 끝나기 전에 마친다.
- **`stagger: 0`:** 글자마다 늘어지는 연쇄 지연을 만들지 않는다. 하나의 코드 조각으로 이동시킨다.
- **설명 160ms·누름 150ms 유지:** 이번 피드백은 코드 이동에 관한 것이다. 기존 짧은 조작 반응까지 느려지지 않게 한다.

| 계산상 위치 변화      | 현재 280ms + ease-out-expo | 목표 650ms + ease-in-out-cubic |
| --------------------- | -------------------------- | ------------------------------ |
| 이동 거리 50% 도달    | 29.4ms                     | 321.0ms                        |
| 이동 거리 90% 도달    | 86.1ms                     | 461.4ms                        |
| 이동 거리 10→90% 구간 | 80.7ms                     | 288.4ms                        |

이 표는 각 코드 이동의 시작을 0ms로 놓은 계산이다. 전체 클릭 시간에는 앞의 설명 160ms가 추가된다. 실제 체감은 구현 후 정상 속도에서 확인해야 한다.

## Conventions to follow

- `src/components/home/ui/home-studio.module.css:1–3`의 `--home-ease`는 홈 전체의 빠른 설명·피드백용 곡선이다. 전역 값을 바꾸지 않고 opacity에 그대로 사용한다. 코드 이동의 곡선은 기존처럼 renderer options가 소유한다.
- `src/mdx/components/magic-move/magic-move.tsx:45–67, 88–103`은 긴 코드 모핑과 정적 접근성 경로를 구분하는 저장소 내 사례다. duration 750ms는 `docs/design-docs/step-transition-performance.md:23`에 보존 의도가 기록되어 있다. 이 본문 구현은 수정 대상이 아니다.
- `src/components/home/ui/code-steps.tsx`의 서버 토큰 준비, 현재 순수 흑백 스타일, `home-studio.module.css:471–477`의 268px 카드 높이를 보존한다.
- pnpm만 사용한다. `src/`의 import는 `@/`, 기존 HSL 변수와 도메인 경계를 유지한다. 의존성·새 motion 라이브러리는 추가하지 않는다.
- 이 Home 구현은 현재 미커밋 상태다. `5332fa0`만 새로 checkout하면 대상 파일이 재현되지 않는다. 구현 전 해당 파일과 현재 diff를 다시 확인하고 기존 작업을 보존한다.

## Steps

1. 현재 대상 소스와 발췌를 대조한다. 코드가 이미 바뀌었다면 무조건 덮어쓰지 말고 목표 동작과 비교한다.
2. `code-steps-demo.tsx`의 renderer options를 Target과 같이 바꾼다. 설명 대기 160ms, `event.detail > 0` 분기, 선택 state의 즉시 갱신, 마지막 입력 우선 처리, 완료 revision 검사를 보존한다.
3. `code-steps-demo.module.css`의 기존 `.shiki-magic-move-item` 규칙에 속성별 duration·timing-function을 추가한다. layout 속성이나 `transition: all`을 도입하지 않는다.
4. 기존 테스트는 타이밍 옵션 숫자를 그대로 복사해 검증하는 테스트로 바꾸지 않는다. 160ms 설명 대기와 키보드·reduce의 의미 있는 동작 검증을 유지한다.
5. 길어진 이동 중 입력을 검증할 필요가 있다. 기존 renderer mock이 `onStart`를 호출하지 않아 해당 분기를 다루지 않으므로, 제어 가능한 시작·종료 콜백을 mock에 추가한다. 첫 pointer 전환을 시작한 후 200ms 시점에 다음 단계를 선택하고, 설명 대기 160ms 뒤 최신 코드가 `animate=false`로 남는지 확인한다. 뒤늦은 이전 `onEnd`가 최신 상태를 되돌리지 않는 것도 확인한다. 테스트는 easing의 시각 품질을 증명하지 못한다.
6. 아래 범위로 검증하고 실제 정상 속도에서 이동을 관찰한다. 녹화나 실제 터치 기기를 확인하지 못했다면 완료 기록에 미확인으로 남긴다.

## Out of scope

- 텍스트 셔플, Craft 문구·레이아웃, 홈 등장 시퀀스, Dock, 프로필, Tech Stack.
- 본문 `StepInfo`·`MagicMove`와 기존 pnpm 패치, package/lockfile.
- 코드 예시 자체 변경, 애니메이션 라이브러리 추가, 자동 재생·속도 슬라이더·스프링 추가.
- 매 프레임 React state 갱신, 카드 높이·너비 애니메이션.
- 연속 클릭을 끝까지 기다리게 만드는 입력 잠금이나 애니메이션 재생 큐.
- 구현 전 목표 모션이 검증됐다고 표시하거나 기존 빌드 결과를 새 동작의 검증으로 인용하는 일.

## Verification

### Source and build

- [ ] `pnpm exec vitest run src/components/home/ui/code-steps-demo.spec.tsx`로 해당 동작 회귀만 실행한다.
- [ ] 변경된 UI를 프로덕션 모드로 확인할 때 `pnpm build`를 실행한다. 이 명령에 포함된 타입·lint 결과를 재사용하고 전체 suite를 추가로 반복하지 않는다.
- [ ] 현재 머신에서 기본 pnpm 진입점의 버전이 설치된 환경과 다르면, 이미 있는 `node /Users/jaemin/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs` 진입점을 같은 인수로 사용할 수 있는지 확인한다. 새 패키지 매니저를 설치하지 않는다.
- [ ] 대상 파일의 diff를 확인하고 소스 2개와 직접 테스트 외의 변경이 섞이지 않았는지 확인한다.

### Behavior

- [ ] 포인터로 1→2, 2→3, 3→2, 2→1을 충분한 간격으로 전환한다. 코드의 같은 토큰이 이어서 이동하며 설명과 선택 번호가 먼저 반응한다.
- [ ] 이동 중인 토큰의 실제 computed style에 `transform` 650ms, `opacity` 180ms와 서로 다른 곡선이 적용되는지 확인한다. 클래스 적용과 inline 0ms 준비 단계가 끝난 시점을 본다.
- [ ] 1→2의 `function`·`saveNote()` 이동을 따라갈 수 있고, 새 `async`가 기존 글자에 길게 겹치지 않는다. 2→3에서는 `await save()`가 아래로 이동하는 것을 볼 수 있다.
- [ ] 설명 대기 중과 실제 코드 이동 중 각각 빠르게 1→2→3→1을 입력한다. 최신 선택의 코드가 남고 과거 단계가 뒤늦게 재생되지 않는다. 진행 중 입력에 대한 기존 정적 완료 정책을 그대로 따른다.
- [ ] 키보드 Enter/Space는 설명·코드를 즉시 바꾼다. 키보드 입력이 진행 중 pointer 전환도 즉시 끝낸다.
- [ ] `prefers-reduced-motion: reduce` 및 이동 중 reduce 변경에서 마지막 선택의 완성된 코드가 즉시 읽힌다.
- [ ] 320px와 기본 데스크톱 너비, 라이트·다크에서 글자 잘림과 카드 높이 변화가 없다. 44px 버튼 영역과 focus 표시를 유지한다.

### Feel

- [ ] 정상 1배속으로 먼저 평가한다. 코드가 화면 안에서 옮겨가는 과정이 읽히고, 번호 선택은 지연 없이 반응해야 한다.
- [ ] 가능하면 60fps로 1→2→3→2→1을 녹화하고 프레임별로 확인한다. 코드 이동 시작 후 10→90% 구간이 계산상 약 288ms인 것을 참고하되, 이 숫자만으로 품질을 판정하지 않는다.
- [ ] 새 글자의 등장과 공통 토큰의 이동이 겹치는 구간에서 두 글자가 겹쳐 읽히는지 확인한다. opacity 시간까지 650ms로 늘리지 않는다.
- [ ] 실제 터치 기기에서 단계 버튼을 확인한다. 사용할 수 없다면 데스크톱 뷰포트 검증과 구분해 미확인으로 기록한다.
- [ ] 잠깐 다른 내용을 본 뒤 다시 재생하여 코드의 이동을 한 번에 따라갈 수 있는지 확인한다. 목표 시간 650ms는 구현 후 시각 확인을 거칠 제안값이다.

## Audit record

범위는 사용자가 지적한 코드 설명 뷰어의 토큰·설명·버튼 모션이다. 전체 저장소를 다시 감사하지 않았다.

- **Stack:** Next.js 14.2.3, React 18, CSS Modules, 패치된 Shiki Magic Move 0.4.3. 이 뷰어의 모션에는 Motion/GSAP를 쓰지 않는다.
- **Where motion lives:** `CodeStepsDemo`의 renderer options, 동명 CSS Module의 토큰·설명·버튼 전환, 홈 CSS의 `--home-ease`.
- **Conventions:** renderer options의 밀리초·지연 비율과 기존 CSS 변수를 사용한다. container 크기 애니메이션은 비활성화한다.
- **Personality:** 절제된 흑백 구성에서 인터랙션의 원리를 보여주는 데모. 짧은 입력 반응과 관찰 가능한 코드 이동을 구분한다.
- **Frequency:** 방문자가 선택적으로 눌러보는 낮은 빈도 데모. 키보드 조작은 기존 즉시 경로를 유지한다.

| #   | Severity | Category          | Location                                             | Finding                                             | Fix summary                                                |
| --- | -------- | ----------------- | ---------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| 1   | MEDIUM   | Easing & duration | `src/components/home/ui/code-steps-demo.tsx:109–113` | 280ms와 ease-out-expo가 이동의 90%를 약 86ms에 압축 | 이동 650ms ease-in-out, opacity 180ms, 입력·설명 반응 유지 |

| 범주                              | 범위 내 판단                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1. Purpose & frequency            | 낮은 빈도의 설명용 데모. 코드 이동을 충분히 보여줄 이유가 있다. 자동 재생 없음.                                       |
| 2. Easing & duration              | **MEDIUM 1건:** 280ms와 강한 ease-out이 핵심 이동을 초반에 압축한다. 이 계획에서 수정.                                |
| 3. Physicality & origin           | 코드 위치의 연결을 유지한다. 버튼 0.97 press·150ms, 44px 영역은 유지 대상.                                            |
| 4. Interruptibility & springs     | 기존 마지막 입력 우선·정적 완료 정책을 보존한다. 길어진 active 구간을 회귀 확인한다.                                  |
| 5. Performance                    | 토큰 transform·opacity만 전환하고 container 크기 애니메이션은 꺼져 있다. 이번 감사에서 프레임 성능을 측정하지 않았다. |
| 6. Accessibility                  | 소스상 키보드·reduce 즉시 경로, 실행 중 설정 변경 처리 존재. 목표 구현에서 회귀 확인.                                 |
| 7. Cohesion & spatial consistency | 설명과 입력 반응은 짧게, 핵심 코드 이동은 길게. 설명 → 코드 순서와 고정 높이 유지.                                    |
| 8. Missed opportunities           | 추가 기능 제안 없음. 현재 이동의 가독성 개선에 한정.                                                                  |

## Notes

최초 감사에서는 현재 소스와 설치된 렌더러를 읽고 easing 진행률을 계산했다. 앱 소스 변경, 테스트·빌드·포매터 실행, 새로운 모션의 브라우저 재생은 하지 않았다. 사용자의 후속 적용 요청으로 진행한 결과는 아래 실행 기록을 따른다.

## 실행 기록 — 2026-10-01

사용자의 "적용하세요" 요청에 따라 현재 작업 트리에서 구현했다. 코드 이동 650ms와 지정한 ease-in-out, opacity 180ms, 설명 160ms 선행을 적용했다. 변경된 소스는 `code-steps-demo.tsx`, `code-steps-demo.module.css`, 직접 테스트 `code-steps-demo.spec.tsx`다.

### 실제 재생에서 발견한 보완

타이밍 값만 바꾼 첫 빌드에서는 새 글자가 공통 토큰의 이동 도중 먼저 나타나 겹쳤다. 렌더러 동작과 실제 computed style을 대조한 뒤 뷰어 내부에서 다음 두 가지를 보정했다.

1. 라이브러리는 첫 `render`에서 등장 전환을 생략한다. `previous`를 전달해도 `replace`는 첫 렌더 상태를 바꾸지 않았다. 내부 `CodeStepRenderer`가 이전 코드로 움직임 없는 준비 프레임을 먼저 완료하고, 같은 renderer에서 목표 코드를 전환하도록 했다. 첫 클릭과 정적 렌더 후의 다음 클릭에서도 등장 지연이 적용된다.
2. 라이브러리의 기본 `--smm-stagger: 0`은 시간값에 더하는 `calc`에서 유효하지 않아 실제 등장 지연이 `0s`로 계산됐다. 이 뷰어의 토큰에만 `--smm-stagger: 0ms`를 지정했다. 재확인한 실제 등장 지연은 `0.4225s`였다. 라이브러리 패치나 다른 MagicMove 화면은 변경하지 않았다.

### 확인한 결과

- 해당 Vitest 파일 **8개 테스트 통과**. 기존 설명 대기·범위 끝·빠른 선택·키보드·reduce에 더해, 실제 이동 중 재입력, 오래된 종료 콜백, 이동 중 키보드·reduce 전환을 확인했다. renderer mock은 움직임 없는 첫 준비 프레임과 제어 가능한 lifecycle을 제공한다.
- 최종 **프로덕션 빌드 통과**. 빌드에 포함된 타입 검사·lint를 재사용했다. 변경한 파일의 새로운 경고는 없으며, 기존 다른 파일의 Tailwind·hook 경고는 범위 밖으로 유지했다.
- 실제 브라우저의 토큰 computed style에서 `transform, opacity`, `0.65s, 0.18s`, 지정한 두 곡선, 등장 `0.4225s`를 확인했다.
- 첫 1→2 전환 중 `async`·`await`는 opacity 0으로 기다리고, `function`·`save`가 수평 이동했다. 2→3 중 `await save`의 수직 transform이 약 -21.8 → -16.8 → -4.0px로 변하는 프레임을 관찰한 뒤 새 `setStatus`가 나타나는 것을 확인했다. 이 값은 서로 다른 시점의 DOM 관측이며 고정 간격의 성능 측정은 아니다.
- 3→2와 2→1의 역방향 이동, 실제 이동 도중 키보드 즉시 전환, 빠른 1→2→3 선택 후 마지막 단계가 남는 동작을 확인했다.
- 320px 다크 모드에서 문서·코드 가로 넘침 없음, 카드 높이 268px, 모든 버튼 44×44px를 확인했다. 기본 뷰포트와 라이트 모드로 복원했다.
- 소스 포맷과 `git diff --check`를 확인했다. 기존 다른 작업, 의존성, 본문 코드 뷰어, Dock·홈 진입 모션은 수정하지 않았다.

### 증거와 한계

- 테스트 로그: `/private/tmp/bendd-code-motion-008-tests.log`
- 최종 빌드 로그: `/private/tmp/bendd-code-motion-008-build.log`
- 수정 후 중간 프레임: `/private/tmp/bendd-code-motion-008-verified-frame-0.jpg`부터 `-2.jpg`
- 미리보기: `http://127.0.0.1:3107/#home-craft`
- 실제 휴대전화, 60fps 연속 녹화 및 프레임 성능 측정은 수행하지 않았다. reduced motion의 설정 변경은 단위 테스트로 검증했으며 브라우저/OS의 접근성 설정은 변경하지 않았다.
- 커밋·푸시·배포는 수행하지 않았다.

## 후속 조정 — 설명 텍스트의 가속·감속

사용자가 코드 이동 속도는 적절하지만 아래 설명의 슬라이드가 빠르다고 피드백해, 설명 이동을 160ms ease-out에서 **320ms `cubic-bezier(0.645, 0.045, 0.355, 1)`**로 조정했다. 설명의 opacity는 200ms `ease`를 사용한다. 코드 이동 자체는 650ms를 유지한다.

설명 전환 시간과 코드 시작 대기는 `EXPLANATION_DURATION_MS`를 함께 사용해 설명이 자리 잡은 뒤 코드가 움직이도록 연결했다. 키보드·reduced motion의 즉시 전환 경로는 유지했다.

- 회귀 테스트에서 319ms까지 기존 코드를 유지하고 320ms에 다음 코드를 반영하는지 확인했다. 빠른 선택·키보드·reduce를 포함한 8개 테스트와 프로덕션 빌드가 통과했다.
- 실제 브라우저의 후진 설명 이동은 약 -8 → -5.54 → -2.30 → -1.01 → -0.20 → 0px로 정착했으며, 설명이 정착할 때 코드 대기 상태가 해제됐다. 이 값은 비동기 DOM 관측이며 프레임 성능 측정값은 아니다.
- 전진·후진, 연속 선택의 마지막 단계 유지, 키보드의 0s 전환을 확인했다. 로그는 `/private/tmp/bendd-caption-motion-tests.log`, `/private/tmp/bendd-caption-motion-build.log`에 보존했다.
