# WebMCP 적극 적용 설계

## 배경

WebMCP는 브라우저가 열린 상태에서 웹 페이지가 AI 에이전트에게 구조화된
도구를 노출하도록 제안된 표준이다. bendd.me는 블로그, craft, MDX 문서,
플레이그라운드, 전역 설정처럼 사람이 조작하는 표면이 명확하므로 WebMCP를
progressive enhancement로 적용하기 좋다.

이 설계는 프로덕션 번들에 WebMCP 지원을 포함하되, 브라우저가
`navigator.modelContext`를 제공할 때만 활성화한다. 지원하지 않는 브라우저는
기존 동작과 성능이 변하지 않아야 한다.

## 목표

- 전역 내비게이션, 콘텐츠 탐색, 현재 문서 컨텍스트, MDX 액션, 플레이그라운드
  실행을 WebMCP 도구로 적극 노출한다.
- 안전한 동작은 에이전트가 자동 실행할 수 있게 한다.
- 외부 링크 이동, 이메일 작성, 사용자의 브라우저 밖 부작용은 자동 실행하지
  않는다.
- 현재 글의 전체 본문은 반환하지 않고, 제목, 날짜, TL;DR, 설명, 목차, 짧은
  excerpt까지만 반환한다.
- WebMCP 미지원 브라우저의 런타임 비용은 사실상 0에 가깝게 유지한다.
- 지원 브라우저에서도 초기 렌더링, MDX 렌더링, 스크롤 성능에 영향을 주지
  않는다.

## 비목표

- headless agent가 브라우저 컨텍스트 없이 호출할 수 있는 별도 서버 MCP를 만들지
  않는다.
- 전체 MDX 원문을 도구 출력으로 제공하지 않는다.
- GitHub, YouTube, Chrome Web Store, `mailto:` 같은 외부 링크를 도구 호출만으로
  자동으로 열지 않는다.
- WebMCP 전용 디버그 패널을 사이트 안에 만들지 않는다. 검증은 Chrome flag와
  Model Context Tool Inspector Extension을 사용한다.

## 적용 방식

하이브리드 적극 적용을 사용한다.

- Imperative API: 사이트 전역, 콘텐츠 탐색, 현재 문서 컨텍스트, 상태 토글,
  MDX 액션을 등록한다.
- Declarative API: 실제 폼이 존재하는 `ShuffleLettersDemo` 계열에
  `toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`을
  추가한다.
- 두 API 모두 progressive enhancement로 동작한다. WebMCP API가 없으면 등록,
  DOM 스캔, schema 생성을 수행하지 않는다.

## 컴포넌트 구조

새 도메인 컴포넌트는 `src/components/webmcp/` 아래에 둔다.

```text
src/components/webmcp/
├── index.ts
├── ui/webmcp-provider.tsx
├── model/use-webmcp-tools.ts
├── lib/register-tool.ts
├── lib/content-snapshot.ts
├── lib/schemas.ts
└── types/webmcp.d.ts
```

콘텐츠 검색용 인덱스는 별도 route handler로 제공한다.

```text
src/app/api/webmcp/content-index/route.ts
```

- `index.ts`: `WebMCPProvider`만 공개한다.
- `ui/webmcp-provider.tsx`: root layout에서 client-only로 마운트되는 entry point다.
- `model/use-webmcp-tools.ts`: 현재 route와 페이지 상태에 맞는 도구 목록을 만든다.
- `lib/register-tool.ts`: `navigator.modelContext.registerTool` 호출과
  `AbortController` cleanup을 감싼다.
- `lib/content-snapshot.ts`: 현재 페이지에서 안전하게 노출할 콘텐츠 정보를
  추출한다.
- `lib/schemas.ts`: JSON Schema 객체를 도구별로 중앙화한다.
- `types/webmcp.d.ts`: 실험 API 타입을 로컬로 선언한다.
- `src/app/api/webmcp/content-index/route.ts`: `find_content`가 호출될 때만
  fetch하는 작은 JSON 인덱스를 반환한다.

## 등록 생명주기

`WebMCPProvider`는 route change마다 다음 순서를 따른다.

1. 브라우저 환경인지 확인한다.
2. `navigator.modelContext`가 없으면 즉시 종료한다.
3. `requestIdleCallback`이 있으면 idle 시점에, 없으면 `setTimeout(0)` 뒤에 등록을
   시작한다.
4. 현재 route에서 필요한 도구만 등록한다.
5. route가 바뀌거나 provider가 unmount되면 `AbortController.abort()`로 이전 도구를
   해제한다.

중복 목적의 도구를 등록하지 않는다. 예를 들어 `open_content`는 내부 콘텐츠
이동만 담당하고, `find_content`는 검색 결과 반환만 담당한다.

## 도구 목록

### 전역 도구

#### `navigate_site`

홈, article, craft, shuffle playground로 내부 이동한다.

입력:

- `destination`: `"home" | "article" | "craft" | "shuffle-playground"`

출력:

- 이동한 내부 경로 문자열

#### `get_site_context`

현재 경로, 문서 제목, canonical URL, 사용 가능한 주요 영역, 현재 route에서 등록된
액션 요약을 반환한다.

입력:

- 없음

출력:

- 현재 페이지 컨텍스트 객체

#### `toggle_theme`

테마를 토글한다. 실제 UI 버튼과 같은 상태 변경 경로를 사용한다.

입력:

- 없음

출력:

- 변경 후 테마 상태

#### `set_sound`

사운드 설정을 켜거나 끈다. Zustand persist store와 동일한 상태를 갱신한다.

입력:

- `enabled`: boolean

출력:

- 변경 후 사운드 상태

#### `copy_current_url`

현재 URL을 클립보드에 복사한다.

입력:

- 없음

출력:

- 복사 성공 여부와 URL

### 콘텐츠 도구

#### `find_content`

article과 craft 인덱스에서 제목, 요약, 설명, 카테고리, 날짜, 시리즈 정보를 기준으로
콘텐츠를 찾는다.

입력:

- `query`: string
- `type`: `"all" | "article" | "craft"` 기본값 `"all"`
- `limit`: number, 1에서 10 사이

출력:

- `type`, `slug`, `title`, `summary`, `description`, `publishedAt`, `category`,
  `series`, `href`로 구성된 결과 배열

#### `open_content`

내부 article 또는 craft 상세 페이지로 이동한다.

입력:

- `type`: `"article" | "craft"`
- `slug`: string

출력:

- 이동한 내부 경로 문자열

#### `get_current_content_context`

현재 article 또는 craft 상세 페이지의 짧은 컨텍스트를 반환한다. 전체 본문 대신
제목, 날짜, TL;DR, description, 목차, 첫 문단 기반 excerpt를 사용한다.

입력:

- 없음

출력:

- 현재 콘텐츠 컨텍스트 객체

#### `open_series`

현재 글의 시리즈 이동 또는 시리즈 목록 이동을 수행한다. 시리즈 정보가 없는 글에서는
명확한 오류 문자열을 반환한다.

입력:

- `target`: `"series" | "previous" | "next"`

출력:

- 이동한 내부 경로 문자열 또는 사용 가능한 시리즈 이동 정보

### 문서와 MDX 도구

#### `jump_to_heading`

현재 문서의 heading id로 스크롤한다.

입력:

- `headingId`: string

출력:

- 스크롤한 heading 제목과 id

#### `copy_code_block`

현재 글의 특정 코드 블록 텍스트를 클립보드에 복사한다.

입력:

- `index`: number, 0부터 시작

출력:

- 복사 성공 여부, 코드 블록 언어, 글자 수

#### `list_page_actions`

현재 페이지에서 의미 있게 실행할 수 있는 WebMCP 액션 요약을 반환한다. 이 도구는
agent가 어떤 도구를 써야 할지 판단하기 위한 read-only 보조 도구다.

입력:

- 없음

출력:

- 현재 route에서 사용 가능한 액션 목록

### 플레이그라운드 도구

#### `run_shuffle_letters`

shuffle letters 데모 폼을 채우고 애니메이션을 실행한다.

입력:

- `text`: string
- `iterations`: number, 1에서 50 사이
- `fps`: number, 1에서 60 사이

출력:

- 적용된 값과 실행 상태

#### `stop_shuffle_letters`

실행 중인 shuffle letters 애니메이션을 중단한다.

입력:

- 없음

출력:

- 중단 여부

## 콘텐츠 인덱스

콘텐츠 인덱스는 전체 MDX 본문을 포함하지 않는다.

```ts
type WebMCPContentIndexItem = {
  type: 'article' | 'craft';
  slug: string;
  title: string;
  summary: string;
  description: string;
  publishedAt: string;
  category: string;
  href: string;
  series?: {
    id: string;
    name: string;
    order?: number;
  };
};
```

인덱스는 서버에서 기존 `readArticles()`, `readCraftArticles()`,
`formatArticlesForDisplay()` 계열 흐름을 재사용해 만든다. root layout이나 모든
페이지에서 인덱스를 미리 만들지 않는다. `find_content`가 실제로 실행될 때
`/api/webmcp/content-index`를 lazy fetch하고, 같은 브라우저 세션에서는 메모리에
cache한다.

## 현재 문서 스냅샷

현재 페이지의 본문 일부는 도구 실행 시점에만 DOM에서 읽는다.

- 제목: 가장 가까운 `h1` 또는 layout 제목
- TL;DR: article layout의 blockquote 텍스트
- 목차: `article` 내부 `h2`, `h4`의 id와 텍스트
- excerpt: 첫 번째 의미 있는 문단에서 최대 300자
- 코드 블록: `pre` 요소에 `data-webmcp-code-index`를 부여해 인덱스로 조회

DOM 스캔은 article/craft 상세 route에서만 수행하고, route lifecycle 동안 memoize한다.

## 성능 제약

성능은 기능보다 우선한다.

- WebMCP 미지원 브라우저에서는 feature detection 이후 즉시 반환한다.
- feature detection 전에는 DOM 스캔, schema 생성을 수행하지 않는다.
- 콘텐츠 인덱스는 페이지 로드 중 만들지 않고, `find_content` 실행 시에만 fetch한다.
- provider는 client-only dynamic import로 분리해 기본 서버 렌더링 경로를
  건드리지 않는다.
- 첫 등록은 idle 시점으로 미룬다.
- observer, interval, scroll listener를 추가하지 않는다.
- heading과 code block 스캔은 상세 route에서만 한 번 수행한다.
- 도구 실행 함수 안에서만 DOM 변경, 클립보드, 스크롤, 토글을 수행한다.
- 콘텐츠 인덱스에는 전체 본문을 넣지 않는다.
- 등록된 도구 수는 현재 route에 필요한 것으로 제한한다.

## 보안과 권한

- `Permissions-Policy`에는 WebMCP 도구가 같은 origin에서만 동작한다는 의도를
  명시한다. WebMCP의 기본 정책은 self지만, `tools=(self)`를 추가해 설정을
  문서화한다.
- `next.config.mjs`의 기존 camera, microphone, geolocation 차단은 유지한다.
- cross-origin iframe에 `allow="tools"`를 추가하지 않는다.
- 외부 링크는 도구가 자동으로 열지 않는다.
- 클립보드 작업이 실패하면 에러를 반환하고 UI를 변경하지 않는다.
- 도구 입력은 JSON Schema와 handler 내부 검증을 함께 적용한다.

## 오류 처리

- WebMCP API가 없거나 예상 signature와 다르면 조용히 비활성화한다.
- 잘못된 slug, heading id, code block index는 구조화된 오류 문자열을 반환한다.
- `iterations`, `fps`, `limit`이 허용 범위를 벗어나면 실행하지 않고 재시도 가능한
  오류를 반환한다.
- 현재 route에서 사용할 수 없는 도구가 호출되면 가능한 액션 목록을 함께 반환한다.
- 내부 이동은 Next router를 사용한다. 실패하면 목적 경로를 포함한 오류를 반환한다.

## 테스트 전략

Unit test:

- `register-tool` helper가 mock `navigator.modelContext`에 도구를 등록하고
  cleanup에서 abort하는지 검증한다.
- 콘텐츠 인덱스 route가 article과 craft를 구분하고 전체 MDX 본문을 포함하지 않는지
  검증한다.
- `find_content`, `open_content`, `get_current_content_context`,
  `run_shuffle_letters` handler를 mock DOM과 mock router로 검증한다.
- 범위 밖 입력과 없는 slug, 없는 heading, 없는 code block index의 오류 메시지를
  검증한다.

Static verification:

- `pnpm check-types`
- `pnpm lint`
- 필요한 경우 `pnpm test:unit`

Manual QA:

- Chrome에서 `chrome://flags/#enable-webmcp-testing` 활성화
- Model Context Tool Inspector Extension으로 route별 도구 등록 확인
- 홈, article 목록, article 상세, craft 목록, craft 상세, shuffle playground에서
  사용 가능한 도구가 겹치지 않는지 확인
- WebMCP 미지원 브라우저에서 콘솔 오류와 UI 변화가 없는지 확인

## 구현 순서

1. WebMCP 타입, schema, registration helper를 만든다.
2. 콘텐츠 인덱스 route와 provider entry point를 만든다.
3. root layout에 client-only provider를 연결한다.
4. 전역 도구를 등록한다.
5. 콘텐츠 검색과 내부 이동 도구를 등록한다.
6. 현재 문서 컨텍스트, heading 이동, code copy 도구를 등록한다.
7. ShuffleLettersDemo에 declarative 속성과 imperative handler를 연결한다.
8. next config의 `Permissions-Policy`에 `tools=(self)`를 명시한다.
9. unit test와 수동 QA 체크리스트를 추가한다.

## 참고 자료

- [WebMCP overview](https://developer.chrome.com/docs/ai/webmcp)
- [WebMCP Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [WebMCP Declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api)
- [WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals)
