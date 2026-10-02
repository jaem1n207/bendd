'use client';

import { useMemo, useState } from 'react';
import type { KeyedTokensInfo } from 'shiki-magic-move/core';
import { ShikiMagicMoveRenderer } from 'shiki-magic-move/react';

import {
  CODE_MOVE_DURATION_MS,
  CODE_MOVE_EASING,
  getCodeFocus,
  type CodeStep,
} from '@/components/home/lib/code-walkthrough';
import styles from '@/components/home/ui/code-steps-demo.module.css';

import 'shiki-magic-move/dist/style.css';

export interface RenderedCodeStep {
  stopIndex: number;
  stepIndex: number;
  revision: number;
  tokens: KeyedTokensInfo;
  previous?: KeyedTokensInfo;
  animate: boolean;
  layoutLineCount: number;
}

function CodeStepRenderer({
  step,
  onStart,
  onEnd,
}: {
  step: RenderedCodeStep;
  onStart: () => void;
  onEnd: () => void;
}) {
  const [primed, setPrimed] = useState(!step.previous);
  // Seed the previous frame so the library also delays entering tokens on the
  // first animated transition. Focus-only changes keep this renderer mounted.
  const seed = step.animate && !primed ? step.previous : undefined;

  return (
    <ShikiMagicMoveRenderer
      className={styles.codeBase}
      tokens={seed ?? step.tokens}
      animate={step.animate}
      options={{
        duration: CODE_MOVE_DURATION_MS,
        easing: CODE_MOVE_EASING,
        stagger: 0,
        delayMove: 0,
        delayLeave: 0,
        delayEnter: 0.65,
        animateContainer: false,
        containerStyle: false,
      }}
      onStart={() => {
        if (!seed) {
          onStart();
        }
      }}
      onEnd={() => {
        if (seed) {
          setPrimed(true);
        } else {
          onEnd();
        }
      }}
    />
  );
}

export function CodeWalkthroughCode({
  step,
  rendered,
  annotationIndex,
  highlighted,
  pending,
  onStart,
  onEnd,
}: {
  step: CodeStep;
  rendered: RenderedCodeStep;
  annotationIndex: number;
  highlighted: boolean;
  pending: boolean;
  onStart: () => void;
  onEnd: () => void;
}) {
  const layers = useMemo(
    () =>
      step.annotations.map(annotation =>
        getCodeFocus(rendered.tokens.code, annotation.focus)
      ),
    [rendered.tokens.code, step.annotations]
  );
  const activeLines = layers[annotationIndex];
  const hasFocus = activeLines?.some(line => line.focused) ?? false;
  const showFocus = highlighted && hasFocus;

  return (
    <div
      className={styles.codePane}
      role="region"
      aria-label={`${step.title} 코드`}
      aria-busy={pending}
      data-focused={showFocus}
    >
      <div className={styles.codeHeader} aria-hidden="true">
        <span>save-note.ts</span>
        <span>TypeScript</span>
      </div>
      <div className={styles.codeViewport}>
        <div className={styles.codeCanvas}>
          <div className={styles.lineNumbers} aria-hidden="true">
            {rendered.tokens.code.split('\n').map((_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
          <CodeStepRenderer
            key={rendered.animate ? 'animated' : `static-${rendered.revision}`}
            step={rendered}
            onStart={onStart}
            onEnd={onEnd}
          />
          {layers.map((lines, index) => (
            <pre
              key={index}
              className={styles.focusLayer}
              aria-hidden="true"
              data-active={showFocus && index === annotationIndex}
            >
              {lines.map(line => (
                <span
                  key={line.line}
                  className={styles.focusLine}
                  data-code-line={line.line}
                  data-focused={line.focused}
                >
                  {line.segments.map((segment, segmentIndex) => (
                    <span
                      key={segmentIndex}
                      data-focused-code={segment.focused}
                    >
                      {segment.text}
                    </span>
                  ))}
                  {!line.text && '\u00a0'}
                </span>
              ))}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}
