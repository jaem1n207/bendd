'use client';

import { NextRequest, userAgent } from 'next/server';
import { useLayoutEffect } from 'react';

export function BrowserDetector() {
  useLayoutEffect(() => {
    const request = new NextRequest(window.location.href);
    const ua = userAgent(request);
    document.documentElement.classList.add(`browser-${ua.browser.name}`);
  }, []);

  return null;
}
