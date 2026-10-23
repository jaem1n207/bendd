# Arc식 탭 전환 글의 도식

`diagram-design` 스킬(v2.6.119)의 문서 삽입용 크기(`960 × 600`)와 정적 HTML/SVG 형식을 사용했다. 블로그의 검정·회색과 Pretendard로 맞추기로 한 선택을 이 글의 도식에 적용했다.

## 원본과 본문 이미지

| 원본 HTML                 | 본문 SVG                                                                    | 보여주는 내용                                                     |
| ------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `architecture.html`       | `public/images/bringing-arc-tab-switching-to-chrome/architecture.svg`       | 앱·Native Host·확장의 역할과 메시지 방향                          |
| `latest-intent.html`      | `public/images/bringing-arc-tab-switching-to-chrome/latest-intent.svg`      | B 응답을 기다리는 동안 A→B→A 선택이 이어지는 순서                 |
| `preview-validation.html` | `public/images/bringing-arc-tab-switching-to-chrome/preview-validation.svg` | 캡처·축소 완료 후 상태를 확인하고 이미지를 저장하거나 버리는 분기 |

색상은 `src/globals.css`의 밝은 테마를 바탕으로 한다. 주요 상자는 primary, 배경은 background/muted, 글자는 foreground/muted-foreground를 쓴다. 연결선과 필수 경계는 작은 크기에서도 구분되도록 회색을 더 진하게 조정했다.

`generate.mjs`가 문구·배치의 편집 원본이다. HTML은 CSS와 SVG를 포함하며 스크립트나 외부 리소스 없이 열린다. Pretendard와 코드용 Fira Mono를 프로젝트의 실제 폰트 파일에서 읽어 글리프 경로로 변환했다. 외부 폰트 요청이나 기기별 대체 폰트에 의존하지 않는다. SVG의 title·desc와 본문의 alt에 내용 설명을 남겼고, `*.labels.json`에는 원문과 글자 위치를 기록했다.

## 생략한 내용

- 구조도는 프로세스 역할과 연결만 보여준다. 프로필이 여러 개일 때 같은 형태로 반복되는 Host·확장은 하나로 묶었다. 클래스, 메시지 포맷, 소켓 권한 등 세부 사항은 생략했다.
- 시퀀스는 요청 1개와 마지막 대기 목적지 1개를 보여준다. 연결 세대·요청 순번 검증, 실패·취소 분기는 본문에 남겼다. 세로 간격은 실제 지연 시간을 뜻하지 않는다.
- 캡처 흐름도는 두 번의 상태 대조에 집중한다. 캡처 불가 페이지, 이미지가 없을 때의 제목·아이콘 표시는 본문에서 설명한다.

## 다시 생성하기

새 의존성을 추가하지 않았다. `pnpm build`로 생성된 Fira Mono와 기존 `@napi-rs/canvas` 설치가 필요하다. 아래 모듈 경로는 실행 환경에 맞게 지정한다.

```sh
DIAGRAM_CANVAS_MODULE=/absolute/path/to/@napi-rs/canvas/index.js \
  node docs/diagrams/bringing-arc-tab-switching-to-chrome/generate.mjs
```

설치된 diagram-design 스킬의 `scripts/self_check.py --offline`으로 HTML을 검사하고, `scripts/export_svg.py --system-fonts`로 SVG를 추출한다. 여기서 `--system-fonts`는 기본 Google Fonts 요청을 넣지 않는 옵션이며, 글자는 이미 실제 폰트의 경로로 저장되어 있다.

검수에서는 세 HTML의 오프라인·접근성·viewBox 검사를 통과했고, 생성 시 글자 너비와 라벨·노드 간 겹침을 검사했다. 추출한 SVG 세 장을 960×600 PNG로 변환해 글꼴, 연결선, 문구, 여백을 확인했다. 글 페이지의 브라우저 렌더링 검증과는 구분한다.
