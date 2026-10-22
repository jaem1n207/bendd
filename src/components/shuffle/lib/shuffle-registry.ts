type ShuffleDemo = {
  element: HTMLElement;
  run: (input: unknown) => ShuffleResult;
  stop: () => ShuffleResult;
};
export type ShuffleResult =
  | { ok: true; text?: string; iterations?: number; fps?: number }
  | { ok: false; error: string };
const demos = new Set<ShuffleDemo>();
const listeners = new Set<() => void>();

export function observeShuffleDemos(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function connectShuffleDemo(demo: ShuffleDemo) {
  demos.add(demo);
  listeners.forEach(listener => listener());
  return () => {
    demos.delete(demo);
    listeners.forEach(listener => listener());
  };
}

function readyDemos(doc: Document) {
  return [...demos].filter(
    ({ element }) => element.isConnected && element.ownerDocument === doc
  );
}

export function hasShuffleDemo(doc: Document) {
  return readyDemos(doc).length > 0;
}

function singleDemo(doc: Document) {
  const ready = readyDemos(doc);
  if (ready.length !== 1) {
    return {
      ok: false as const,
      error: ready.length
        ? '실행 대상이 모호합니다. 준비된 데모가 여러 개입니다.'
        : '준비된 Shuffle 데모가 없습니다.',
    };
  }
  return { ok: true as const, demo: ready[0] };
}

export function runShuffleDemo(
  input: unknown,
  doc: Document = document
): ShuffleResult {
  const target = singleDemo(doc);
  return target.ok ? target.demo.run(input) : target;
}

export function stopShuffleDemo(doc: Document = document): ShuffleResult {
  const target = singleDemo(doc);
  return target.ok ? target.demo.stop() : target;
}
