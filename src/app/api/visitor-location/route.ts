import { visitorLocationFromHeaders } from '@/lib/visitor-location';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET(request: Request) {
  return Response.json(
    { location: visitorLocationFromHeaders(request.headers) },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    }
  );
}
