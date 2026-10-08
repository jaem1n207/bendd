# 패키지 번들 최적화 검증 — 2026-10-08

기준은 `origin/main`의 `5d945f7`이다. Next.js 15.5.21, Shiki 2.5.0,
Node 24.20.0, pnpm 10.34.5와 동일한 lockfile로 변경 전후를 빌드했다.
기존 작업 폴더의 Next.js 14 측정 결과와는 별개다.

## 변경

- MagicMove가 현재 언어와 필수 내장 문법만 불러온다. 전체 Shiki 진입점 대신
  `shiki/core`와 Oniguruma 엔진의 개별 진입점을 사용한다. 기존 언어·별칭,
  SCSS, 두 테마, 줄 번호와 단계 전환을 보존한다.
- 언어 변경·언마운트에 이전 하이라이터를 폐기한다. 늦게 완료된 초기화가
  현재 언어의 상태를 덮어쓰거나 폐기된 하이라이터를 재사용하지 않는다.
- 위치 응답을 받았을 때 Zod 검증 모듈을 불러온다. 검증·취소·8초 timeout을
  유지한다. 언마운트 뒤에는 검증 모듈을 요청하거나 상태를 갱신하지 않는다.
- 분석기의 자동 브라우저 실행을 끄고 HTML 보고서 생성을 유지한다.

현재 Dock·개인정보 UI가 layout 애니메이션을 사용하므로 공통 Motion 기능은
축소하지 않는다. 패키지 버전, lockfile, 모션·테마·동의 정책은 변경하지 않는다.

## 측정

`pnpm build-stats`의 **First Load JS**이며 비동기 청크·HTML·RSC·폰트·이미지를
포함한 전체 화면 전송량이나 운영 Core Web Vitals 측정이 아니다.

| 경로               | 변경 전 | 변경 후 |
| ------------------ | ------: | ------: |
| 홈 `/`             |  313 kB |  300 kB |
| Article·Craft 목록 |  224 kB |  224 kB |
| Article·Craft 상세 |  302 kB |  302 kB |

Webpack 분석기의 gzip 수치를 합산했다. 문법 청크는 변경 전 훅이 기다리던
전체 문법 청크와 변경 후 TypeScript 본체·진입점 청크를 비교한다.
WASM, 하이라이터 본체, 테마는 문법 청크 합계에서 제외했다.

| 항목                                |     변경 전 |     변경 후 |
| ----------------------------------- | ----------: | ----------: |
| TypeScript 예제의 문법 청크, gzip   |    83,724 B |    16,819 B |
| TypeScript 예제의 문법 청크, parsed |   687,600 B |   209,254 B |
| 전체 client 청크 합계, gzip         |   885,370 B |   887,805 B |
| 전체 client 청크 합계, parsed       | 3,069,322 B | 3,076,971 B |

홈 초기 JS는 약 4.2%, TypeScript 예제의 문법 청크 gzip 합계는 약 79.9%
감소한다. 전체 client 합계에는 모든 선택적 청크가 포함되며, 분할 비용으로
약 2.4 kB 증가한다. 하나의 예제가 전부 내려받는 양은 아니다.

## 검증과 재현

- 전체 Vitest: 81개 파일, 735개 테스트 통과.
- 프로덕션 분석 빌드: Next.js lint·타입 검사 및 정적 페이지 생성 통과.
- 프로젝트 전체 Prettier 검사 통과.
- Playwright 37개 통과: 실제 다운로드한 TypeScript·SCSS 문법, MagicMove의 테마·복사·
  단계 전환과 모션 감소, 위치 응답·취소·시간대·WebGL fallback을 검증했다.

Playwright 1.44.1의 Chromium 1117이 로컬에 없어 설치된 Google Chrome의
격리 컨텍스트를 임시 설정으로 사용했다. Shiki 2의 문법은 JSON 문자열로
출력되므로 새 다운로드 테스트는 JSON escape를 해제해 scope 메타데이터를 읽는다.

```sh
pnpm build-stats
pnpm test:unit --run --maxWorkers=2
pnpm format:check
```

보고서는 `.next/analyze/client.html`, `nodejs.html`, `edge.html`에 생성된다.
다음 빌드가 덮어쓰므로 비교 전 복사한다. 이번 기준 보고서는 임시 경로
`/private/tmp/bendd-bundle-pr-before/analyze/`에 보관했다.
