import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createCraftCursor,
  getCursorBadgeOffset,
} from '@/components/home/lib/craft-cursor';

const onState = vi.fn();
const onMove = vi.fn();
const hitTest = vi.fn((): Element | null => null);
const mediaListeners = new Set<() => void>();
let finePointer = true;
let dispose: () => void;
let fixture: HTMLElement;
const originalHitTest = Object.getOwnPropertyDescriptor(
  document,
  'elementFromPoint'
);

function element(selector: string) {
  const found = document.querySelector<HTMLElement>(selector);
  if (!found) {
    throw new Error(`Missing fixture: ${selector}`);
  }
  return found;
}

function pointer(
  target: EventTarget,
  type: string,
  options: {
    x?: number;
    y?: number;
    id?: number;
    kind?: string;
    button?: number;
    relatedTarget?: EventTarget;
  } = {}
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: options.x ?? 200,
    clientY: options.y ?? 300,
    button: options.button ?? 0,
    relatedTarget: options.relatedTarget ?? null,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.id ?? 1 },
    pointerType: { value: options.kind ?? 'mouse' },
    isPrimary: { value: true },
  });
  target.dispatchEvent(event);
}

beforeEach(() => {
  finePointer = true;
  onState.mockClear();
  onMove.mockClear();
  hitTest.mockReset();
  mediaListeners.clear();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return finePointer;
    },
    addEventListener: (_: string, listener: () => void) =>
      mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      mediaListeners.delete(listener),
  }));
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: hitTest,
  });
  fixture = document.createElement('div');
  fixture.innerHTML = `
    <div id="craft-root">
      <div id="dock" data-craft-cursor="아이콘 선택">
        <button id="icon" data-cursor-label="클릭해 선택"><svg id="icon-path"></svg></button>
        <button id="separator" data-dock-separator></button>
      </div>
      <div id="code" data-craft-cursor="스크롤해 설명 읽기">
        <button id="next" data-cursor-label="다음 설명" data-cursor-disabled-label="마지막 설명입니다"></button>
      </div>
      <a id="title">작품 설명</a>
    </div>
    <section id="settings">
      <label for="size">Dock 크기</label><input id="size" type="range" />
      <button id="close" aria-label="닫기"></button>
    </section>
    <section id="unrelated">다른 설정</section>
  `;
  document.body.append(fixture);
  dispose = createCraftCursor({
    root: element('#craft-root'),
    onState,
    onMove,
  });
});

afterEach(() => {
  dispose();
  fixture.remove();
  delete document.documentElement.dataset.craftCursorDragging;
  document.documentElement.style.cursor = '';
  if (originalHitTest) {
    Object.defineProperty(document, 'elementFromPoint', originalHitTest);
  } else {
    Reflect.deleteProperty(document, 'elementFromPoint');
  }
  vi.unstubAllGlobals();
});

describe('Craft cursor ownership', () => {
  test('updates position immediately and keeps one label while moving within an action', () => {
    pointer(element('#icon-path'), 'pointerover');
    pointer(element('#icon-path'), 'pointermove', { x: 210, y: 310 });
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '클릭해 선택',
    });
    expect(onMove).toHaveBeenLastCalledWith(210, 310);

    pointer(element('#next'), 'pointermove');
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '다음 설명',
    });
    expect(element('#dock').dataset.craftCursorActive).toBeUndefined();
    expect(element('#code').dataset.craftCursorActive).toBe('true');
  });

  test('restores the native cursor immediately on leaving a stage, including its title', () => {
    pointer(element('#icon'), 'pointerover');
    pointer(element('#icon'), 'pointerout', {
      relatedTarget: element('#title'),
    });
    expect(onState).toHaveBeenLastCalledWith({
      visible: false,
      label: '클릭해 선택',
    });
    expect(element('#dock').dataset.craftCursorActive).toBeUndefined();
    expect(document.body.style.cursor).toBe('');
  });

  test('keeps resize guidance outside the stage until the matching pointer is released', () => {
    pointer(element('#separator'), 'pointerdown');
    pointer(element('#title'), 'pointermove', { x: 500, y: 100 });
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '크기 조절 중',
    });
    expect(document.documentElement.dataset.craftCursorDragging).toBe(
      'ns-resize'
    );

    pointer(element('#title'), 'pointerup', { id: 2 });
    expect(document.documentElement.dataset.craftCursorDragging).toBe(
      'ns-resize'
    );
    hitTest.mockReturnValue(element('#title'));
    pointer(element('#separator'), 'pointerup', { x: 500, y: 100 });
    expect(onState).toHaveBeenLastCalledWith({
      visible: false,
      label: '크기 조절 중',
    });
    expect(
      document.documentElement.dataset.craftCursorDragging
    ).toBeUndefined();
  });

  test('resumes the correct hover label after releasing inside the stage', () => {
    pointer(element('#separator'), 'pointerdown');
    hitTest.mockReturnValue(element('#icon'));
    pointer(element('#separator'), 'pointerup');
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '클릭해 선택',
    });
  });

  test('keeps the active drag cursor when a modifier key does not cancel the gesture', () => {
    pointer(element('#separator'), 'pointerdown');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    expect(document.documentElement.dataset.craftCursorDragging).toBe(
      'ns-resize'
    );
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '크기 조절 중',
    });
  });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    test(`cleans up an interrupted drag on ${type}`, () => {
      pointer(element('#separator'), 'pointerdown');
      pointer(element('#separator'), type);
      expect(element('#dock').dataset.craftCursorActive).toBeUndefined();
      expect(
        document.documentElement.dataset.craftCursorDragging
      ).toBeUndefined();
      expect(onState).toHaveBeenLastCalledWith({
        visible: false,
        label: '크기 조절 중',
      });
    });
  }

  for (const interrupt of [
    {
      name: 'keydown',
      dispatch: () =>
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
    },
    { name: 'blur', dispatch: () => window.dispatchEvent(new Event('blur')) },
  ]) {
    test(`hides on ${interrupt.name} without being resurrected by scroll`, () => {
      pointer(element('#separator'), 'pointerdown');
      interrupt.dispatch();
      hitTest.mockReturnValue(element('#icon'));
      window.dispatchEvent(new Event('scroll'));
      expect(onState).toHaveBeenLastCalledWith({
        visible: false,
        label: '크기 조절 중',
      });
      expect(
        document.documentElement.dataset.craftCursorDragging
      ).toBeUndefined();
    });
  }

  test('does not replace the cursor for touch, pen, coarse pointers, or a right click', () => {
    pointer(element('#separator'), 'pointerdown', { button: 2 });
    expect(
      document.documentElement.dataset.craftCursorDragging
    ).toBeUndefined();
    for (const kind of ['touch', 'pen']) {
      pointer(element('#icon'), 'pointermove', { kind });
      pointer(element('#icon'), 'pointerout', {
        kind,
        relatedTarget: element('#dock'),
      });
    }
    finePointer = false;
    pointer(element('#icon'), 'pointerover');
    expect(onState).not.toHaveBeenCalled();
    expect(element('#dock').dataset.craftCursorActive).toBeUndefined();
  });

  test('drops cursor ownership when fine pointer support changes', () => {
    pointer(element('#separator'), 'pointerdown');
    finePointer = false;
    mediaListeners.forEach(listener => listener());
    expect(
      document.documentElement.dataset.craftCursorDragging
    ).toBeUndefined();
    expect(element('#dock').dataset.craftCursorActive).toBeUndefined();
  });

  test('tracks only the settings portal owned by the demo', () => {
    element('#separator').setAttribute('aria-controls', 'settings');
    pointer(element('#size'), 'pointerover');
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '드래그해 Dock 크기 조절',
    });
    expect(element('#settings').dataset.craftCursorActive).toBe('true');
    pointer(element('#close'), 'pointermove');
    expect(onState).toHaveBeenLastCalledWith({ visible: true, label: '닫기' });
    pointer(element('#unrelated'), 'pointermove');
    expect(element('#settings').dataset.craftCursorActive).toBeUndefined();
    expect(onState).toHaveBeenLastCalledWith({ visible: false, label: '닫기' });
  });

  test('keeps a settings slider gesture guided outside its panel', () => {
    element('#separator').setAttribute('aria-controls', 'settings');
    pointer(element('#size'), 'pointerdown');
    pointer(element('#title'), 'pointermove');
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: 'Dock 크기 조절 중',
    });
    expect(document.documentElement.dataset.craftCursorDragging).toBe(
      'ew-resize'
    );
    hitTest.mockReturnValue(element('#title'));
    pointer(element('#size'), 'pointerup');
    expect(
      document.documentElement.dataset.craftCursorDragging
    ).toBeUndefined();
    expect(element('#settings').dataset.craftCursorActive).toBeUndefined();
  });

  test('refreshes the target under a stationary mouse after scrolling', () => {
    pointer(element('#icon'), 'pointermove');
    hitTest.mockReturnValue(element('#next'));
    window.dispatchEvent(new Event('scroll'));
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '다음 설명',
    });
    hitTest.mockReturnValue(element('#title'));
    window.dispatchEvent(new Event('scroll'));
    expect(element('#code').dataset.craftCursorActive).toBeUndefined();
  });

  test('refreshes a disabled action without waiting for mouse movement', async () => {
    pointer(element('#next'), 'pointermove');
    hitTest.mockReturnValue(element('#next'));
    element('#next').setAttribute('disabled', '');
    await Promise.resolve();
    expect(onState).toHaveBeenLastCalledWith({
      visible: true,
      label: '마지막 설명입니다',
    });
  });

  test('restores prior attributes and removes listeners on disposal', () => {
    element('#dock').dataset.craftCursorActive = 'previous';
    document.documentElement.style.cursor = 'crosshair';
    pointer(element('#separator'), 'pointerdown');
    dispose();
    expect(element('#dock').dataset.craftCursorActive).toBe('previous');
    expect(document.documentElement.style.cursor).toBe('crosshair');
    expect(
      document.documentElement.dataset.craftCursorDragging
    ).toBeUndefined();
    expect(mediaListeners.size).toBe(0);
    onState.mockClear();
    pointer(element('#icon'), 'pointermove');
    expect(onState).not.toHaveBeenCalled();
  });
});

describe('cursor badge placement', () => {
  test('places the badge below the native pointer', () => {
    expect(
      getCursorBadgeOffset({
        x: 100,
        y: 100,
        width: 180,
        height: 30,
        viewportWidth: 800,
        viewportHeight: 600,
      })
    ).toEqual({ x: 18, y: 26 });
  });

  test('keeps the entire badge inside the right and bottom edges', () => {
    expect(
      getCursorBadgeOffset({
        x: 790,
        y: 590,
        width: 180,
        height: 40,
        viewportWidth: 800,
        viewportHeight: 600,
      })
    ).toEqual({ x: -182, y: -42 });
  });
});
