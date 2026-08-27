# TOC 다중 활성화와 연속 계층형 레일 — 완료 (2026-08-27)

- 상태: 완료
- PR: [#140](https://github.com/jaem1n207/bendd/pull/140)
- 범위: 상세 페이지 데스크톱 TOC의 활성화 규칙, 계층형 레일, 애니메이션, 문서 및 회귀 테스트

## 목표

1. 현재 뷰포트에 보이는 모든 헤더를 동시에 활성화한다.
2. 헤더가 보이지 않아도 기존 activation line을 지난 현재 섹션은 유지한다.
3. 보이는 헤더가 없을 때는 기존 현재-섹션 fallback을 유지한다.
4. 헤더 깊이와 활성 범위를 하나의 연속된 레일로 표현한다.
5. 활성 범위가 위·아래로 바뀔 때 끊기지 않고 현재 위치에서 이어서 움직인다.
6. 뒤로가기 링크, `On this page`, TOC 레일을 하나의 외곽선으로 묶지 않는다.

## 사용자 경험 계약

- 활성 링크 집합은 문서 순서를 유지한다.
- 뷰포트에 보이는 헤더는 모두 활성화한다.
- 스크롤이 시작된 뒤 activation line 위의 마지막 헤더를 carried section으로 추가한다.
- 페이지 끝에서는 마지막 헤더를 활성 집합에 포함한다.
- base rail과 active rail은 동일한 SVG path를 공유한다.
- 동일 깊이 항목도 레일로 계속 연결한다.
- active rail은 첫 번째·마지막 활성 행 사이만 노출한다.
- `prefers-reduced-motion: reduce`에서는 레일 이동 transition을 제거한다.

## 실행 계획과 결과

| 단계            | 계획                                                   | 결과                                                                                         |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 활성화 모델     | 단일 hash를 문서 순서가 보존된 활성 링크 집합으로 전환 | `getActiveHeaderLinks()`가 visible, carried, page-bottom 규칙을 결합                         |
| TOC 구조        | 렌더 트리를 평탄화하고 각 링크에 시각적 depth 제공     | `flattenMenuItems()`와 `data-toc-depth`로 의미 구조와 SVG geometry 연결                      |
| 레일 렌더링     | 행별 SVG 대신 base/active가 공유하는 하나의 path 사용  | 동일 깊이 직선과 깊이 전환 곡선이 끊기지 않는 단조 증가 path 생성                            |
| 활성 애니메이션 | path를 다시 그리지 않고 노출 범위만 이동               | 상·하단 CSS inset을 독립 갱신하고 `clip-path`를 240ms로 보간                                 |
| 레이아웃 대응   | 스크롤과 geometry 측정을 분리                          | 스크롤은 CSS 변수만 갱신하고, `ResizeObserver`는 행 크기 변경 시에만 path 재측정             |
| 시각 보정       | 깊이 전환 곡선이 텍스트 영역을 침범하지 않게 조정      | 곡선을 행 경계 `-6px ~ +6px` 안에서 완료하고 모든 depth의 레일–텍스트 간격을 `11.5px`로 고정 |
| lifecycle       | 지연 callback이 unmount 이후 실행되지 않게 정리        | throttle·trailing timeout, 초기 rAF, `ResizeObserver` cleanup을 회귀 테스트로 고정           |

## 데이터 흐름

```text
본문 h2/h4
  → 헤더 위치 측정
  → visible + carried + bottom 규칙
  → 링크 data-active 갱신
  → 첫/마지막 활성 행의 CSS inset 갱신
  → 공유 SVG path의 active 구간만 clip

TOC 트리
  → 문서 순서로 flatten
  → 렌더된 링크 행 측정
  → depth-aware 연속 SVG path 생성
  → base/active rail이 동일 path 공유
```

## 기술적 결정

| 결정          | 선택                                    | 거부한 대안                         | 이유                                                                    |
| ------------- | --------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| 활성 상태     | 여러 링크를 동시에 활성화               | 현재 섹션 한 개만 활성화            | 화면에 동시에 보이는 문서 구조를 표현하지 못함                          |
| 레일 구조     | 하나의 연속 SVG path                    | 행별 SVG stroke                     | 활성 항목마다 stroke가 다시 시작되어 선과 애니메이션이 끊겨 보임        |
| 활성 구간     | CSS `clip-path` 상·하단 inset           | path 재생성 또는 `stroke-dasharray` | geometry를 유지하면서 양 끝을 독립적으로 움직이고 진행 중 retarget 가능 |
| 레이아웃 측정 | `useLayoutEffect` + `ResizeObserver`    | 스크롤마다 path 재측정              | 줄바꿈·폰트·viewport 변화는 반영하면서 스크롤 비용을 억제               |
| 초기 상태     | 첫 CSS 변수 동기화 후 transition 활성화 | 첫 렌더부터 transition              | 초기 위치에서 활성 범위까지 불필요하게 이동하는 flash 방지              |
| 깊이 전환     | 행 경계의 상·하 padding에서 곡선 완료   | 새 행 내부에서 18px 동안 전환       | 곡선이 텍스트 옆으로 접근해 depth별 간격이 달라 보임                    |
| DOM 링크 조회 | 활성 집합 변경 시 live query            | static `NodeList` 캐시              | React 리렌더 뒤 stale 노드가 남아 하이라이트가 누적될 수 있음           |

## 발생한 문제와 해결

### 1. 한 화면의 여러 헤더 중 하나만 활성화됨

단일 현재 hash만 저장하던 모델을 활성 링크 배열로 바꿨다. 각 헤더의 실제
viewport 교차 여부를 확인하고, 기존 activation line을 지난 마지막 헤더를
carried section으로 합쳤다. 보이는 헤더가 없을 때도 carried section이 기존
fallback 역할을 한다.

### 2. 레퍼런스의 외곽선을 그대로 따라 뒤로가기 영역까지 연결됨

요구사항은 TOC 내부의 계층형 레일이었고, 뒤로가기·섹션 제목까지 연결하는
외곽선은 정보 계층을 흐렸다. `On this page` 제목을 별도 블록으로 유지하고
레일은 TOC 목록 내부에서만 시작하도록 범위를 축소했다.

### 3. “일자로 연결된 선 제거”를 동일 깊이 연결 제거로 잘못 해석함

제거 대상은 외곽선이었지 동일 깊이 항목의 연결선이 아니었다. 동일 깊이 행은
수직선으로 계속 연결하고, depth가 바뀌는 경계에서만 곡선을 추가하는 하나의
path로 복원했다.

### 4. 행별 active stroke가 뚝뚝 끊기고 방향 전환 시 점프함

행마다 별도 stroke 애니메이션을 시작하면 각 선의 시작점과 진행률이 달라진다.
base와 active가 같은 path를 공유하도록 바꾸고, 첫·마지막 활성 행에서 계산한
두 inset만 transition했다. 브라우저가 현재 보간값에서 새 CSS 변수 값으로
이어가므로 빠른 위·아래 방향 전환도 현재 위치에서 계속된다.

### 5. 초기 렌더와 cleanup에서 불필요한 움직임과 지연 실행이 남음

초기 active inset을 먼저 동기화한 뒤 다음 rAF에서
`data-toc-rail-ready="true"`를 설정했다. unmount에서는 초기 rAF,
throttle timeout, trailing debounce timeout, `ResizeObserver`를 모두 정리했다.

### 6. 깊이 전환 곡선과 텍스트의 간격이 항목마다 달라 보임

기존 곡선은 새 행의 `top`에서 시작해 `top + 18px`까지 이동했다. 링크 텍스트는
`py-1.5` 때문에 `top + 6px`에서 시작하므로 곡선이 텍스트 영역을 12px 침범했다.
곡선을 `top - 6px`에서 시작해 `top + 6px`에서 끝내고, 그 시점부터 현재
depth의 수직 레일이 되도록 수정했다. depth 0/1/2에서 측정한 레일–텍스트
간격은 모두 `11.5px`다.

## 회귀 방지

| 테스트                       | 보호하는 계약                                                                |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `use-toc.spec.ts`            | visible + carried + fallback, bottom 처리, live DOM 조회, callback cleanup   |
| `toc-tree.spec.ts`           | 문서 순서 flatten, depth별 들여쓰기, 텍스트 시작 전 완료되는 연속 path       |
| `toc-rail.spec.tsx`          | base/active path 공유, 행 추가·resize 재측정, observer cleanup               |
| `table-of-contents.spec.tsx` | 유효한 목록 구조와 depth-to-rail wiring                                      |
| `toc-sidebar.spec.ts`        | 실제 브라우저 다중 활성화, 중간 보간, 방향 전환, reduced motion, 외곽선 제거 |

## 유지보수 제약

- 링크의 `py-1.5` 또는 rail depth step/padding을 바꾸면
  `toc-tree.spec.ts`의 geometry와 레일–텍스트 간격을 함께 검토한다.
- 스크롤 경로에서 React state나 SVG path를 갱신하지 않는다.
- 동일 깊이 항목의 연결선을 제거하지 않는다.
- base와 active rail을 서로 다른 path로 분리하지 않는다.
- `IntersectionObserver`로 교체하지 않는다. 이 프로젝트는 기존 스크롤 기반
  activation line과의 호환성을 유지한다.
