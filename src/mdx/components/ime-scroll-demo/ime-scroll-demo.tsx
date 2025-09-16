'use client';

import { Input } from '@/components/ui/input';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { createMDXComponent } from '../../common/create-mdx-component';
import { ClientGate } from '@/components/client-gate';

const ImeScrollDemoSchema = z.object({
  initialText: z.string().optional().default(''),
});

type ImeScrollDemoProps = z.infer<typeof ImeScrollDemoSchema>;

function isChromeBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
  return isChrome;
}

function useImeSafeScroll(
  inputRef: React.RefObject<HTMLInputElement>,
  value: string
) {
  const isComposingRef = useRef(false);
  const hasPendingSpaceRef = useRef(false);

  const ensureCaretVisible = useCallback(() => {
    if (!inputRef.current) return;

    const element = inputRef.current;
    const selectionStart = element.selectionStart;
    if (selectionStart === null) return;

    if (selectionStart === element.value.length) {
      element.scrollLeft = element.scrollWidth;
    } else {
      element.setSelectionRange(selectionStart, selectionStart);
    }
  }, [inputRef]);

  const onCompositionStart = () => {
    isComposingRef.current = true;
    hasPendingSpaceRef.current = false;
  };

  const onCompositionEnd = () => {
    isComposingRef.current = false;

    if (isChromeBrowser() && hasPendingSpaceRef.current) {
      hasPendingSpaceRef.current = false;
    }

    requestAnimationFrame(ensureCaretVisible);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isComposingRef.current && e.code === 'Space') {
      hasPendingSpaceRef.current = true;
    }
  };

  const onInput = () => {
    if (!isComposingRef.current) {
      requestAnimationFrame(ensureCaretVisible);
    }
  };

  useEffect(() => {
    if (!isComposingRef.current) {
      ensureCaretVisible();
    }
  }, [value, ensureCaretVisible]);

  return { onCompositionStart, onCompositionEnd, onKeyDown, onInput };
}

function ImeScrollDemo({ initialText = '' }: ImeScrollDemoProps) {
  const [normalValue, setNormalValue] = useState(initialText);
  const [fixedValue, setFixedValue] = useState(initialText);

  const normalInputRef = useRef<HTMLInputElement>(null);
  const fixedInputRef = useRef<HTMLInputElement>(null);

  const imeScrollHandlers = useImeSafeScroll(fixedInputRef, fixedValue);

  const sampleText =
    '이것은 아주 긴 텍스트이고 IME 입력 시 커서가 화면에서 사라지는 문제를 테스트하기 위한 예제입니다.';

  return (
    <div className="bd-my-6 bd-space-y-6 bd-rounded-lg bd-border-2 bd-p-6">
      <div className="bd-space-y-2 bd-text-center">
        <h4 className="bd-text-lg bd-font-semibold bd-text-foreground">
          IME 스크롤 버그 데모
        </h4>
        <p className="bd-text-sm bd-text-muted-foreground">
          Chrome에서 한글 입력 후 공백을 눌러 차이점을 확인해보세요
        </p>
        <div className="bd-text-xs bd-text-muted-foreground">
          현재 브라우저:{' '}
          <ClientGate>
            <span className="bd-rounded bd-bg-muted bd-px-2 bd-py-1 bd-text-muted-foreground">
              {isChromeBrowser()
                ? 'Chrome (버그 재현 가능)'
                : '다른 브라우저 (정상 동작)'}
            </span>
          </ClientGate>
        </div>
      </div>

      <div className="bd-space-y-4">
        {/* 문제 상황 */}
        <div className="bd-space-y-3">
          <div className="bd-flex bd-items-center bd-gap-2">
            <span className="bd-text-red-500">❌</span>
            <h5 className="bd-text-sm bd-font-semibold bd-text-red-500">
              문제 상황 (일반 Input)
            </h5>
          </div>
          <div className="bd-flex bd-flex-col bd-gap-2">
            <Input
              ref={normalInputRef}
              type="text"
              value={normalValue}
              onChange={e => setNormalValue(e.target.value)}
              placeholder="긴 한글 텍스트를 입력해보세요..."
              className="bd-w-[120px] bd-border-destructive bd-text-sm focus:bd-ring-destructive"
            />
            <button
              onClick={() => {
                setNormalValue(sampleText);
                normalInputRef.current?.focus();
              }}
              className="bd-self-start bd-rounded bd-bg-destructive bd-px-2 bd-py-1 bd-text-xs bd-text-destructive-foreground bd-transition-colors hover:bd-bg-destructive/90"
            >
              긴 텍스트로 채우기
            </button>
          </div>
        </div>

        {/* 해결된 상황 */}
        <div className="bd-space-y-3">
          <div className="bd-flex bd-items-center bd-gap-2">
            <span className="bd-text-green-700 dark:bd-text-green-400">✅</span>
            <h5 className="bd-text-sm bd-font-semibold bd-text-green-700 dark:bd-text-green-400">
              해결된 상황 (IME Safe Input)
            </h5>
          </div>
          <div className="bd-flex bd-flex-col bd-gap-2">
            <Input
              ref={fixedInputRef}
              type="text"
              value={fixedValue}
              onChange={e => setFixedValue(e.target.value)}
              onCompositionStart={imeScrollHandlers.onCompositionStart}
              onCompositionEnd={imeScrollHandlers.onCompositionEnd}
              onKeyDown={imeScrollHandlers.onKeyDown}
              onInput={imeScrollHandlers.onInput}
              placeholder="긴 한글 텍스트를 입력해보세요..."
              className="bd-w-[120px] bd-border-green-500 bd-text-sm focus:bd-ring-green-600"
            />
            <button
              onClick={() => {
                setFixedValue(sampleText);
                fixedInputRef.current?.focus();
              }}
              className="bd-self-start bd-rounded bd-bg-green-600 bd-px-2 bd-py-1 bd-text-xs bd-text-white bd-transition-colors hover:bd-bg-green-700"
            >
              긴 텍스트로 채우기
            </button>
          </div>
        </div>
      </div>

      <div className="bd-rounded-lg bd-border bd-border-accent bd-bg-accent/5 bd-p-3">
        <h6 className="bd-mb-2 bd-text-sm bd-font-semibold bd-text-foreground">
          테스트 방법
        </h6>
        <ul className="bd-space-y-1 bd-text-xs bd-text-muted-foreground">
          <li>1. 위 두 input 필드에 긴 한글 텍스트를 입력하세요</li>
          <li>2. 텍스트가 120px를 넘어갈 때까지 입력하세요</li>
          <li>
            3. 한글 조합 중에{' '}
            <strong className="bd-text-foreground">공백</strong>을 눌러보세요
          </li>
          <li>4. 첫 번째는 커서가 사라지고, 두 번째는 항상 보입니다</li>
        </ul>
      </div>
    </div>
  );
}

export const MDXImeScrollDemo = createMDXComponent(
  ImeScrollDemo,
  ImeScrollDemoSchema
);
