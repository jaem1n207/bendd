# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

See [AGENTS.md](AGENTS.md) for canonical project rules and [docs/](docs/) for detailed documentation.

@AGENTS.md
@docs/pitfalls.md
@docs/conventions.md

## PR Workflow

모든 코드 변경 작업은 다음 워크플로우를 따른다.

### 작업 단위 분리 원칙

- 하나의 PR은 하나의 관심사만 다룬다
- PR 크기는 300줄 이하를 목표로 한다
- 서로 의존하지 않는 작업은 별도 PR로 분리한다

### 실행 전략 판단

작업 요청을 받으면, 먼저 작업의 성향과 특성을 분석하여 실행 전략을 결정한다:

#### Sub Agent (Task tool) — 같은 브랜치 내 병렬

- **언제:** 하나의 PR 내에서 파일 간 의존성이 있는 여러 작업을 동시에 수행할 때
- **예시:** 같은 feature의 UI 컴포넌트 + query factory + 타입 정의를 동시에 작성
- **특징:** 동일 디렉토리, 동일 브랜치, 하나의 PR

#### Worktree + 독립 Claude Code 인스턴스 — 브랜치 간 병렬

- **언제:** 모듈 간 독립성이 높은 작업을 별도 PR로 동시에 진행할 때
- **제약:** dependency 변경이 필요한 작업은 worktree 병렬을 피한다 (lockfile 충돌 위험)

#### 순차 실행 — 의존성 있는 복수 PR

- **언제:** PR 간 의존관계가 있을 때 (shared 패키지 변경 후 feature 개발)

### Worktree 운영 규칙

**생성:**

```bash
git worktree add ../bendd-wt-<name> -b <type>/<description> main
# 새 터미널에서:
cd ../bendd-wt-<name> && pnpm install --frozen-lockfile
claude  # Anthropic Claude Code CLI로 독립 인스턴스 실행
```

**정리:** `git worktree remove ../bendd-wt-<name>`

**규칙:**

- 디렉토리명: `../bendd-wt-<짧은이름>`
- 머지 완료된 worktree는 즉시 제거한다

### PR 생명주기

1. main 최신화 → 브랜치 생성 (`<type>/<description>`)
2. Conventional Commits + 한국어 커밋: `<type>(<scope>): <한국어 설명>`
3. `git push -u origin <branch>` → `gh pr create` (Assignees: `jaem1n207`)
4. PR 생성 후: `open -a "Arc" <pr_url>`
5. CodeRabbit 리뷰 대기 (30초 간격 폴링, 최대 5분): `gh pr view <pr_number> --comments`
6. 피드백 반영 → 재커밋 → push → 모든 리뷰 코멘트에 응답
7. PR 설명 최신화: `gh pr edit <pr_number> --body "<업데이트된 설명>"`
8. CI 통과 확인: `gh pr checks <pr_number>`
9. LGTM 코멘트 추가 → `gh pr merge <pr_number> --squash --delete-branch`
10. 로컬 정리: `git checkout main && git pull origin main`

### 브랜치 네이밍

| Prefix      | 용도      |
| ----------- | --------- |
| `feat/`     | 새 기능   |
| `fix/`      | 버그 수정 |
| `refactor/` | 리팩토링  |
| `chore/`    | 설정/CI   |
| `docs/`     | 문서      |
