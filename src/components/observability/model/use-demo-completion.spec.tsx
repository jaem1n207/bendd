import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DEMO_EVENT } from '@/components/observability/lib/analytics';
import { useDemoCompletion } from '@/components/observability/model/use-demo-completion';

it('이전 페이지에서 종료된 데모를 새 페이지의 완료로 기록하지 않는다', () => {
  const event = vi.fn();
  window.addEventListener(DEMO_EVENT, event);
  const hook = renderHook(() => useDemoCompletion('shuffle-letters'));
  const complete = hook.result.current;
  act(() => complete());
  hook.unmount();
  act(() => complete());
  expect(event).toHaveBeenCalledTimes(1);
  window.removeEventListener(DEMO_EVENT, event);
});
