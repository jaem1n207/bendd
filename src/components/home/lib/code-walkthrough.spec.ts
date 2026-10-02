import { describe, expect, test } from 'vitest';

import {
  getCodeFocus,
  getScrollStop,
} from '@/components/home/lib/code-walkthrough';

describe('code walkthrough focus', () => {
  const code = 'async function saveNote() {\n  await save();\n}';

  test('highlights a selected token without changing the surrounding code', () => {
    const lines = getCodeFocus(code, [
      { startLine: 1, startColumn: 1, endColumn: 5 },
    ]);
    expect(lines.map(line => line.text).join('\n')).toBe(code);
    expect(lines[0].segments).toEqual([
      { text: 'async', focused: true },
      { text: ' function saveNote() {', focused: false },
    ]);
    expect(lines.filter(line => line.focused).map(line => line.line)).toEqual([
      1,
    ]);
  });

  test('merges overlapping ranges and preserves blank lines and whitespace', () => {
    const lines = getCodeFocus('abcd\n\n  ef\n', [
      { startLine: 1, endLine: 3, startColumn: 2, endColumn: 3 },
      { startLine: 1, startColumn: 3, endColumn: 4 },
    ]);
    expect(lines[0].segments).toEqual([
      { text: 'a', focused: false },
      { text: 'bcd', focused: true },
    ]);
    expect(lines[2].segments).toEqual([
      { text: '  e', focused: true },
      { text: 'f', focused: false },
    ]);
    expect(lines.map(line => line.text).join('\n')).toBe('abcd\n\n  ef\n');
  });

  test('does not dim a file when no range points to real code', () => {
    const lines = getCodeFocus(code, [{ startLine: 20 }]);
    expect(lines.some(line => line.focused)).toBe(false);
  });
});

describe('contained walkthrough scroll', () => {
  test('holds a boundary through small forward and reverse trackpad movements', () => {
    expect(getScrollStop(190, 0, 8)).toBe(0);
    expect(getScrollStop(205, 0, 8)).toBe(1);
    expect(getScrollStop(175, 1, 8)).toBe(1);
    expect(getScrollStop(155, 1, 8)).toBe(0);
  });

  test('clamps both ends and lets a large scroll land directly on its final stop', () => {
    expect(getScrollStop(-100, 0, 8)).toBe(0);
    expect(getScrollStop(10000, 7, 8)).toBe(7);
    expect(getScrollStop(1440, 0, 8)).toBe(4);
    expect(getScrollStop(0, 7, 8)).toBe(0);
  });
});
