'use client';

import { ChevronDown, ChevronUp, Mouse } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { syncTokenKeys } from 'shiki-magic-move/core';

import {
  CODE_MOVE_DURATION_MS,
  CODE_MOVE_EASING,
  getCodeStops,
  getFocusLabel,
  getScrollStop,
  WALKTHROUGH_SCROLL_DISTANCE,
  type CodeStep,
} from '@/components/home/lib/code-walkthrough';
import styles from '@/components/home/ui/code-steps-demo.module.css';
import {
  CodeWalkthroughCode,
  type RenderedCodeStep,
} from '@/components/home/ui/code-walkthrough-code';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const EXPLANATION_DURATION_MS = 320;

enum CodeTransition {
  Animated = 'animated',
  Immediate = 'immediate',
}

export function CodeStepsDemo({ steps }: { steps: CodeStep[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const instructionId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const explanation = useRef<HTMLDivElement>(null);
  const stops = useMemo(() => getCodeStops(steps), [steps]);
  const [selection, setSelection] = useState({ index: 0, animate: false });
  const selectionIndex = useRef(0);
  const [rendered, setRendered] = useState<RenderedCodeStep>({
    stopIndex: 0,
    stepIndex: 0,
    revision: 0,
    tokens: steps[0].tokens,
    animate: false,
    layoutLineCount: steps[0].tokens.code.split('\n').length,
  });
  const [movingRevision, setMovingRevision] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeAnimation = useRef<number | null>(null);

  const commitStop = useCallback(
    (index: number, motion: CodeTransition) => {
      const stop = stops[index];
      if (!stop) {
        return;
      }
      const step = steps[stop.stepIndex];
      const allowMove =
        motion === CodeTransition.Animated && activeAnimation.current === null;
      if (!allowMove) {
        activeAnimation.current = null;
        setMovingRevision(null);
      }

      setRendered(current => {
        const codeChanged = current.stepIndex !== stop.stepIndex;
        if (!codeChanged && allowMove) {
          // A new explanation in the same step only changes focus. Keep token
          // identity and the renderer so unchanged code does not move again.
          return { ...current, stopIndex: index };
        }
        if (current.stopIndex === index && !current.animate && !allowMove) {
          return current;
        }
        const result = codeChanged
          ? syncTokenKeys(current.tokens, step.tokens)
          : { from: current.tokens, to: current.tokens };
        const animate = allowMove && codeChanged;
        return {
          stopIndex: index,
          stepIndex: stop.stepIndex,
          revision: current.revision + 1,
          tokens: result.to,
          previous: animate && !current.animate ? result.from : undefined,
          animate,
          // Wait for the renderer's actual start (including its first seed
          // frame) so the frame and tokens begin resizing/moving together.
          layoutLineCount: animate
            ? current.layoutLineCount
            : step.tokens.code.split('\n').length,
        };
      });
    },
    [steps, stops]
  );

  const selectStop = useCallback(
    (index: number, motion: CodeTransition) => {
      if (!stops[index]) {
        return;
      }
      const animate =
        motion === CodeTransition.Animated && reducedMotion === false;
      if (index === selectionIndex.current && animate) {
        return;
      }
      clearTimeout(timer.current);
      selectionIndex.current = index;
      setSelection({ index, animate });
      if (animate) {
        timer.current = setTimeout(
          () => commitStop(index, CodeTransition.Animated),
          EXPLANATION_DURATION_MS
        );
      } else {
        commitStop(index, CodeTransition.Immediate);
      }
    },
    [commitStop, reducedMotion, stops]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const element = explanation.current;
    const frame = viewport.current;
    if (!element || !frame) {
      return;
    }

    // Measure only the intrinsic explanation, never the animated frame. This
    // also responds to narrower columns and font loading without a resize loop.
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height > 0) {
        frame.style.setProperty('--explanation-height', `${height}px`);
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion !== false) {
      clearTimeout(timer.current);
      commitStop(selectionIndex.current, CodeTransition.Immediate);
    }
  }, [commitStop, reducedMotion]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) {
      return;
    }
    const onScroll = () => {
      const current = selectionIndex.current;
      const next = getScrollStop(element.scrollTop, current, stops.length);
      if (next !== current) {
        selectStop(
          next,
          Math.abs(next - current) === 1
            ? CodeTransition.Animated
            : CodeTransition.Immediate
        );
      }
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [selectStop, stops.length]);

  const navigateTo = (index: number, motion: CodeTransition) => {
    if (!stops[index]) {
      return;
    }
    selectStop(index, motion);
    if (viewport.current) {
      viewport.current.scrollTop = index * WALKTHROUGH_SCROLL_DISTANCE;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
        next = selectionIndex.current + 1;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        next = selectionIndex.current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = stops.length - 1;
        break;
      case ' ':
        if (event.target !== event.currentTarget) {
          return;
        }
        next = selectionIndex.current + (event.shiftKey ? -1 : 1);
        break;
      default:
        return;
    }
    // This also consumes boundary keys; Tab remains available to leave the demo.
    event.preventDefault();
    navigateTo(
      Math.max(0, Math.min(stops.length - 1, next)),
      CodeTransition.Immediate
    );
  };

  const selectedStop = stops[selection.index];
  const renderedStop = stops[rendered.stopIndex];
  const highlighted =
    selection.index === rendered.stopIndex && movingRevision === null;
  const viewportStyle: CSSProperties & {
    '--explanation-duration': string;
    '--code-duration': string;
    '--code-easing': string;
    '--walkthrough-scroll-range': string;
    '--code-line-count': number;
  } = {
    '--explanation-duration': `${EXPLANATION_DURATION_MS}ms`,
    '--code-duration': `${CODE_MOVE_DURATION_MS}ms`,
    '--code-easing': CODE_MOVE_EASING,
    '--walkthrough-scroll-range': `${(stops.length - 1) * WALKTHROUGH_SCROLL_DISTANCE}px`,
    '--code-line-count': rendered.layoutLineCount,
  };

  return (
    <div className={styles.frame}>
      <div
        ref={viewport}
        className={styles.viewport}
        style={viewportStyle}
        role="region"
        aria-label="스크롤로 읽는 코드 설명"
        aria-describedby={instructionId}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-motion={
          selection.animate && reducedMotion === false
            ? 'animated'
            : 'immediate'
        }
        data-code-motion={
          rendered.animate && reducedMotion === false ? 'animated' : 'immediate'
        }
      >
        <div className={styles.scrollTrack}>
          <div className={styles.scene}>
            <div className={styles.header}>
              <span>CODE / WALKTHROUGH</span>
              <span className={styles.counter} aria-hidden="true">
                {String(selectedStop.stepIndex + 1).padStart(2, '0')}
                <span> / {String(steps.length).padStart(2, '0')}</span>
              </span>
            </div>

            <div className={styles.columns}>
              <div ref={explanation} className={styles.explanationPane}>
                <div
                  className={styles.descriptions}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {stops.map((stop, index) => {
                    const step = steps[stop.stepIndex];
                    const annotation = step.annotations[stop.annotationIndex];
                    return (
                      <div
                        key={`${stop.stepIndex}-${stop.annotationIndex}`}
                        className={styles.description}
                        aria-hidden={index !== selection.index}
                        data-position={
                          index === selection.index
                            ? 'active'
                            : index < selection.index
                              ? 'before'
                              : 'after'
                        }
                      >
                        <span className={styles.chapter}>
                          {String(stop.stepIndex + 1).padStart(2, '0')}
                          <span>{step.title}</span>
                        </span>
                        <strong>{annotation.title}</strong>
                        <p>{annotation.description}</p>
                        <span className={styles.focusReference}>
                          <span aria-hidden="true">↳</span>
                          코드 {getFocusLabel(annotation.focus)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.annotationProgress} aria-hidden="true">
                  {steps[selectedStop.stepIndex].annotations.map((_, index) => (
                    <span
                      key={index}
                      data-active={index === selectedStop.annotationIndex}
                    />
                  ))}
                  <small>
                    {selectedStop.annotationIndex + 1} /{' '}
                    {steps[selectedStop.stepIndex].annotations.length}
                  </small>
                </div>
              </div>

              <CodeWalkthroughCode
                step={steps[rendered.stepIndex]}
                rendered={rendered}
                annotationIndex={renderedStop.annotationIndex}
                highlighted={highlighted}
                pending={selection.index !== rendered.stopIndex}
                onStart={() => {
                  activeAnimation.current = rendered.revision;
                  setMovingRevision(rendered.revision);
                  setRendered(current =>
                    current.revision === rendered.revision
                      ? {
                          ...current,
                          layoutLineCount:
                            current.tokens.code.split('\n').length,
                        }
                      : current
                  );
                }}
                onEnd={() => {
                  if (activeAnimation.current === rendered.revision) {
                    activeAnimation.current = null;
                    setMovingRevision(null);
                  }
                }}
              />
            </div>

            <nav className={styles.controls} aria-label="코드 설명 단계">
              <button
                type="button"
                aria-label="이전 설명"
                disabled={selection.index === 0}
                onClick={event =>
                  navigateTo(
                    selection.index - 1,
                    event.detail > 0
                      ? CodeTransition.Animated
                      : CodeTransition.Immediate
                  )
                }
              >
                <ChevronUp aria-hidden="true" />
              </button>
              <div className={styles.steps}>
                {steps.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    aria-label={`${index + 1}단계: ${step.title}`}
                    aria-current={
                      index === selectedStop.stepIndex ? 'step' : undefined
                    }
                    onClick={event =>
                      navigateTo(
                        stops.findIndex(stop => stop.stepIndex === index),
                        event.detail > 0
                          ? CodeTransition.Animated
                          : CodeTransition.Immediate
                      )
                    }
                  >
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="다음 설명"
                disabled={selection.index === stops.length - 1}
                onClick={event =>
                  navigateTo(
                    selection.index + 1,
                    event.detail > 0
                      ? CodeTransition.Animated
                      : CodeTransition.Immediate
                  )
                }
              >
                <ChevronDown aria-hidden="true" />
              </button>
            </nav>

            <div className={styles.footer}>
              <p id={instructionId}>
                <Mouse aria-hidden="true" />
                스크롤로 한 부분씩 읽기
                <span className={styles.srOnly}>
                  방향키로 설명을 이동하고, Tab 키로 이 영역을 나갈 수 있습니다.
                </span>
              </p>
              <span
                aria-label={`전체 설명 ${selection.index + 1} / ${stops.length}`}
              >
                {selection.index + 1} / {stops.length}
              </span>
            </div>
            <div className={styles.progress} aria-hidden="true">
              <span
                style={{
                  transform: `scaleX(${(selection.index + 1) / stops.length})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
