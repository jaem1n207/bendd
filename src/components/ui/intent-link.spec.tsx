import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntentLink } from '@/components/ui/intent-link';

const { prefetch } = vi.hoisted(() => ({ prefetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch }) }));

describe('IntentLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for intent and deduplicates pointer, focus, and touch prefetches', () => {
    render(<IntentLink href="/article">Writing</IntentLink>);
    const link = screen.getByRole('link', { name: 'Writing' });
    expect(prefetch).not.toHaveBeenCalled();
    fireEvent.pointerEnter(link);
    fireEvent.focus(link);
    fireEvent.touchStart(link);
    expect(prefetch).toHaveBeenCalledOnce();
    expect(prefetch).toHaveBeenCalledWith('/article');
    expect(link.getAttribute('href')).toBe('/article');
  });

  it('supports keyboard intent and a changed destination', () => {
    const { rerender } = render(
      <IntentLink href="/article">Writing</IntentLink>
    );
    fireEvent.focus(screen.getByRole('link', { name: 'Writing' }));
    rerender(<IntentLink href="/craft">Craft</IntentLink>);
    fireEvent.focus(screen.getByRole('link', { name: 'Craft' }));
    expect(prefetch.mock.calls).toEqual([['/article'], ['/craft']]);
  });

  it('honors a caller that cancels prefetching', () => {
    render(
      <IntentLink href="/article" onFocus={event => event.preventDefault()}>
        Writing
      </IntentLink>
    );
    fireEvent.focus(screen.getByRole('link', { name: 'Writing' }));
    expect(prefetch).not.toHaveBeenCalled();
  });
});
