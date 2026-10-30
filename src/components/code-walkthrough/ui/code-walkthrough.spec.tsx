import { describe, expect, it } from 'vitest';

import { CodeWalkthrough } from '@/components/code-walkthrough';

const steps = [
  {
    title: '기다리기',
    code: 'await save();',
    annotations: [{ title: '완료', description: '저장을 기다려요.' }],
  },
];

describe('server code walkthrough', () => {
  it('prepares language aliases, file metadata and optional focus for the viewer', async () => {
    const result = await CodeWalkthrough({
      steps,
      lang: 'ts',
      filename: 'example.ts',
      label: '저장 흐름',
    });
    expect(result.props).toMatchObject({
      filename: 'example.ts',
      language: 'TypeScript',
      label: '저장 흐름',
      steps: [
        { annotations: [{ focus: [] }], tokens: { code: 'await save();' } },
      ],
    });
    expect(result.props.steps[0].tokens.tokens.length).toBeGreaterThan(1);
  });

  it('rejects unsupported languages and empty navigation before rendering', async () => {
    await expect(
      CodeWalkthrough({ steps, lang: 'invalid-language' })
    ).rejects.toThrow('Unsupported CodeWalkthrough language');
    await expect(CodeWalkthrough({ steps: [], lang: 'ts' })).rejects.toThrow(
      'requires steps'
    );
    await expect(
      CodeWalkthrough({ steps: [{ ...steps[0], annotations: [] }], lang: 'ts' })
    ).rejects.toThrow('at least one annotation');
  });
});
