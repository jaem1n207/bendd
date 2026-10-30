import { describe, expect, it } from 'vitest';

import { MDXCodeWalkthrough } from '@/mdx/components/code-walkthrough/code-walkthrough';

const step = {
  title: '호출',
  code: 'save();',
  annotations: [{ title: '저장하기', description: '저장을 실행해요.' }],
};

describe('MDX code walkthrough validation', () => {
  it('accepts a walkthrough without optional focus or metadata', () => {
    expect(() =>
      MDXCodeWalkthrough({ lang: 'ts', steps: [step] })
    ).not.toThrow();
  });

  it('rejects empty steps and invalid focus ranges with an authoring error', () => {
    expect(() => MDXCodeWalkthrough({ lang: 'ts', steps: [] })).toThrow(
      '[Walkthrough Error]'
    );
    expect(() =>
      MDXCodeWalkthrough({
        lang: 'ts',
        steps: [{ ...step, annotations: [] }],
      })
    ).toThrow('[Walkthrough Error]');
    expect(() =>
      MDXCodeWalkthrough({
        lang: 'ts',
        steps: [
          {
            ...step,
            annotations: [
              { ...step.annotations[0], focus: [{ startLine: 2, endLine: 1 }] },
            ],
          },
        ],
      })
    ).toThrow('endLine must not precede startLine');
  });
});
