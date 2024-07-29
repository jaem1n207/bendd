import { NextRequest, NextResponse, userAgent } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/rss.xml')) {
    return NextResponse.rewrite(new URL('/api/feed', request.url));
  }

  if (request.nextUrl.pathname.startsWith('/playground')) {
    const isBot = userAgent(request).isBot;

    if (isBot) {
      return new NextResponse(null, { status: 404 });
    }

    // 실제 사용자에게는 정상적으로 페이지를 보여줍니다.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/rss.xml', '/playground/:path*'],
};
