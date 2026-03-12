# 구현 결정 기록 (ADR)

> 주요 아키텍처 및 구현 결정의 맥락, 결정, 근거를 기록한다.
> 새로운 결정이 추가되면 이 문서를 업데이트한다.

## D1: Tailwind CSS bd- prefix

- **맥락**: shadcn/ui 컴포넌트와 기존 스타일, 외부 라이브러리 스타일 간 클래스명 충돌 가능성
- **결정**: 전역 prefix `bd-` 적용 (`tailwind.config.ts`의 `prefix: 'bd-'`)
- **근거**: 네임스페이스 격리로 스타일 충돌 없이 안전한 합성. shadcn/ui의 `components.json`에서도 동일 prefix 설정

## D2: MDX 컴포넌트 Zod 검증 의무화

- **맥락**: MDX에서 잘못된 prop이 전달되면 런타임 에러 발생. 빌드 타임에 잡히지 않아 디버깅이 어려움
- **결정**: 모든 MDX 컴포넌트에 `createMDXComponent` 래퍼 + Zod 스키마 필수
- **근거**: 개발 환경에서만 검증 실행 (`VERCEL_ENV !== 'production'`). 프로덕션 성능에 영향 없이 안전성 확보. `zod-validation-error`로 읽기 쉬운 에러 메시지 제공

## D3: content/ vs craft/ 분리

- **맥락**: 블로그 글(깊이 있는 기술 문서)과 크리에이티브 콘텐츠(실험적, 짧은 데모)의 성격 차이
- **결정**: 별도 디렉토리 + 별도 MDXProcessor 인스턴스 + 별도 라우트 (`/article/` vs `/craft/`)
- **근거**: 각 콘텐츠 타입에 맞는 표시 형식 적용 가능 (상대 시간 표시 여부 등). URL 구조로 콘텐츠 성격을 명확히 구분

## D4: Zustand + persist 미들웨어

- **맥락**: 사운드 토글 등 사용자 설정이 페이지 새로고침 시 초기화되는 문제
- **결정**: Zustand에 `persist` 미들웨어를 사용하여 localStorage 자동 저장
- **근거**: Context API보다 보일러플레이트가 적고, persist 미들웨어로 상태 유지를 선언적으로 처리. storage key에 `bd-` prefix 사용하여 다른 사이트의 localStorage와 구분

## D5: next-themes + giscus 동기화

- **맥락**: 테마 전환 시 giscus 댓글 위젯이 이전 테마에 머무르는 문제
- **결정**: `useThemeManager` 커스텀 훅에서 `postMessage`로 giscus iframe에 테마 변경 전파
- **근거**: giscus는 iframe으로 렌더링되어 부모 페이지의 CSS 변수를 상속하지 않음. `postMessage` API가 cross-origin 통신의 표준 방법

## D6: HSL 형식 CSS 변수

- **맥락**: 다크 모드 전환 시 색상 값을 효율적으로 변경해야 함
- **결정**: 모든 색상을 HSL 형식 CSS 변수로 정의 (`--background: 0 0% 100%`)
- **근거**: Tailwind의 `hsl(var(--name))` 패턴과 호환. `.dark` 클래스에서 변수 값만 변경하면 모든 컴포넌트에 자동 반영. opacity modifier (`/90`) 사용 가능

## D7: use-sound tsconfig path alias

- **맥락**: `use-sound` 패키지의 타입 해석 문제로 TypeScript에서 모듈을 찾지 못함
- **결정**: `tsconfig.json`에 `"use-sound": ["./node_modules/use-sound/"]` path alias 추가
- **근거**: 패키지 자체의 타입 정의 구조 문제를 우회하기 위한 최소 침습적 해결책. 패키지 업데이트 시 재검토 필요

## D8: 프론트매터 글자 수 제한

- **맥락**: SEO 최적화와 UI 레이아웃 일관성
- **결정**: title 38자, summary 40자, description 150자 제한 (Zod 스키마)
- **근거**: OG 이미지 렌더링, 글 목록 UI, 검색 엔진 결과에서 잘리지 않는 최대 길이. 빌드 타임 검증으로 배포 전 발견

## D9: Edge Runtime OG 이미지 생성

- **맥락**: OG 이미지를 정적으로 관리하면 글마다 수동 생성 필요
- **결정**: `/api/og` 엔드포인트에서 `ImageResponse`를 사용한 동적 생성, Edge Runtime 배포
- **근거**: 글 제목으로 자동 생성하여 관리 부담 제거. Edge Runtime으로 CDN에서 캐시되어 성능 영향 최소화. `Sec-CH-Prefers-Color-Scheme` 헤더로 클라이언트 색상 스킴 반영

## D10: 이중 테스트 러너 (Vitest + Playwright)

- **맥락**: 유닛 테스트와 E2E 테스트의 실행 환경과 목적이 다름
- **결정**: Vitest로 유닛 테스트 (jsdom), Playwright로 E2E 테스트 (실제 브라우저)
- **근거**: Vitest는 빠른 피드백 루프, Playwright는 실제 사용자 시나리오 (SEO 메타데이터, 헤더 설정 등) 검증. 각 도구의 강점을 활용
