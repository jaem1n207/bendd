import { FluidHover } from '@/components/ui/fluid-hover';
import * as highlightComponents from '@/components/ui/fluid-hover-highlight';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, type ComponentPropsWithRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ROW_HEIGHT = 40;
const ROW_PITCH = 60;

function Rows({ labels = ['One', 'Two', 'Three'] }: { labels?: string[] }) {
  return (
    <FluidHover>
      <ol data-testid="list">
        {labels.map((label, index) => (
          <li key={label}>
            <button
              data-fluid-hover-item=""
              data-row={index}
              disabled={label === 'Disabled'}
            >
              {label}
            </button>
          </li>
        ))}
      </ol>
    </FluidHover>
  );
}

function Deferred({
  open,
  ...props
}: ComponentPropsWithRef<'div'> & { open: boolean }) {
  return open ? <div {...props} /> : null;
}

async function frame() {
  for (let index = 0; index < 6; index++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });
  }
}

describe('FluidHover integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.row ? ROW_HEIGHT : 180;
      }
    );
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(
      function (this: HTMLElement) {
        return Number(this.dataset.row ?? 0) * ROW_PITCH;
      }
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return new DOMRect(
          0,
          Number(this.dataset.row ?? 0) * ROW_PITCH,
          200,
          this.offsetHeight
        );
      }
    );
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
      function (this: HTMLElement) {
        const rect = this.getBoundingClientRect();
        return Object.assign([rect], { item: () => rect });
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('keeps the same highlight mounted while crossing rows and gaps', async () => {
    render(<Rows />);
    await frame();
    const list = screen.getByTestId('list');
    fireEvent.mouseMove(list, { clientX: 50, clientY: 20 });
    await frame();
    const highlight = list.querySelector('[data-slot="fluid-hover-highlight"]');
    expect(highlight).not.toBeNull();
    expect(
      screen.getByText('One').hasAttribute('data-fluid-hover-active')
    ).toBe(true);

    fireEvent.mouseMove(list, { clientX: 50, clientY: 57 });
    await frame();
    expect(
      screen.getByText('Two').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
    expect(list.querySelector('[data-slot="fluid-hover-highlight"]')).toBe(
      highlight
    );
    expect(
      Array.from(list.children).every(child => child instanceof HTMLLIElement)
    ).toBe(true);
  });

  it('uses group travel for pointers and snaps keyboard focus on the same highlight', async () => {
    const highlightRender = vi.spyOn(
      highlightComponents,
      'FluidHoverHighlight'
    );
    const pointerTransition = { duration: 0.05 };
    render(
      <FluidHover transition={pointerTransition}>
        <div data-testid="list">
          <button data-fluid-hover-item="" data-row="0">
            One
          </button>
          <button data-fluid-hover-item="" data-row="1">
            Two
          </button>
        </div>
      </FluidHover>
    );
    await frame();
    const list = screen.getByTestId('list');
    fireEvent.mouseMove(list, { clientX: 50, clientY: 20 });
    await frame();
    const highlight = list.querySelector('[data-slot="fluid-hover-highlight"]');

    fireEvent.mouseMove(list, { clientX: 50, clientY: 80 });
    await frame();
    expect(highlightRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ transition: pointerTransition }),
      undefined
    );

    fireEvent.keyDown(screen.getByText('Two'), { key: 'Tab' });
    await frame();
    expect(highlightRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ transition: false }),
      undefined
    );

    fireEvent.mouseMove(list, { clientX: 50, clientY: 20 });
    await frame();
    expect(highlightRender).toHaveBeenLastCalledWith(
      expect.objectContaining({ transition: pointerTransition }),
      undefined
    );

    expect(list.querySelector('[data-slot="fluid-hover-highlight"]')).toBe(
      highlight
    );
  });

  it('skips disabled rows and preserves native clicks in gaps', async () => {
    const click = vi.fn();
    render(
      <div onClick={click}>
        <Rows labels={['One', 'Disabled', 'Three']} />
      </div>
    );
    await frame();
    const list = screen.getByTestId('list');
    fireEvent.mouseMove(list, { clientX: 50, clientY: 80 });
    await frame();
    expect(
      screen.getByText('Disabled').hasAttribute('data-fluid-hover-active')
    ).toBe(false);
    fireEvent.click(list);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('moves off an item disabled while the pointer is stationary', async () => {
    render(<Rows />);
    await frame();
    fireEvent.mouseMove(screen.getByTestId('list'), {
      clientX: 50,
      clientY: 20,
    });
    await frame();
    screen.getByRole('button', { name: 'One' }).setAttribute('disabled', '');
    await frame();
    expect(
      screen.getByText('One').hasAttribute('data-fluid-hover-active')
    ).toBe(false);
    expect(
      screen.getByText('Two').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
  });

  it('follows keyboard focus and clears on leaving the group', async () => {
    render(
      <>
        <Rows />
        <button>Outside</button>
      </>
    );
    await frame();
    fireEvent.focus(screen.getByText('Two'));
    expect(
      screen.getByText('Two').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
    fireEvent.blur(screen.getByText('Two'), {
      relatedTarget: screen.getByText('Outside'),
    });
    expect(
      screen.getByTestId('list').hasAttribute('data-fluid-hover-active-index')
    ).toBe(false);
  });

  it('recalculates a stationary pointer after scrolling', async () => {
    render(<Rows />);
    await frame();
    const list = screen.getByTestId('list');
    fireEvent.mouseMove(list, { clientX: 50, clientY: 20 });
    await frame();
    list.scrollTop = ROW_PITCH;
    fireEvent.scroll(list);
    await frame();
    expect(
      screen.getByText('Two').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
  });

  it('updates registrations after removal without retaining a stale active row', async () => {
    const { rerender } = render(<Rows />);
    await frame();
    const list = screen.getByTestId('list');
    fireEvent.mouseMove(list, { clientX: 50, clientY: 140 });
    await frame();
    rerender(<Rows labels={['One']} />);
    await frame();
    expect(
      screen.getByText('One').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
    fireEvent.mouseMove(list, { clientX: 50, clientY: 20 });
    await frame();
    expect(
      screen.getByText('One').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
  });

  it('registers correctly through Strict Mode effect replay', async () => {
    render(
      <StrictMode>
        <Rows />
      </StrictMode>
    );
    await frame();
    fireEvent.mouseMove(screen.getByTestId('list'), {
      clientX: 50,
      clientY: 80,
    });
    await frame();
    expect(
      screen.getByText('Two').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
  });

  it('registers a popup whose DOM mounts after the adapter', async () => {
    const popup = (open: boolean) => (
      <FluidHover>
        <Deferred open={open} data-testid="popup">
          <button data-fluid-hover-item="" data-row="0">
            Popup item
          </button>
        </Deferred>
      </FluidHover>
    );
    const { rerender } = render(popup(false));
    await frame();
    rerender(popup(true));
    await frame();
    fireEvent.mouseMove(screen.getByTestId('popup'), {
      clientX: 50,
      clientY: 20,
    });
    await frame();
    expect(
      screen.getByText('Popup item').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
  });

  it('does not leave a sticky highlight from synthesized touch mouse events', async () => {
    render(<Rows />);
    await frame();
    const list = screen.getByTestId('list');
    const touch = new Event('pointerdown', { bubbles: true });
    Object.defineProperty(touch, 'pointerType', { value: 'touch' });
    fireEvent(list, touch);
    fireEvent.mouseMove(list, { clientX: 50, clientY: 20 });
    await frame();
    expect(list.hasAttribute('data-fluid-hover-active-index')).toBe(false);
  });

  it('keeps nested hover groups independent', async () => {
    render(
      <FluidHover>
        <div data-testid="outer">
          <button data-fluid-hover-item="" data-row="0">
            Outer
          </button>
          <Rows />
        </div>
      </FluidHover>
    );
    await frame();
    fireEvent.mouseMove(screen.getByTestId('list'), {
      clientX: 50,
      clientY: 80,
    });
    await frame();
    expect(
      screen.getByText('Two').hasAttribute('data-fluid-hover-active')
    ).toBe(true);
    expect(
      screen.getByTestId('outer').hasAttribute('data-fluid-hover-active-index')
    ).toBe(false);
  });
});
