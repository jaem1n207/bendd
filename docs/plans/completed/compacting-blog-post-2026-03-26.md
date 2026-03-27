# Compacting 이후 AI 품질 저하 해결 가이드 블로그 글 — 완료 (2026-03-26)

## 개요

Claude Code의 "Compacting conversation..." 이후 답변 품질이 떨어지는 원인과 해결법을 다루는 기술 블로그 글을 작성하고, PR #103으로 main에 병합했다.

## 문제 정의

AI 코딩 에이전트 사용자들이 긴 세션 후 Compacting이 발생하면 AI가 이전 맥락을 잃어버려 답변 품질이 크게 저하되는 문제를 경험함. 이 문제의 원인과 해결법을 개발자 대상으로 설명하는 콘텐츠가 필요했음.

## 기술 결정

| 결정              | 선택                            | 대안                       | 대안 거부 이유                                                   |
| ----------------- | ------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| 카테고리          | `frontend`                      | 새 `ai` 카테고리 생성      | MetadataSchema에 enum 제한 없으나, 라우팅/네비게이션 영향 불명확 |
| 코드 예시 방식    | 실제 코드 + GitHub permalink    | 의사 코드                  | 신뢰성 — 독자가 직접 코드를 확인할 수 있어야 함                  |
| OMC/OMO 소개 위치 | 도입부에서 접근법 → 구현체 순서 | 바로 OMC/OMO 이름부터 소개 | 독자가 OMC/OMO를 모를 수 있어 접근법을 먼저 설명                 |
| OMC 설치 안내     | 번외 섹션으로 분리              | 본문에 통합                | 글의 주제는 원리 이해이지 도구 설치가 아님                       |

## 아키텍처 영향

- `src/mdx/mdx.module.css`에 3개 CSS 규칙 추가 (p+ul 간격, figure+blockquote 간격)
- 이 CSS 변경은 전체 MDX 콘텐츠에 영향 — 다른 글에서 p 바로 다음 ul이나 figure 다음 blockquote가 있는 경우 간격이 좁아짐

## 파일 변경 맵

| 커밋    | 파일                                                                         | 변경 내용                                            |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| 6d6d4a8 | `content/frontend/fix-compacting-conversation.mdx`                           | 초안 작성 (387줄)                                    |
| 19d9165 | `content/frontend/fix-compacting-conversation.mdx`                           | 피드백 반영 — 문장 개선, 코드 정확성, 링크 앵커      |
| db560ec | `content/frontend/fix-compacting-conversation.mdx`, `src/mdx/mdx.module.css` | 도입부 가독성, 실제 코드 일치, CSS 간격              |
| a2f6b7f | `src/mdx/mdx.module.css`                                                     | figure margin-bottom 무효화                          |
| e771f68 | `content/frontend/fix-compacting-conversation.mdx`                           | OMC/OMO 플로우 다이어그램, 체크포인트 JSON 예시 추가 |
| 5d699bc | `content/frontend/fix-compacting-conversation.mdx`                           | 해결 접근법과 OMC 플로우 섹션 통합                   |

## 미적용 개선 사항

- `<MagicMove>` 컴포넌트로 압축 흐름 애니메이션화 (검토했으나 코드 블록으로 충분하다고 판단)
- 별도 `ai` 카테고리 생성 (향후 AI 관련 글이 늘어나면 재검토)

## 테스트 현황

| 항목             | 결과                                               |
| ---------------- | -------------------------------------------------- |
| Frontmatter 검증 | 통과 (title 29자, summary 21자, description 105자) |
| pnpm build       | 성공 (모든 커밋에서 확인)                          |
| pre-commit hook  | 통과 (prettier)                                    |
