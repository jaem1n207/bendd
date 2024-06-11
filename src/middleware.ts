import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/rss.xml')) {
    return NextResponse.rewrite(new URL('/api/feed', request.url));
  }
}
