# 홈 초기 리소스 최적화

## 측정 조건

- 기준: `main`의 `2b8f22c1a0498e0df5f16f5f8246552476573478`.
- 환경: Node 24.20.0, pnpm 10.34.5, Next.js 15.5.21, React 19.2.7.
- 양쪽 모두 `pnpm build` 후 `pnpm start`로 제공한 로컬 production 빌드.
- Chrome 154.0.8037.93, 1728×941, DPR 2, 새 browser context, throttle 없음.
- `/`의 첫 화면에서 `networkidle`, `document.fonts.ready`, 추가 1.5초 후 측정. 스크롤과 클릭 없음.
- `PerformanceResourceTiming`의 subresource 합계이며 HTML 문서는 제외한다. 폰트와 JS는 `encodedBodySize`, 전체 전송량은 `transferSize`다.
- 2026-10-05에 각 빌드를 한 번씩 측정했다. 배포 환경이나 field Core Web Vitals 개선을 입증하는 수치는 아니다.

| 지표                     |     변경 전 |   변경 후 |   변화 |
| ------------------------ | ----------: | --------: | -----: |
| Subresource 전송량       | 2,678,025 B | 593,852 B | −77.8% |
| Subresource 요청 수      |          65 |        40 |    −25 |
| 폰트 encoded bytes       | 2,217,568 B | 205,256 B | −90.7% |
| JavaScript encoded bytes |   351,463 B | 321,800 B |  −8.4% |
| 사운드 요청              |          15 |         0 |    −15 |
| RSC 요청                 |           2 |         0 |     −2 |

## 원인과 변경

홈 전용 Pretendard subset을 이미 사용하지만, 홈 밖의 Dock·숨김 안내문·portal 메뉴가 공통 sans stack을 통해 2,057,688-byte 전체 폰트를 요청했다. 같은 원본의 55,988-byte `PretendardInterface.woff2`를 공통 stack 앞에 둔다. TypeScript AST의 문자열과 JSX text에서 UI 문자를 추출하며, 주석은 제외한다. 기존 home subset 생성 범위와 variable weight·glyph metrics·license metadata를 유지한다. Fira Mono의 세 굵기도 실제 사용 시에만 요청한다.

`use-sound`는 각 마운트에서 샘플과 Howler를 로드했다. `playSound`는 클릭할 때 `HTMLAudioElement`를 만들고 URL별로 공유한다. 동일 샘플의 재클릭은 처음부터 재생하며, 재생 거부나 미지원 환경에서도 클릭 동작은 유지한다. `WithSound`는 자식 클릭 이벤트를 전달한다. 사용처가 사라진 `use-sound`와 transitive Howler를 lockfile에서도 제거한다.

홈과 Dock의 내부 링크는 `IntentLink`를 사용한다. viewport 진입 시 자동 prefetch를 끄고 pointer enter, keyboard focus, touch start에서 prefetch한다. 같은 마운트·목적지에서는 중복 요청을 피하고, 호출자 이벤트와 취소 여부를 보존한다.

WebMCP provider는 브라우저 지원 여부를 먼저 확인한다. 지원할 때만 registration과 도구·schema chunk를 import하며, 기존 idle 등록·취소·중복 declarative 도구 처리 테스트는 registration 쪽으로 이동한다. 측정한 미지원 Chrome에서는 registration chunk가 요청되지 않았다.

`/sounds/*`, `/images/tech-stack/*`, `/images/profile/*`에는 `public, max-age=86400, stale-while-revalidate=604800`을 적용한다. 고정 경로이므로 `immutable`은 쓰지 않는다. 이 upstream 정책은 프로필 이미지 optimizer 응답에도 적용되며, hashed font는 Next.js의 1년 immutable 정책을 유지한다.

## 검증과 재현

로컬에서 다음 검사를 통과했다.

- `pnpm check-types`, `pnpm lint`, `pnpm format:check`, `pnpm build`.
- `pnpm test:unit --run`: 71개 파일, 623개 테스트.
- CI의 Availability tests 24개, Availability ESLint·Prettier 검사.
- production Chrome E2E 6개: desktop/mobile 초기 리소스 예산, portal 폰트, keyboard prefetch 후 이동, 사운드 지연 로딩·샘플 공유, 정적 파일·이미지 optimizer·폰트 cache headers, Article/Craft 폰트 contract.
- 같은 viewport의 변경 전후 첫 화면을 비교해 텍스트와 레이아웃을 확인했다.

브라우저 테스트는 production 서버를 켠 상태에서 다음 두 파일을 실행한다. 임시 Playwright config에 `baseURL: 'http://127.0.0.1:3000'`, `channel: 'chrome'`, `workers: 1`을 설정하고 아래 필터를 사용했다. 저장소 기본 config에는 `baseURL`이 설정되어 있지 않다.

```sh
pnpm exec playwright test --config <local-config> \
  --grep 'initial resources|audio loads|cache headers|Pretendard font contract'
```

`testMatch`는 `home-resources.spec.ts`, `mdx-rendering.spec.ts`로 제한한다. `pnpm build`는 두 Pretendard subset을 로컬에서 재생성한다. 새 UI 문구나 portal을 추가하면 생성 대상과 리소스 예산 테스트를 함께 확인한다.

다음 코드를 저장소 루트에서 실행하면 위 전송량을 같은 방식으로 다시 수집할 수 있다. 비교 시에는 각 production 빌드마다 새 context를 만들고 동일한 서버 URL을 사용한다.

```sh
node --input-type=module <<'JS'
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1728, height: 941 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const requests = [];
page.on('request', request => requests.push({
  url: request.url(), rsc: request.headers().rsc,
}));
await page.goto('http://127.0.0.1:3000/');
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready.then(() => undefined));
await page.waitForTimeout(1500);
const resources = await page.evaluate(() => performance
  .getEntriesByType('resource')
  .filter(entry => entry instanceof PerformanceResourceTiming)
  .map(entry => ({
    url: entry.name,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
  })));
const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
const byExtension = extension => resources.filter(resource =>
  new URL(resource.url).pathname.endsWith(extension));
console.log({
  browser: await browser.version(),
  requests: resources.length,
  transferSize: sum(resources, 'transferSize'),
  fontEncodedBytes: sum(byExtension('.woff2'), 'encodedBodySize'),
  jsEncodedBytes: sum(byExtension('.js'), 'encodedBodySize'),
  audioRequests: requests.filter(request => request.url.includes('/sounds/')).length,
  rscRequests: requests.filter(request => request.rsc === '1').length,
});
await browser.close();
JS
```

## Tradeoffs와 후속 확인

- UI subset에 없는 글자는 전체 Pretendard로 fallback하므로 Article/Craft에서 전체 폰트 다운로드는 계속 필요하다. 본문에서는 작은 UI subset 비용이 추가될 수 있다.
- 사운드 첫 클릭에는 네트워크·decode 지연이 있다. 반복 클릭은 같은 요소를 재사용한다. 실제 Safari/iOS 오디오 지연은 이번 검증에 포함하지 않았다.
- 링크를 바로 클릭하면 prefetch에 쓸 시간이 짧다. 기본 `<Link>`의 라우팅은 유지하며 키보드·터치 의도도 처리한다.
- 같은 URL의 정적 파일 교체는 1일 freshness와 최대 7일 stale 재검증 정책의 영향을 받는다. 즉시 반영이 필요하면 파일명을 바꾼다.
- 실제 WebMCP 브라우저 통합과 Vercel CDN의 응답은 배포 후 확인 대상이다. 지원/미지원 분기와 등록 수명 주기는 unit test로 검증했다.
- 롤백은 이 PR의 commit을 revert한다. 데이터 migration이나 외부 설정 변경은 없다.
