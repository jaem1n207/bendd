import { createWebMCPContentIndex } from '@/components/webmcp/lib/content-index';

export const dynamic = 'force-static';

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
