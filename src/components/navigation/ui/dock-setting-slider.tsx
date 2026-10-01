'use client';

import { motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';

import { DockMotionMode } from '@/components/navigation/consts/dock';
import styles from '@/components/navigation/ui/dock.module.css';

const BAR_COUNT = 36;
const BAR_HEIGHT = 36;
const WAVE_HEIGHT = 6;
const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

function RollingValue({
  value,
  mode,
}: {
  value: string;
  mode: DockMotionMode;
}) {
  return (
    <span className={styles.rollingValue} aria-hidden="true">
      {Array.from(value).map((character, index) => {
        if (!/\d/.test(character)) {
          return <span key={index}>{character}</span>;
        }
        return (
          <span key={index} className={styles.digitWindow}>
            <motion.span
              className={styles.digitStrip}
              initial={false}
              animate={{ y: `${-Number(character) * 10}%` }}
              transition={{
                duration: mode === DockMotionMode.Static ? 0 : 0.14,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {DIGITS.map(digit => (
                <span key={digit}>{digit}</span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export function DockSettingSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  mode,
  onPreview,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  mode: DockMotionMode;
  onPreview: (value: number | null) => void;
  onCommit: (value: number) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const gesture = useRef<number | null>(null);
  const handlers = useRef({ onPreview, onCommit });
  handlers.current = { onPreview, onCommit };
  const lastPreview = useRef<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const decimals = step < 1 ? 2 : 0;
  const format = (number: number) =>
    `${Number(number.toFixed(decimals))}${unit}`;
  const shown = hover ?? value;
  const progress = (shown - min) / (max - min);
  const active = hover !== null || focused || dragging;

  const release = () => {
    const pointer = gesture.current;
    gesture.current = null;
    if (pointer !== null && input.current?.hasPointerCapture(pointer)) {
      input.current.releasePointerCapture(pointer);
    }
    setDragging(false);
  };
  const cancel = () => {
    release();
    setHover(null);
    lastPreview.current = null;
    handlers.current.onPreview(null);
  };
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => {
    const element = input.current;
    const blur = () => cancelRef.current();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelRef.current();
      }
    };
    window.addEventListener('blur', blur);
    document.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('keydown', escape, true);
      const pointer = gesture.current;
      gesture.current = null;
      if (pointer !== null && element?.hasPointerCapture(pointer)) {
        element.releasePointerCapture(pointer);
      }
    };
  }, []);

  const pointerValue = (event: PointerEvent<HTMLInputElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width))
    );
    return Number(
      Math.max(
        min,
        Math.min(max, min + Math.round((fraction * (max - min)) / step) * step)
      ).toFixed(decimals)
    );
  };
  const preview = (event: PointerEvent<HTMLInputElement>) => {
    if (
      (event.pointerType === 'touch' && gesture.current === null) ||
      (gesture.current !== null && event.pointerId !== gesture.current)
    ) {
      return;
    }
    const next = pointerValue(event);
    if (next === lastPreview.current) {
      return;
    }
    lastPreview.current = next;
    setHover(previous => (previous === next ? previous : next));
    handlers.current.onPreview(next);
  };
  return (
    <div className={styles.settingRow}>
      <div className={styles.settingHeading}>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <div
        className={styles.sliderTrack}
        data-dock-slider-track=""
        data-active={active}
      >
        <div className={styles.sliderBars} aria-hidden="true">
          {Array.from({ length: BAR_COUNT }, (_, index) => {
            const ratio = index / (BAR_COUNT - 1);
            const base = 12 + 24 * ratio;
            const wave =
              active && mode === DockMotionMode.Animated
                ? Math.max(0, 1 - Math.abs(ratio - progress) / 0.16) *
                  WAVE_HEIGHT
                : 0;
            return (
              <span
                key={index}
                data-filled={ratio <= (value - min) / (max - min)}
                data-near={active && Math.abs(ratio - progress) < 0.035}
                style={{ transform: `scaleY(${(base + wave) / BAR_HEIGHT})` }}
              />
            );
          })}
        </div>
        <div
          className={styles.valueTooltip}
          data-visible={active}
          style={{ left: `${progress * 100}%` }}
        >
          <RollingValue
            value={format(shown)}
            mode={focused && hover === null ? DockMotionMode.Static : mode}
          />
        </div>
        <input
          ref={input}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={shown}
          aria-valuetext={format(shown)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (gesture.current === null) {
              cancel();
            }
          }}
          onPointerEnter={preview}
          onPointerMove={preview}
          onPointerLeave={() => {
            if (gesture.current === null) {
              setHover(null);
              lastPreview.current = null;
              handlers.current.onPreview(null);
            }
          }}
          onPointerDown={event => {
            if (
              !event.isPrimary ||
              event.button !== 0 ||
              gesture.current !== null
            ) {
              return;
            }
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            gesture.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            preview(event);
          }}
          onPointerUp={event => {
            if (event.pointerId !== gesture.current) {
              return;
            }
            const next = pointerValue(event);
            release();
            lastPreview.current = event.pointerType === 'touch' ? null : next;
            setHover(event.pointerType === 'touch' ? null : next);
            handlers.current.onCommit(next);
            handlers.current.onPreview(
              event.pointerType === 'touch' ? null : next
            );
          }}
          onPointerCancel={event => {
            if (event.pointerId === gesture.current) {
              cancel();
            }
          }}
          onLostPointerCapture={event => {
            if (event.pointerId === gesture.current) {
              cancel();
            }
          }}
          onChange={event => {
            if (gesture.current !== null) {
              return;
            }
            const next = Number(event.currentTarget.value);
            lastPreview.current = null;
            setHover(null);
            handlers.current.onCommit(next);
            handlers.current.onPreview(next);
          }}
        />
      </div>
      <div className={styles.sliderEnds} aria-hidden="true">
        <span>작게</span>
        <span>크게</span>
      </div>
    </div>
  );
}
