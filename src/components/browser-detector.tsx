'use client';

import { NextRequest, userAgent } from 'next/server';
import { useLayoutEffect } from 'react';

export function BrowserDetector() {
  useLayoutEffect(() => {
    const request = new NextRequest(window.location.href);
    const ua = userAgent(request);
    const browserName = ua.browser.name?.toLowerCase().replace(/\s+/g, '-');
    document.documentElement.classList.add(`browser-${browserName}`);
  }, []);

  return null;
}
