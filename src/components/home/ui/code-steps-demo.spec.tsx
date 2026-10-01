import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { toKeyedTokens, type KeyedTokensInfo } from 'shiki-magic-move/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeStepsDemo } from '@/components/home/ui/code-steps-demo';

const rendererLifecycle = vi.hoisted(() => {
  const callbacks: { start?: () => void; end?: () => void } = {};
  return callbacks;
});

vi.mock('shiki-magic-move/react', () => ({
  ShikiMagicMoveRenderer: ({
    tokens,
    animate,
    onStart,
    onEnd,
  }: {
    tokens: KeyedTokensInfo;
    animate?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
  }) => {
    const hasSeeded = useRef(false);
    useEffect(() => {
      // The library completes its first, non-animated seed frame immediately.
      if (animate && !hasSeeded.current) {
        hasSeeded.current = true;
        onEnd?.();
      }
    }, [animate, onEnd]);
    rendererLifecycle.start = onStart;
    rendererLifecycle.end = onEnd;
    return (
      <pre data-testid="step-code" data-animate={animate}>
        {tokens.code}
      </pre>
    );
  },
}));

const steps = [
  { title: '입력', description: '입력을 받습니다.', code: 'save();' },
  { title: '대기', description: '완료를 기다립니다.', code: 'await save();' },
  {
    title: '완료',
    description: '결과를 알립니다.',
    code: "setStatus('saved');",
  },
].map(step => ({
  ...step,
  tokens: toKeyedTokens(step.code, [[{ content: step.code, offset: 0 }]]),
  annotations: [
    {
      title: step.title,
      description: step.description,
      focus: [{ startLine: 1 }],
    },
  ],
}));

let reducedMotion = false;
const subscribers = new Set<() => void>();

beforeEach(() => {
  vi.useFakeTimers();
  rendererLifecycle.start = undefined;
  rendererLifecycle.end = undefined;
  reducedMotion = false;
  subscribers.clear();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reducedMotion;
    },
    addEventListener: (_: string, listener: () => void) =>
      subscribers.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      subscribers.delete(listener),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const next = (detail = 1) =>
  fireEvent.click(screen.getByRole('button', { name: '다음 설명' }), {
    detail,
  });

describe('home code walkthrough', () => {
  it('starts both growing and shrinking when the code starts moving', () => {
    const longCode =
      "async function saveNote() {\n  setStatus('saving');\n  try {\n    await save();\n    setStatus('saved');\n  } catch {\n    setStatus('error');\n  }\n}";
    const sizedSteps = [
      steps[0],
      {
        ...steps[1],
        tokens: toKeyedTokens(longCode, [[{ content: longCode, offset: 0 }]]),
      },
    ];
    render(<CodeStepsDemo steps={sizedSteps} />);
    const viewport = screen.getByRole('region', {
      name: '스크롤로 읽는 코드 설명',
    });

    next();
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('1');
    expect(screen.getByTestId('step-code').textContent).toBe(steps[0].code);
    act(() => vi.advanceTimersByTime(320));
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('1');
    act(() => rendererLifecycle.start?.());
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('9');
    act(() => rendererLifecycle.end?.());
    expect(screen.getByTestId('step-code').textContent).toBe(longCode);

    fireEvent.click(screen.getByRole('button', { name: '이전 설명' }), {
      detail: 1,
    });
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('9');
    act(() => vi.advanceTimersByTime(320));
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('9');
    act(() => rendererLifecycle.start?.());
    expect(screen.getByTestId('step-code').textContent).toBe(steps[0].code);
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('1');
    act(() => rendererLifecycle.end?.());
    expect(viewport.style.getPropertyValue('--code-line-count')).toBe('1');
  });

  it('changes focus without replacing or replaying code within the same step', () => {
    const annotated = steps.map(step => ({
      ...step,
      annotations: [
        {
          title: '호출 이름',
          description: '이름을 읽습니다.',
          focus: [{ startLine: 1 }],
        },
        {
          title: '일부 토큰',
          description: '필요한 부분만 읽습니다.',
          focus: [{ startLine: 1, startColumn: 2, endColumn: 4 }],
        },
      ],
    }));
    const view = render(<CodeStepsDemo steps={annotated} />);
    const code = screen.getByTestId('step-code');
    next();
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByTestId('step-code')).toBe(code);
    expect(code.textContent).toBe(steps[0].code);
    expect(
      screen
        .getByRole('button', { name: '1단계: 입력' })
        .getAttribute('aria-current')
    ).toBe('step');
    const focused = view.container.querySelectorAll(
      '[data-active="true"] [data-focused-code="true"]'
    );
    expect([...focused].map(element => element.textContent).join('')).toBe(
      'ave'
    );
  });

  it('uses native scroll position to select the latest explanation in either direction', () => {
    render(<CodeStepsDemo steps={steps} />);
    const viewport = screen.getByRole('region', {
      name: '스크롤로 읽는 코드 설명',
    });
    viewport.scrollTop = 720;
    fireEvent.scroll(viewport);
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
    viewport.scrollTop = 360;
    fireEvent.scroll(viewport);
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
    fireEvent.click(screen.getByRole('button', { name: '1단계: 입력' }));
    expect(viewport.scrollTop).toBe(0);
  });

  it('consumes navigation keys at both ends without trapping Tab', () => {
    render(<CodeStepsDemo steps={steps} />);
    const viewport = screen.getByRole('region', {
      name: '스크롤로 읽는 코드 설명',
    });
    expect(fireEvent.keyDown(viewport, { key: 'ArrowUp' })).toBe(false);
    expect(viewport.scrollTop).toBe(0);
    fireEvent.keyDown(viewport, { key: 'End' });
    expect(viewport.scrollTop).toBe(720);
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
    expect(fireEvent.keyDown(viewport, { key: 'ArrowDown' })).toBe(false);
    expect(fireEvent.keyDown(viewport, { key: 'Tab' })).toBe(true);
  });

  it('keeps the current code while advancing through explanations within one step', () => {
    const detailedSteps = steps.map(step => ({
      ...step,
      annotations: [
        {
          title: `${step.title}의 첫 부분`,
          description: '함수의 시작을 설명합니다.',
          focus: [{ startLine: 1 }],
        },
        {
          title: `${step.title}의 다음 부분`,
          description: '같은 코드에서 다음 부분을 설명합니다.',
          focus: [{ startLine: 1, startColumn: 2, endColumn: 4 }],
        },
      ],
    }));
    render(<CodeStepsDemo steps={detailedSteps} />);
    fireEvent.click(screen.getByRole('button', { name: /다음/ }), {
      detail: 0,
    });
    expect(screen.getByTestId('step-code').textContent).toBe(steps[0].code);
    expect(screen.getByText('입력의 다음 부분')).toBeDefined();
  });

  it('settles the explanation before moving the code and respects both ends', () => {
    render(<CodeStepsDemo steps={steps} />);
    expect(
      screen.getByRole('button', { name: '이전 설명' }).hasAttribute('disabled')
    ).toBe(true);
    next();
    expect(
      screen
        .getByRole('button', { name: '2단계: 대기' })
        .getAttribute('aria-current')
    ).toBe('step');
    expect(screen.getByTestId('step-code').textContent).toBe(steps[0].code);
    expect(
      screen.getByRole('region', { name: / 코드$/ }).getAttribute('aria-busy')
    ).toBe('true');
    act(() => vi.advanceTimersByTime(319));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[0].code);
    expect(
      screen.getByRole('region', { name: / 코드$/ }).getAttribute('aria-busy')
    ).toBe('true');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
    expect(
      screen.getByRole('region', { name: / 코드$/ }).getAttribute('aria-busy')
    ).toBe('false');
    next();
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
    expect(
      screen.getByRole('button', { name: '다음 설명' }).hasAttribute('disabled')
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '이전 설명' }), {
      detail: 0,
    });
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
  });

  it('applies only the last selection when input interrupts a pending step', () => {
    render(<CodeStepsDemo steps={steps} />);
    next();
    act(() => vi.advanceTimersByTime(160));
    next();
    act(() => vi.advanceTimersByTime(160));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[0].code);
    act(() => vi.advanceTimersByTime(160));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
  });

  it('settles interrupted moves and ignores completion from an older move', () => {
    render(<CodeStepsDemo steps={steps} />);
    const viewport = screen.getByRole('region', {
      name: '스크롤로 읽는 코드 설명',
    });
    next();
    act(() => vi.advanceTimersByTime(320));
    act(() => rendererLifecycle.start?.());
    expect(viewport.dataset.codeMotion).toBe('animated');
    const finishPreviousMove = rendererLifecycle.end;

    act(() => vi.advanceTimersByTime(200));
    next();
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
    expect(screen.getByTestId('step-code').dataset.animate).toBe('false');
    expect(viewport.dataset.codeMotion).toBe('immediate');

    fireEvent.click(screen.getByRole('button', { name: '1단계: 입력' }), {
      detail: 1,
    });
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByTestId('step-code').dataset.animate).toBe('true');
    act(() => rendererLifecycle.start?.());
    act(() => finishPreviousMove?.());
    next();
    act(() => vi.advanceTimersByTime(320));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
    expect(screen.getByTestId('step-code').dataset.animate).toBe('false');
  });

  it.each(['keyboard', 'reduced motion'])(
    'stops an active code move immediately for %s',
    input => {
      render(<CodeStepsDemo steps={steps} />);
      next();
      act(() => vi.advanceTimersByTime(320));
      act(() => rendererLifecycle.start?.());

      if (input === 'keyboard') {
        next(0);
      } else {
        act(() => {
          reducedMotion = true;
          subscribers.forEach(listener => listener());
        });
      }

      const expected = input === 'keyboard' ? steps[2].code : steps[1].code;
      expect(screen.getByTestId('step-code').textContent).toBe(expected);
      expect(screen.getByTestId('step-code').dataset.animate).toBe('false');
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.getByTestId('step-code').textContent).toBe(expected);
    }
  );

  it('lets keyboard input replace a pending pointer action immediately', () => {
    render(<CodeStepsDemo steps={steps} />);
    next();
    next(0);
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
    expect(screen.getByTestId('step-code').dataset.animate).toBe('false');
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[2].code);
  });

  it('changes steps without motion when reduced motion is enabled', () => {
    reducedMotion = true;
    render(<CodeStepsDemo steps={steps} />);
    next();
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
    expect(screen.getByTestId('step-code').dataset.animate).toBe('false');
  });

  it('settles the latest step when reduced motion changes during a transition', () => {
    render(<CodeStepsDemo steps={steps} />);
    next();
    act(() => {
      reducedMotion = true;
      subscribers.forEach(listener => listener());
    });
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
    expect(screen.getByTestId('step-code').dataset.animate).toBe('false');
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId('step-code').textContent).toBe(steps[1].code);
  });
});
