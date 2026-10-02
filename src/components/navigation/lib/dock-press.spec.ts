import { afterEach, describe, expect, test, vi } from 'vitest';

import { DockPressState } from '@/components/navigation/consts/dock';
import { createDockPress } from '@/components/navigation/lib/dock-press';

const disposers: Array<() => void> = [];

function fixture() {
  const root = document.createElement('div');
  const item = document.createElement('div');
  item.dataset.navigationItem = '';
  const button = document.createElement('button');
  button.textContent = 'Home';
  button.getBoundingClientRect = () => new DOMRect(10, 20, 40, 40);
  const activate = vi.fn();
  button.addEventListener('click', activate);
  item.append(button);
  root.append(item);
  document.body.append(root);
  const dispose = createDockPress(root);
  disposers.push(dispose);
  return { root, item, button, activate, dispose };
}

function pointer(
  target: EventTarget,
  type: string,
  options: {
    x?: number;
    y?: number;
    id?: number;
    button?: number;
    primary?: boolean;
    pointerType?: string;
  } = {}
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: options.x ?? 30,
    clientY: options.y ?? 40,
    button: options.button ?? 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.id ?? 1 },
    isPrimary: { value: options.primary ?? true },
    pointerType: { value: options.pointerType ?? 'mouse' },
  });
  target.dispatchEvent(event);
}

function click(button: HTMLElement, detail = 1) {
  return button.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, detail })
  );
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Dock press feedback', () => {
  for (const pointerType of ['mouse', 'touch']) {
    test(`holds feedback and activates once at native click for ${pointerType}`, () => {
      const { item, button, activate } = fixture();
      pointer(button, 'pointerdown', { pointerType });
      expect(item.dataset.dockPress).toBe(DockPressState.Pressed);
      expect(activate).not.toHaveBeenCalled();
      pointer(document, 'pointerup', { pointerType });
      expect(item.dataset.dockPress).toBe(DockPressState.Released);
      expect(activate).not.toHaveBeenCalled();
      click(button);
      expect(activate).toHaveBeenCalledOnce();
    });
  }

  for (const options of [{ button: 2 }, { primary: false }]) {
    test(`ignores a secondary input: ${JSON.stringify(options)}`, () => {
      const { item, button } = fixture();
      pointer(button, 'pointerdown', options);
      expect(item.dataset.dockPress).toBeUndefined();
    });
  }

  test('ignores disabled controls and the separator outside an item', () => {
    const { item, button, root } = fixture();
    button.disabled = true;
    pointer(button, 'pointerdown');
    expect(item.dataset.dockPress).toBeUndefined();
    button.disabled = false;
    button.setAttribute('aria-disabled', 'true');
    pointer(button, 'pointerdown');
    expect(item.dataset.dockPress).toBeUndefined();
    const separator = document.createElement('button');
    root.append(separator);
    pointer(separator, 'pointerdown');
    expect(separator.dataset.dockPress).toBeUndefined();
  });

  test('cancels an outward drag and suppresses its click even after re-entry', () => {
    const { item, button, activate } = fixture();
    pointer(button, 'pointerdown');
    pointer(document, 'pointermove', { x: 80 });
    expect(item.dataset.dockPress).toBe(DockPressState.Released);
    pointer(document, 'pointermove');
    pointer(button, 'pointerup');
    expect(click(button)).toBe(false);
    expect(activate).not.toHaveBeenCalled();
    pointer(button, 'pointerdown');
    pointer(button, 'pointerup');
    expect(click(button)).toBe(true);
    expect(activate).toHaveBeenCalledOnce();
  });

  test('cancels an outside release even when the last move was not delivered', () => {
    const { item, button, activate } = fixture();
    pointer(button, 'pointerdown');
    pointer(document, 'pointerup', { y: 100 });
    expect(item.dataset.dockPress).toBe(DockPressState.Released);
    click(button);
    expect(activate).not.toHaveBeenCalled();
  });

  test('does not let another pointer move, release, or cancel the active press', () => {
    const { item, button } = fixture();
    pointer(button, 'pointerdown');
    pointer(document, 'pointermove', { id: 2, x: 100 });
    pointer(document, 'pointerup', { id: 2 });
    pointer(document, 'pointercancel', { id: 2 });
    expect(item.dataset.dockPress).toBe(DockPressState.Pressed);
    pointer(document, 'pointerup');
    expect(item.dataset.dockPress).toBe(DockPressState.Released);
  });

  const abortEvents: Array<{
    reason: string;
    dispatch: (root: HTMLElement) => void;
  }> = [
    {
      reason: 'pointercancel',
      dispatch: () => pointer(document, 'pointercancel'),
    },
    { reason: 'blur', dispatch: () => window.dispatchEvent(new Event('blur')) },
    {
      reason: 'hidden',
      dispatch: () => {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
      },
    },
    {
      reason: 'pointerleave',
      dispatch: () => document.dispatchEvent(new Event('pointerleave')),
    },
    {
      reason: 'contextmenu',
      dispatch: root =>
        root.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })),
    },
  ];

  for (const { reason, dispatch } of abortEvents) {
    test(`clears feedback immediately and blocks activation after ${reason}`, () => {
      const { root, item, button, activate } = fixture();
      pointer(button, 'pointerdown');
      dispatch(root);
      expect(item.dataset.dockPress).toBe(DockPressState.Cancelled);
      click(button);
      expect(activate).not.toHaveBeenCalled();
    });
  }

  test('stops a release transition when the window loses focus', () => {
    const { item, button } = fixture();
    pointer(button, 'pointerdown');
    pointer(button, 'pointerup');
    window.dispatchEvent(new Event('blur'));
    expect(item.dataset.dockPress).toBe(DockPressState.Cancelled);
  });

  test('keeps rapid re-presses immediate without delaying activation', () => {
    const { item, button, activate } = fixture();
    for (let count = 0; count < 3; count += 1) {
      pointer(button, 'pointerdown');
      expect(item.dataset.dockPress).toBe(DockPressState.Pressed);
      pointer(button, 'pointerup');
      click(button);
      expect(activate).toHaveBeenCalledTimes(count + 1);
    }
  });

  test('keeps keyboard activation available after cancelling a pointer press', () => {
    const { item, button, activate } = fixture();
    pointer(button, 'pointerdown');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(item.dataset.dockPress).toBe(DockPressState.Cancelled);
    click(button, 0);
    expect(activate).toHaveBeenCalledOnce();
  });

  test('preserves a modified native click instead of cancelling on a modifier key', () => {
    const { item, button, activate } = fixture();
    pointer(button, 'pointerdown');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Meta', metaKey: true })
    );
    expect(item.dataset.dockPress).toBe(DockPressState.Pressed);
    pointer(button, 'pointerup');
    click(button);
    expect(activate).toHaveBeenCalledOnce();
  });

  test('removes input listeners and the click guard on dispose', () => {
    const { item, button, activate, dispose } = fixture();
    pointer(button, 'pointerdown');
    dispose();
    expect(item.dataset.dockPress).toBe(DockPressState.Cancelled);
    pointer(button, 'pointerdown');
    expect(item.dataset.dockPress).toBe(DockPressState.Cancelled);
    click(button);
    expect(activate).toHaveBeenCalledOnce();
  });
});
