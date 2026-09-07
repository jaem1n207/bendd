# 단계별 코드 예시 전환 성능

## 문제와 원인

`/article/immediate-motion-component`의 4단계 **애니메이션 관련 속성 제거**에서 5단계 **새로운 React 엘리먼트 구성**으로 이동하면 설명이 오른쪽에서 들어오다가 멈춘다. 역방향도 동일하다.

- `StepInfo`의 JS spring/높이 갱신과 코드 토큰 준비가 같은 메인 스레드를 사용한다. `useDeferredValue`는 라이브러리의 동기 DOM 작업을 중단하지 못한다.
- `shiki-magic-move@1.0.0`의 이동 토큰 루프가 `getBoundingClientRect()` 읽기와 transform 쓰기를 번갈아 수행한다.
- 전환 완료를 기다릴 때 토큰마다 `getAnimations()`를 호출한다. 애니메이션 조회와 스타일 계산을 반복한다.
- 위치가 같은 토큰에도 `translate(0px, 0px)` 전환을 만든다.

렌더러 직접 테스트는 수정 전 세 문제 모두 실패했고, 패치 후 통과했다.

## 대안과 선택

| 방안                                               | 판단                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| transform/opacity만 CSS로 이동                     | 설명의 프레임별 JS 의존성을 없애지만 코드 준비 비용 자체는 남는다. 적용한다.      |
| `useDeferredValue` 유지 또는 지연 시간만 조절      | 동기 DOM 작업을 분할하지 못하고 슬라이드 완료도 보장하지 못한다. 사용하지 않는다. |
| 코드 애니메이션 제거 또는 토큰 표현 축소           | 기존 코드 예시의 설명 기능을 줄이므로 선택하지 않는다.                            |
| 실제 슬라이드 완료 후 코드 갱신 + 렌더러 배치 처리 | 설명과 코드 준비의 경합을 피하면서 준비 비용도 줄인다. 함께 적용한다.             |

설명들을 CSS grid의 같은 셀에 배치해 화면 너비별 최대 높이를 확보한다. 이전 설명은 숨기고 선택한 설명에만 400ms transform/opacity 진입 애니메이션을 적용한다. 다음은 `110% → 0`, 이전은 `-110% → 0`이다. 따라서 긴 설명 기준의 빈 공간이 생길 수 있다.

`animationend`가 현재 설명 요소에서 발생했을 때만 코드의 표시 단계를 갱신한다. 자손 이벤트와 이전 단계의 이벤트는 무시한다. 동작 감소 설정에서는 CSS 애니메이션을 없애고 즉시 갱신하며, 슬라이드 도중 설정을 켜는 경우도 처리한다.

렌더러는 이동 후 좌표를 한 번에 읽고 transform을 쓴다. 모든 전환을 시작한 뒤 컨테이너에서 `getAnimations({ subtree: true })`를 한 번 호출해 대상 요소별로 분류한다. 각 요소는 자신의 애니메이션 완료를 기다리며, 제자리 토큰은 이동 전환을 만들지 않는다. 기존 코드 전환의 duration 750ms와 stagger 3ms는 유지한다.

pnpm 패치로 배포하므로 라이브러리 버전은 1.0.0으로 유지한다. 버전을 올릴 때는 패치를 재검토하고 렌더러 테스트 및 실제 브라우저 측정을 다시 실행한다.

## 재현 및 측정

기준 커밋은 `823c45f946e4745a80b1b58f19149692732645e4`이다. 2026-09-07에 Next.js 15.5.21 / React 19.2.7 / Chromium 152.0.7977.83, viewport 1280×900, CDP CPU 4× slowdown으로 로컬 프로덕션 빌드를 비교했다.

1. 각 체크아웃에서 Node 24와 pnpm 10.34.5로 `pnpm install --frozen-lockfile`을 실행한다.
2. 생성물인 `.next` 캐시를 비우고 `pnpm build`, `pnpm start -p 3101`을 실행한다. 패치 전 빌드 캐시를 재사용하면 기존 라이브러리가 번들에 남을 수 있다.
3. `/article/immediate-motion-component`를 열고 첫 번째 단계 선택기에서 **애니메이션 관련 속성 제거**를 선택한다.
4. Chrome DevTools Performance에서 CPU 4×를 적용하고 다음/이전을 교대로 누른다. 설명이 시야 안에 있도록 스크롤한다.
5. 자동 측정은 초기 선택 후 2,200ms 대기하고 `4→5→4→5→4`를 실행한다. 각 클릭 후 2초간 rAF·DOM mutation·CDP Performance 지표를 수집하고 400ms 쉬었다가 다음 전환을 시작한다.

[PR 첨부 ZIP](https://github.com/user-attachments/files/31911516/bendd-step-transition-evidence.zip)에 실행 스크립트, 정확히 사용한 전후 측정 함수, 각 회차의 원시 JSON을 제공한다. 번들에서 패치 적용을 확인한 최종 빌드의 수치만 포함한다.

| 지표                                   |                       수정 전 |              수정 후 |
| -------------------------------------- | ----------------------------: | -------------------: |
| 전환별 최대 rAF 콜백 간격 범위         |             1,736.9–1,943.1ms |          67.2–74.7ms |
| CDP ScriptDuration 평균                |                     1,459.3ms | 103.9ms (92.9% 감소) |
| CDP LayoutCount 평균                   |                        291.75 |                   60 |
| 설명 영역 style 변경 횟수/전환         |                          9–18 |                    0 |
| 설명 영역 높이 변화/전환               |                  0.15–32.36px |                  0px |
| CSS 설명 슬라이드 구간의 최대 rAF 간격 | 해당 없음: 기존 JS 애니메이션 |          17.3–18.2ms |
| CSS 슬라이드 중 33.4ms 초과 간격       |            동일 CSS 구간 없음 |           4회 모두 0 |

수정 후 설명 `animationend`는 클릭 후 419.8–436.0ms, 첫 코드 DOM 변경은 520.1–540.6ms에 관측됐다. 4회 모두 설명 슬라이드 이후에 코드가 바뀌었다.

**해석 범위:** rAF 간격은 메인 스레드 응답성 지표이며 실제 compositor FPS가 아니다. 클릭에서 첫 rAF까지의 시간은 최대 간격 계산에 포함하지 않는다. CSS 슬라이드 지표는 수정 후 별도 구간 측정으로, 기존 JS 슬라이드와 동일 구간의 전후 FPS 비교가 아니다. 코드 준비가 시작된 뒤에는 67–75ms의 rAF 지연이 남는다. 4회 표본과 CPU slowdown만으로 모든 기기의 프레임 드랍이 0이라고 보장하지 않는다. GPU·메모리가 느린 기기를 그대로 모사하는 측정도 아니다.

## 검증

- 직접 렌더러 테스트 3개: 읽기/쓰기 순서, 전환 조회 1회와 퇴장 토큰 완료 후 제거, 제자리 이동 제거.
- MagicMove 컴포넌트 테스트 4개: 슬라이드 후 코드 갱신, 자손/이전 단계 이벤트 무시, 빠른 방향 전환, 동작 감소 및 재생 중 설정 변경.
- StepInfo 테스트 2개: 방향 전달과 현재 단계만 노출. 기존 JS transform 관찰 테스트를 CSS 방식에 맞게 수정했다.
- 전체 단위 테스트 33개 파일 / 309개 테스트 통과. 프로덕션 빌드의 타입·린트 검사와 포맷 검사 통과. 기존 Tailwind 및 Hook 경고는 유지된다.
- 실제 브라우저: 다음/이전 keyframe 방향, 직접 단계 선택, 빠른 다음→이전→다음 후 설명·코드 일치, 마지막 단계 다음 버튼 비활성화, 동작 감소 전환 확인.
- 모바일 390×844: 설명 영역 279px, 활성 설명 263px, 문서 가로 넘침 없음, 활성 설명 1개. 검사 중 pageerror 없음.

## 참고 문서

- [Motion: Animation performance](https://motion.dev/docs/performance) — compositor 애니메이션과 transform/opacity 선택.
- [MDN: Element.getAnimations](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations) — subtree 조회와 Animation.finished 처리.
- [MDN: animationend](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event) — 실제 완료 이벤트 및 중단 시 이벤트가 발생하지 않는 조건.
- [pnpm patch-commit](https://pnpm.io/cli/patch-commit) — 패치 파일과 patchedDependencies 등록.
- 설치된 `shiki-magic-move@1.0.0/dist/renderer.mjs` — 패치 대상과 루프 순서 확인. [프로젝트 소스](https://github.com/shikijs/shiki-magic-move).

## 모션 리뷰 후 수정

위 전후 수치는 초기 최적화 커밋의 기록이다. 아래 수정 이후의 성능 수치로 해석하지 않는다.

- 동작 감소: 설명뿐 아니라 코드 토큰의 transform과 컨테이너 크기 전환도 제거한다. 코드의 opacity/color 전환만 200ms로 유지하며, 재생 중 설정을 바꾸면 진행 중인 이동도 취소한다. 실제 Shiki가 실행되는 `tests/magic-move-motion.spec.ts`에서 검증한다.

- 키보드: React capture 이벤트로 입력 방식을 전달한다. 포털의 단계 선택도 포함하며 키보드에서는 설명과 코드를 즉시 전환한다. 다음 pointerdown부터 일반 애니메이션을 복원한다.

- 방향 반전: 설명의 위치와 opacity를 CSS transition으로 재목표화한다. 이전 설명도 현재 위치에서 빠져나가므로 중간에 돌아와도 시작 위치로 초기화되지 않는다. 현재 설명의 transform transition 완료만 코드 갱신을 허용하며, 첫 프레임 전에 다시 선택해 transition이 생기지 않은 경우에는 즉시 갱신한다.

- 코드 컨테이너: `animateContainer: false`로 크기는 즉시 반영한다. 이동/진입/퇴장 토큰의 transition 속성을 transform/opacity로 제한하고 컨테이너의 transition은 제거한다.

### 리뷰 수정 후 검증

- 전체 단위 테스트 33개 파일 / 311개 통과. 프로덕션 빌드, 타입·린트 검사, 포맷 검사 통과.
- `pnpm exec playwright test tests/magic-move-motion.spec.ts --project=chromium --workers=1 --reporter=line`: 수정 전 4개 실패, 수정 후 4개 통과. 동작 감소는 `<br>` 토큰 및 재생 중 변경도 포함한다. 키보드 선택기는 Radix의 포커스 이동 완료를 확인한 뒤 Enter로 선택한다.
- 같은 Chromium 152.0.7977.83 / 1280×900 / CPU 4×에서 4→5→4→5→4 재측정: 설명 transition 구간 최대 rAF 간격 17.8–18.1ms, 33.4ms 초과 4회 모두 0. 전체 2초 구간 최대 간격 62.3–72.7ms. LayoutCount 평균 21.5회, ScriptDuration 평균 97.8ms.
- 모든 회차에서 코드 DOM 갱신은 설명의 transform transition 종료 후 발생했다. rAF는 compositor FPS가 아니며 코드 준비 구간의 짧은 지연은 남는다. 모바일 및 모든 하드웨어의 무프레임드랍을 보증하는 검사는 아니다.

### 코드 컨테이너 높이 애니메이션 복원

사용자 요청에 따라 일반 포인터 조작에서 코드 컨테이너의 높이 애니메이션을 복원한다. `animateContainer: true`와 라이브러리의 기존 duration/delay를 사용하고, 컨테이너 전환 속성은 height/width/background-color/color로 명시해 `transition: all`은 복원하지 않는다. 설명 슬라이드 완료 후 코드 전환을 시작하는 순서와 렌더러 배치 최적화는 유지한다. 키보드 및 동작 감소 모드의 즉시 크기 반영도 유지한다.

브라우저 회귀 검사는 일반 모드의 실제 height 전환이 존재하는지 확인하도록 수정했다. 위 리뷰 수정 후 성능 수치는 높이 애니메이션을 제거한 버전의 기록이며, 복원 이후의 측정값이 아니다.
