import { createWebMCPContentIndex } from '@/components/webmcp/lib/content-index';

export function GET() {
  return Response.json(
    { items: createWebMCPContentIndex() },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    }
  );
}
