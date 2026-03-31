# 이미지 줌 기능 + 상태 표시줄 모니터링 — 완료 (2026-03-31)

## 개요

MDX 이미지에 Medium 스타일 클릭 줌 기능을 추가하고, 토큰 절약 가이드에 Claude Code 상태 표시줄 모니터링 섹션을 추가했다.

## 문제 정의

1. **이미지 확대 불가**: 블로그 이미지(특히 HUD 터미널 스크린샷)가 작아서 내용을 읽기 어려움
2. **상태 표시줄 ANSI 깨짐**: `\033[33m` 등 이스케이프 코드가 렌더링되지 않고 원문 출력
3. **토큰 모니터링 부재**: 컨텍스트 사용량을 실시간으로 확인할 수 없어 /compact 타이밍 판단이 감에 의존

## 기술 결정

| 결정                   | 선택                                      | 대안                        | 대안 거부 이유                                                                |
| ---------------------- | ----------------------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| 줌 라이브러리          | 순수 CSS transition (자체 구현)           | react-medium-image-zoom     | 파노라마 이미지에서 뷰포트에 맞춰 축소되어 텍스트 읽기 불가                   |
| 줌 애니메이션          | CSS transform + transition                | Framer Motion layoutId      | 두 요소 간 전환으로 갑작스러운 점프 발생                                      |
| 줌 이미지 렌더링       | createPortal 클론                         | 원본 이미지 position: fixed | `<div>` 플레이스홀더가 `<p>` 내부에서 잘못된 HTML 생성 → 12px 레이아웃 불일치 |
| 줌 스케일              | 뷰포트 최대 채움 (naturalWidth 제한 없음) | naturalWidth 제한           | 이미지가 충분히 크게 확대되지 않음                                            |
| 줌 타이밍              | cubic-bezier(0.2, 0, 0.2, 1) 300ms        | ease-out-quint 200ms        | medium-zoom과 동일한 자연스러운 가속+감속                                     |
| 파노라마 이미지 처리   | 일관된 줌 (모든 이미지 동일)              | title 기반 새 탭 열기       | 클릭 경험 일관성 깨짐                                                         |
| 포커스 복원            | useEffect + shouldRestoreFocus ref        | requestAnimationFrame       | rAF는 React의 state commit과 동기화되지 않아 포커스 복원 실패                 |
| 스크롤 줌아웃 overflow | 즉시 복원 + rAF 위치 추적                 | 포탈 언마운트까지 유지      | transition 중 스크롤 차단으로 UX 저하                                         |
| close() 중복 호출 방지 | isClosingRef guard                        | 없음                        | 연속 wheel 이벤트가 cloneAnimatedRef=false 분기를 타서 포탈 즉시 제거         |
| cloneAnimated 참조     | ref (cloneAnimatedRef)                    | useCallback deps에 포함     | handleWheel→close 콜체인에서 stale closure 발생                               |
| HUD 플러그인           | OMC HUD                                   | claude-hud                  | OMC 워크플로우 통합(ralph, autopilot 등), safeMode ANSI 제거                  |

## 아키텍처 영향

```
Before: MDX img → MDXRoundedImage (정적 이미지)
After:  MDX img → MDXZoomImage → 클릭 시 createPortal(클론) + overlay
```

줌 데이터 플로우:

1. 클릭 → getBoundingClientRect로 위치/크기 측정
2. 원본 visibility: hidden, 클론을 body에 포탈 렌더링
3. RAF 2프레임 후 scale+translate3d transform 적용 → CSS transition 애니메이션
4. 닫기 시 overflow 즉시 복원 → rAF 루프로 원본 이미지 뷰포트 위치 추적 → 클론 top/left 동기화
5. transitionEnd → rAF 루프 정리, 클론 제거, 원본 visibility 복원, 포커스 복원

## 파일 변경 맵

| PR   | 파일                                                | 변경 내용                                                          |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------ |
| #108 | content/frontend/save-tokens-for-ai-agent.mdx       | 상태 표시줄 모니터링 섹션 + HUD 이미지 추가                        |
| #108 | public/images/save-tokens-for-ai-agent/omc-hud.png  | OMC HUD 스크린샷                                                   |
| #109 | src/mdx/components/zoom-image/zoom-image.tsx        | MDXZoomImage 컴포넌트 (포탈 기반 클론 줌, createMDXComponent 래핑) |
| #109 | src/mdx/components/zoom-image/zoom-image.module.css | 오버레이, 클론, 캡션 스타일                                        |
| #109 | src/mdx/components/zoom-image/zoom-image.spec.tsx   | 21개 유닛 테스트 (포커스 복원, Escape/스크롤 닫기 포함)            |
| #109 | tests/image-zoom.spec.ts                            | 5개 E2E 테스트 (Playwright, 포커스 복원 + 스크롤 닫기 검증)        |
| #109 | src/mdx/custom-mdx.tsx                              | img 매핑 MDXRoundedImage → MDXZoomImage                            |
| #109 | AGENTS.md                                           | Code Map 업데이트                                                  |
| #109 | docs/conventions.md                                 | 이미지 줌 동작 설명 추가                                           |

## 미적용 개선 사항

- custom-mdx.tsx의 모든 import를 `@/` alias로 일괄 변경 (현재 `./` 상대경로, 일관성 이슈)
- 줌 오버레이 클론에 Next.js Image 적용 검토 (현재 native img — 포탈 위치 제어 필요로 유지)

## 테스트 현황

| 컴포넌트          | 기존 | 추가 | 합계 |
| ----------------- | ---- | ---- | ---- |
| zoom-image (유닛) | 0    | 21   | 21   |
| zoom-image (E2E)  | 0    | 5    | 5    |
