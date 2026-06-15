# 테마 전환 애니메이션 — 완료 (2026-06-15)

## 개요

테마 토글에 전환 애니메이션을 두되, 깜빡임·성능 저하·다른 애니메이션 영향이 없도록 한다. 여러 방식을 거쳐 최종적으로 "본문 색을 transition하지 않고, 테마를 즉시 적용한 순간을 GPU `opacity` 오버레이로 가리는" 방식으로 구현했다. PR [#118](https://github.com/jaem1n207/bendd/pull/118), main `b72cdca`.

## 문제 정의

기존 테마 전환은 `document.startViewTransition()` 기반 원형 리빌이었다.

- **본문 애니메이션 정지·점프**: View Transition은 전환 동안 살아있는 DOM을 정지 스냅샷으로 대체한다. 좌상단 서명 스트로크(`signature` 4s infinite)·framer-motion 등 본문에서 재생 중이던 애니메이션이 스냅샷 뒤에서 계속 진행되다, 전환이 끝나는 순간 그만큼 건너뛴 채 나타나 "멈췄다 점프"했다.
- 이후 색상 크로스페이드로 바꾸자 **전환 후 색 깜빡임**(서명 path·h2)과 **성능**(전체 페인트) 문제가 드러났다.

## 기술 결정

| 결정                        | 선택                                                                               | 대안                                         | 대안 거부 이유                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 전환 메커니즘               | GPU `opacity` 오버레이로 즉시 적용 순간을 가림                                     | View Transition 원형 리빌                    | 살아있는 DOM을 스냅샷으로 대체 → 본문 애니메이션 정지·점프                                                                                                        |
|                             |                                                                                    | DOM 복제본 원형 리빌(양 테마 동시 렌더)      | `dark:` 리터럴·커스텀 색·그림자가 프로덕션에서 어긋나 "이상하게 칠해짐"(`darkMode: html[class~="dark"]` 스코프 때문). 두 테마 동시 충실 렌더는 사실상 스냅샷 필요 |
|                             |                                                                                    | 색상 크로스페이드(`* { transition: color }`) | next-themes 클래스 적용·React 리렌더가 색 transition을 도중 재시작 → 최종값 도달 후 중간값으로 튀는 깜빡임 + `*` 전체 페인트로 성능 저하                          |
| 깜빡임 차단                 | 2단계(페이드인 → 불투명 구간에서 적용+transition 억제 → 페인트 확인 후 페이드아웃) | 고정 plateau 타이밍에 적용                   | next-themes 적용이 React로 ~50ms 지연돼 plateau를 벗어나면 flip이 보임. 페인트 확인 후 페이드아웃이 타이밍 무관하게 안전                                          |
| 적용 중 transition 누수     | 불투명 구간에 `* { transition:none }` 임시 억제                                    | 그대로 둠                                    | `transition-colors` 유틸(nav/border ~20개)이 flip 직후 색을 늦게 전환 → 일관성 깨짐. `transition:none`은 억제라 성능 비용 없음                                    |
| `disableTransitionOnChange` | 유지(true)                                                                         | 제거                                         | 본문 색을 transition하지 않으므로 next-themes 억제를 켜둬 flip을 확실히 즉시 처리                                                                                 |

## 아키텍처 영향

```
[Before] 클릭 → startViewTransition(flushSync(toggle)) → ::view-transition-* 클립 애니메이션
         = 살아있는 DOM이 스냅샷으로 대체됨(본문 애니메이션 정지)

[After]  클릭 → transitionTheme()
         1. 오버레이(fixed, 새 테마 배경색, opacity:0) 생성 → 페이드인(150ms)
         2. 불투명 구간: * transition 억제 → applyTheme(next-themes 토글) → waitForThemeApplied(클래스+페인트 확인)
         3. 억제 해제 → 페이드아웃(170ms) → 오버레이 제거
         = 본문 색 transition 없음. 본문 애니메이션은 오버레이 아래에서 계속 재생
```

전환 토큰(`activeTransitionToken`)으로 재진입 시 이전 비동기 체인을 중단해 유틸 자체를 독립적으로 재진입 안전하게 만들었다.

## 파일 변경 맵

| 파일                                       | 변경 내용                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `src/components/theme/theme-transition.ts` | 신규 — `transitionTheme`/`canTransitionTheme`(오버레이 페이드, 2단계 적용, 전환 토큰) |
| `src/components/theme/theme-switcher.tsx`  | View Transition 로직 제거 → `transitionTheme` 호출, 재진입 가드                       |
| `src/app/layout.tsx`                       | `theme-switch-effect.css` import 제거 (VT 미사용)                                     |
| `src/theme-switch-effect.css`              | 삭제 (VT 의사요소 스타일)                                                             |
| `docs/pitfalls.md`                         | P25 — "테마 전환은 본문 색을 transition하지 말고 오버레이로 가린다"                   |
| `AGENTS.md`                                | 함정 개수 24 → 25                                                                     |

> 참고: 중간 시도에서 건드린 `tailwind.config.ts`(darkMode `.dark &`)·`globals.css`(`.light`, `.theme-transition`)는 최종안에서 모두 원복되어 변경 없음.

## 코드 리뷰 처리 (CodeRabbit)

| 코멘트                                                          | 판단 | 처리                                                                                                |
| --------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- |
| `document.body` null 가드 불완전(`typeof null !== 'undefined'`) | 타당 | `document.body !== null`로 수정                                                                     |
| 이전 전환의 비동기 체인 미취소                                  | 타당 | `activeTransitionToken` 도입                                                                        |
| theme 도메인 import를 배럴 경유로                               | 거부 | 내부 전용 유틸(외부 미사용) + `index.ts`↔`theme-switcher` 순환의존. P5는 full `@/...` alias로 충족 |

## 미적용 개선 사항

- **Docstring Coverage 경고(25% < 80%, 비차단)**: `canTransitionTheme`·`transitionTheme` 위 한 줄 `/** */`로 해소 가능하나, 프로젝트가 docstring을 강제하지 않아(src 함수 ~110개 중 JSDoc 27개) 미적용.
- **페이드 타이밍**: `FADE_IN_MS=150` / `FADE_OUT_MS=170` — 느낌 조정 여지.

## 검증 현황

| 항목                            | 결과                                         |
| ------------------------------- | -------------------------------------------- |
| 색 깜빡임(중간값 튐), 토글 4회  | `reversals: 0`                               |
| flip 가시성                     | `opacityAtFlip: 1` (불투명 순간에만 색 변경) |
| 전환 중 색 CSS transition 수    | 0 (이전 `*` → 다수)                          |
| 본문 애니메이션(서명)           | `running` 유지                               |
| check-types / test:unit / build | 통과 / 통과 / exit 0 (29/29)                 |
