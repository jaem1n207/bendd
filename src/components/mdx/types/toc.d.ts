export type MenuItem = {
  /**
   * `1` to `6` 사이의 숫자로 헤딩 레벨을 지정합니다.
   */
  level: HeadingLevel;
  /**
   * 헤딩의 내용입니다.
   */
  title: string;
  /**
   * 헤딩 요소입니다.
   */
  element: HTMLHeadingElement;
  /**
   * 헤딩의 링크입니다.
   */
  link: string;
  /**
   * 하위 메뉴입니다.
   */
  children?: MenuItem[];
};

/**
 * TOC에 표시할 레벨을 지정합니다.
 *
 * 단일 숫자를 입력하면 해당 레벨만 표시합니다.
 *
 * 튜플을 입력하면 첫 번째 숫자가 최소 레벨, 두 번째 숫자가 최대 레벨로 사용됩니다.
 *
 * @default [2,6]
 */
export type LevelRange = HeadingLevel | [HeadingLevel, HeadingLevel];

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
