# 개발 명령어

> 패키지 매니저는 **pnpm만 사용**한다. npm/yarn은 lockfile 충돌을 유발한다.

## 일상 개발

```bash
pnpm dev          # 개발 서버 (localhost:3000)
pnpm build        # 프로덕션 빌드 (최적화 포함)
pnpm start        # 프로덕션 서버 (build 선행 필요)
pnpm clean        # .next 빌드 아티팩트 제거
```

`pnpm start`는 반드시 `pnpm build` 이후에 실행해야 한다. 빌드 없이 실행하면 이전 빌드 결과로 서빙되어 혼란을 유발한다.

## 코드 품질

```bash
pnpm lint         # ESLint 검사 (src/ 전체)
pnpm lint:fix     # ESLint 자동 수정
pnpm format       # Prettier 포맷팅
pnpm format:check # 포맷팅 검사만 (수정 없음)
pnpm check-types  # TypeScript 타입 체크
```

**실행 순서**: `lint:fix` -> `format` -> `check-types`. 단, pre-commit hook(lint-staged)이 커밋 시 자동으로 타입 체크와 MDX 포맷팅을 실행하므로 수동 실행은 필요할 때만 한다.

lint-staged 자동 처리 범위:

- `**/*.ts?(x)` -> `pnpm check-types`
- `*.{md,mdx}` -> `prettier --write`

## 테스트

```bash
pnpm test:unit    # Vitest (유닛 테스트)
pnpm test:e2e     # Playwright (E2E 테스트)
```

**Vitest**: 유틸 함수, 비즈니스 로직의 단위 테스트. `src/**/*.spec.{ts,tsx}` 파일 대상. jsdom 환경.

**Playwright**: SEO 동작, 헤더 설정, 핵심 사용자 흐름 검증. `tests/` 디렉토리 대상. 프로덕션 서버를 시작한 후 실행되므로 빌드가 필요하다.

## 번들 분석

```bash
pnpm build-stats  # @next/bundle-analyzer로 번들 크기 시각화
```

빌드 완료 후 브라우저에서 번들 구성을 확인할 수 있다. 새 의존성 추가 시 번들 사이즈 영향을 반드시 확인한다.

## 커밋

```bash
pnpm cz           # Commitizen 대화형 커밋 메시지 작성
```

Conventional Commits + 한국어 메시지를 사용한다. 형식: `<type>(<scope>): <한국어 설명>`.
