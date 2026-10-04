const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]';

export function containPrivacyDialog(panel: HTMLElement, close: () => void) {
  const opener = document.activeElement;
  const parent = panel.closest('[data-privacy-root]');
  const elements = Array.from(document.body.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element !== parent
  );
  const previousInert = elements.map(element => element.inert === true);
  const previousOverflow = document.body.style.overflow;
  const previousPadding = document.body.style.paddingRight;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  elements.forEach(element => {
    element.inert = true;
  });
  document.body.style.overflow = 'hidden';
  if (scrollbar > 0 && document.documentElement.clientWidth > 0) {
    document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
  }

  const focusFirst = () =>
    panel.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const controls = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  const focusin = (event: FocusEvent) => {
    if (event.target instanceof Node && !panel.contains(event.target)) {
      focusFirst();
    }
  };
  focusFirst();
  document.addEventListener('keydown', keydown);
  document.addEventListener('focusin', focusin);

  return () => {
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('focusin', focusin);
    elements.forEach((element, index) => {
      element.inert = previousInert[index];
    });
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPadding;
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus({ preventScroll: true });
    }
  };
}
