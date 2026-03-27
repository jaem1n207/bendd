# Google Sitelinks SEO 개선 — 완료 (2026-03-27)

## 개요

Google 검색에서 Sitelinks가 표시되지 않는 문제를 해결하기 위해 JSON-LD 구조화 데이터 5종을 6개 파일에 추가.

## 문제 정의

- **증상**: `bendd` 검색 시 메인 페이지만 표시되고 하위 페이지 Sitelinks 미노출
- **비교**: jbee.io는 Brand, Articles 등 하위 페이지가 Sitelinks로 자동 추천
- **원인**: BlogPosting 스키마만 존재하여 사이트 계층 구조 정보가 Google에 전달되지 않음

## 기술 결정

| 결정              | 선택                  | 대안                        | 대안 거부 이유                                                        |
| ----------------- | --------------------- | --------------------------- | --------------------------------------------------------------------- |
| 홈페이지 title    | `title.absolute` 사용 | 일반 `title` string         | layout template `%s • 이재민`과 충돌하여 title 중복 발생              |
| SearchAction      | 미포함                | WebSite에 SearchAction 추가 | 현재 검색 기능 미구현                                                 |
| JsonLdScript 헬퍼 | 미생성                | 공용 컴포넌트 추출          | 3줄 패턴에 대한 과도한 추상화                                         |
| XSS 이스케이프    | 미적용                | `replace(/</g, '\\u003c')`  | 데이터 소스가 모두 신뢰 가능 (하드코딩 상수 + Zod 검증된 frontmatter) |
| series position   | `article.order`       | `index + 1`                 | seriesOrder와 index가 다를 수 있으므로 의미적 정확성 우선             |

## 파일 변경 맵

| 커밋    | 파일                                   | 변경 내용                                     |
| ------- | -------------------------------------- | --------------------------------------------- |
| 52b09ed | `src/app/layout.tsx`                   | WebSite JSON-LD (사이트 identity + publisher) |
| 52b09ed | `src/app/page.tsx`                     | Person JSON-LD + 명시적 metadata export       |
| 85d09b0 | `src/components/layout/mdx.tsx`        | BreadcrumbList JSON-LD (홈→카테고리→글)       |
| 9897689 | `src/app/article/page.tsx`             | CollectionPage + ItemList JSON-LD             |
| 9897689 | `src/app/craft/page.tsx`               | CollectionPage + ItemList JSON-LD             |
| 9897689 | `src/app/article/series/[id]/page.tsx` | CollectionPage + ItemList JSON-LD             |
| af8ecc3 | `src/app/article/series/[id]/page.tsx` | position: index+1 → article.order             |
| af2785c | `src/app/page.tsx`                     | 메타데이터/Person 설명 문구 개선              |

## 미적용 개선 사항

- SearchAction 스키마: 검색 기능 구현 시 추가
- JsonLdScript 공용 컴포넌트: 사용처 증가 시 재고
- JSON.stringify 이스케이프: 외부 입력 수용 시 재고

## 테스트 현황

| 항목                       | 상태                                     |
| -------------------------- | ---------------------------------------- |
| TypeScript 타입체크        | 통과                                     |
| 프로덕션 빌드 (28 pages)   | 성공                                     |
| 기존 유닛 테스트 (104/105) | typography.spec.tsx 1건 기존 실패 (무관) |
| Rich Results Test          | 프로덕션 배포 후 확인 필요               |
