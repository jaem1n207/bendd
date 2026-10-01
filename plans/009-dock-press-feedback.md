# 009 — 클릭 반동을 짧은 눌림 피드백으로 교체

- **Audit base:** 3e7315b
- **Severity:** HIGH
- **Category:** Purpose & frequency; Easing & duration; Interruptibility & springs
- **Estimated scope:** 탐색 도메인 3개 파일과 직접 회귀 테스트
- **실행 승인:** 2026-10-02 사용자가 실제 Dock과 Craft Dock의 애니메이션 수정을 요청했다. 이 문서는 improve-animations의 자문 산출물이며 구현은 executor가 맡는다.

## Problem

현재 클릭은 20px 상승 spring이 완전히 정지한 뒤 하강 spring을 시작한다. 사용자가 꼭대기에서 오래 떠 있는 느낌을 보고했다. 누르는 동안 8px 아래로 이동하는 동작까지 합쳐져 일상 탐색의 피드백이 지나치게 크다. 사용자가 기존 반동의 수정을 명시했으므로 과거의 반동 유지 결정은 이번 수정의 제외 사유가 아니다.

## Where

작업 경로: /Users/jaemin/.codex/worktrees/home-studio-pr/bendd

| File                                                             | Lines    | What's there                       |
| ---------------------------------------------------------------- | -------- | ---------------------------------- |
| src/components/navigation/model/use-navigation-item-animation.ts | 9, 36–48 | 20px 상승 완료를 기다린 뒤 복귀    |
| src/components/navigation/ui/navigation-item-tooltip.tsx         | 31–42    | 누름 y:8, stiffness:420/damping:24 |
| src/components/navigation/test/navigation-motion.spec.tsx        | 59–105   | 기존 두 단계 반동을 고정한 테스트  |

### Current code

```tsx
const BOUNCE_HEIGHT = 20;
await controls.start({ y: -BOUNCE_HEIGHT });
if (generation === runGeneration.current) {
  void controls.start({ y: 0 });
}
// wrapper
whileTap={allowMotion && input === DockInput.Pointer ? { y: 8 } : undefined}
transition={allowMotion ? { type: 'spring', stiffness: 420, damping: 24 } : { duration: 0 }}
```

## Target

- 위치 이동은 0px. 클릭 후 상승/하강과 지연된 비동기 재생을 없앤다.
- 포인터를 누르는 동안 inner body만 scale(0.97), 놓거나 취소하면 scale(1).
- transform 전환은 누름 150ms / 놓음 100ms, cubic-bezier(0.25, 0.46, 0.45, 0.94). motion/react의 full transform 문자열을 사용하거나 같은 CSS transition을 사용한다.
- 애니메이션 도중 다시 눌러도 현재 값에서 반전하고 원점으로 강제 점프하지 않는다. 반복 키프레임을 만들지 않는다.
- 바깥 hitbox와 tooltip anchor는 움직이지 않는다.
- reduced motion, 아직 확인되지 않은 motion preference, 키보드 활성화에서는 transform 변화가 없다.
- 클릭 소리는 현재 설정을 따르며 Toggle sound 자체의 별도 소리를 중복 재생하지 않는다.
- Resize Dock handle에는 이 눌림 transform도 적용하지 않는다. 크기 드래그의 좌표계는 고정되어야 한다.

**Why these values:** improve-animations/AUDIT.md의 button press 150ms, scale(0.97), ease-out-quad 값을 사용한다. review-animations/STANDARDS.md의 비대칭 timing에 따라 복귀는 100ms로 단축한다. 자주 쓰는 탐색 버튼에 공중 체류를 만들지 않는다.

## Conventions to follow

- 기존 src/components/navigation/ui/dock-tooltip.tsx의 입력 종류/reduced-motion 분기를 참고한다.
- 기존 src/components/navigation/lib/dock-motion.ts의 바깥 변환과 inner press 변환을 분리한다.
- @/ imports, HSL variables, pnpm, if braces, 30자 미만 함수 이름, 타입 단언 없이 narrowing.
- 프로젝트 AGENTS.md의 regression-test-first를 따른다.

## Steps

1. 현재 클릭이 y 이동을 시작한다는 실패 증거를 회귀 테스트로 남긴다. 테스트는 부동 시간이 없는 눌림/복귀와 reduced/keyboard/sound 경계를 검증해야 한다.
2. 두 단계 비동기 상승/하강 제어를 제거하고 inner press transition을 연결한다.
3. 이제 의미 없는 bounce-generation/Promise 취소 코드를 제거한다. 여전히 필요한 unmount/입력 취소는 유지한다.
4. 실제 Dock과 Craft Dock이 같은 item을 사용함을 확인한다.
5. 변경된 의미에 맞춰 기존 테스트를 갱신한다. sound, keyboard, reduced, 빠른 재입력 검증은 빠뜨리지 않는다.

## Out of scope

- 해결된 페이지 이동 위치 고정, tooltip container 유지와 8px/160ms 방향 전환
- 다른 홈 모션, 색상, 폰트 종류, 경로, 외부 링크
- 새 애니메이션 라이브러리 설치

## Verification

**Build**

- 관련 unit tests RED → GREEN; 타입 검사와 lint.
  **Behavior**
- 클릭 전/후 모든 icon outer rect의 y는 동일.
- 마우스를 길게 눌러도 위로 뜨지 않고 놓으면 150ms 내 기본 상태를 향해 복귀.
- 빠른 연속 클릭에도 transform은 0.97–1이며 번쩍임/지연 재생이 없다.
- 키보드/reduced motion에서는 transform이 없다. 소리 설정과 Toggle sound 예외 유지.
  **Feel**
- 브라우저에서 실제 클릭/길게 누르기/빠른 연속 클릭을 확인하고 가능하면 녹화 프레임을 검토한다.
- 실기기 또는 프레임 녹화가 불가능하면 그 범위를 정확히 미확인으로 기록한다. 테스트 통과를 촉감 검증으로 부풀리지 않는다.
