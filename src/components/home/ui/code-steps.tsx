import { codeToTokens } from 'shiki';
import { toKeyedTokens } from 'shiki-magic-move/core';

import type { CodeAnnotation } from '@/components/home/lib/code-walkthrough';
import { CodeStepsDemo } from '@/components/home/ui/code-steps-demo';

const examples: {
  title: string;
  code: string;
  annotations: CodeAnnotation[];
}[] = [
  {
    title: '클릭에서 시작',
    code: `function saveNote() {
  save();
}`,
    annotations: [
      {
        title: '동작에 이름을 붙입니다',
        description:
          '저장 버튼이 할 일을 하나의 함수로 묶습니다. 이름만으로도 어떤 동작인지 알 수 있습니다.',
        focus: [{ startLine: 1, startColumn: 10, endColumn: 17 }],
      },
      {
        title: '저장을 실행합니다',
        description:
          '함수가 호출되면 저장을 시작합니다. 아직은 작업이 끝나는 시점까지 기다리지 않습니다.',
        focus: [{ startLine: 2 }],
      },
    ],
  },
  {
    title: '완료를 기다리고',
    code: `async function saveNote() {
  await save();
}`,
    annotations: [
      {
        title: '기다릴 수 있게 만듭니다',
        description:
          'async를 붙여 비동기 작업을 다룹니다. 함수 안에서 저장이 끝나는 시점을 기다릴 수 있습니다.',
        focus: [{ startLine: 1, startColumn: 1, endColumn: 5 }],
      },
      {
        title: '끝난 다음으로 이어갑니다',
        description:
          'await 뒤의 작업이 끝나야 다음 줄로 넘어갑니다. 시작과 완료를 구분할 수 있게 됩니다.',
        focus: [{ startLine: 2 }],
      },
    ],
  },
  {
    title: '상태를 전합니다',
    code: `async function saveNote() {
  setStatus('saving');

  try {
    await save();
    setStatus('saved');
  } catch {
    setStatus('error');
  }
}`,
    annotations: [
      {
        title: '먼저 반응을 보여줍니다',
        description:
          '저장에 앞서 진행 상태를 바꿉니다. 사용자는 클릭이 전달됐다는 신호를 바로 받을 수 있습니다.',
        focus: [{ startLine: 2 }],
      },
      {
        title: '기다리는 동안에도 명확하게',
        description:
          '저장이 진행되는 동안에는 같은 상태를 유지합니다. 시간이 걸리는 이유를 화면으로 전할 수 있습니다.',
        focus: [{ startLine: 5 }],
      },
      {
        title: '완료를 확실하게 알립니다',
        description:
          '저장이 성공한 뒤에만 완료 상태로 바꿉니다. 사용자는 결과를 확인하고 다음 행동으로 이어갈 수 있습니다.',
        focus: [{ startLine: 6 }],
      },
      {
        title: '실패도 이해할 수 있게',
        description:
          '오류가 나면 별도의 상태를 전합니다. 저장되지 않았다는 사실도 사용자가 이해할 수 있는 피드백이 됩니다.',
        focus: [{ startLine: 7, endLine: 8 }],
      },
    ],
  },
];

export async function CodeSteps() {
  // Compile on the server so this small home demo does not load Shiki or WASM.
  const steps = await Promise.all(
    examples.map(async example => {
      const result = await codeToTokens(example.code, {
        lang: 'typescript',
        theme: 'github-light',
      });
      const tokens = toKeyedTokens(
        example.code,
        result.tokens.map(line =>
          line.map(token => ({
            content: token.content,
            offset: token.offset,
            color: 'hsl(var(--foreground))',
          }))
        )
      );

      return { title: example.title, annotations: example.annotations, tokens };
    })
  );

  return <CodeStepsDemo steps={steps} />;
}
