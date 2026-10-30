import type { KeyedTokensInfo } from 'shiki-magic-move/core';

export const WALKTHROUGH_SCROLL_DISTANCE = 360;
export const CODE_MOVE_DURATION_MS = 650;
export const CODE_MOVE_EASING = 'cubic-bezier(0.645, 0.045, 0.355, 1)';
const SCROLL_BOUNDARY_MARGIN = 24;

/** Lines and optional columns are one-based and inclusive. */
export interface CodeFocusRange {
  startLine: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
}

export interface CodeAnnotation {
  title: string;
  description: string;
  focus: CodeFocusRange[];
}

export interface CodeStep {
  title: string;
  tokens: KeyedTokensInfo;
  annotations: CodeAnnotation[];
}

export interface CodeStop {
  stepIndex: number;
  annotationIndex: number;
}

export interface FocusSegment {
  text: string;
  focused: boolean;
}

export function getCodeStops(steps: CodeStep[]): CodeStop[] {
  return steps.flatMap((step, stepIndex) =>
    step.annotations.map((_, annotationIndex) => ({
      stepIndex,
      annotationIndex,
    }))
  );
}

export function getScrollStop(
  scrollTop: number,
  current: number,
  count: number
) {
  const position = Math.max(0, scrollTop) / WALKTHROUGH_SCROLL_DISTANCE;
  const next = Math.min(Math.max(0, count - 1), Math.round(position));
  if (next === current) {
    return current;
  }

  // A small dead band prevents trackpad jitter from flipping the same boundary.
  const boundary =
    (current + (next > current ? 0.5 : -0.5)) * WALKTHROUGH_SCROLL_DISTANCE;
  if (
    Math.abs(next - current) === 1 &&
    Math.abs(scrollTop - boundary) < SCROLL_BOUNDARY_MARGIN
  ) {
    return current;
  }
  return next;
}

export function getCodeFocus(code: string, ranges: CodeFocusRange[]) {
  return code.split('\n').map((text, index) => {
    const line = index + 1;
    const focused = Array.from({ length: text.length }, () => false);

    for (const range of ranges) {
      const endLine = range.endLine ?? range.startLine;
      if (line < range.startLine || line > endLine) {
        continue;
      }
      const start =
        line === range.startLine
          ? Math.max(0, (range.startColumn ?? 1) - 1)
          : 0;
      const end =
        line === endLine
          ? Math.min(text.length, range.endColumn ?? text.length)
          : text.length;
      for (let column = start; column < end; column++) {
        focused[column] = true;
      }
    }

    const segments: FocusSegment[] = [];
    for (let column = 0; column < text.length; column++) {
      const previous = segments[segments.length - 1];
      if (previous?.focused === focused[column]) {
        previous.text += text[column];
      } else {
        segments.push({ text: text[column], focused: focused[column] });
      }
    }

    return { line, text, segments, focused: focused.some(Boolean) };
  });
}

export function getFocusLabel(ranges: CodeFocusRange[]) {
  return ranges
    .map(range =>
      range.endLine && range.endLine !== range.startLine
        ? `${range.startLine}–${range.endLine}행`
        : `${range.startLine}행`
    )
    .join(', ');
}
