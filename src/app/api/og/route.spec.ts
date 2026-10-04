// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, test } from 'vitest';

import { GET } from '@/app/api/og/route';

const HTTP_OK = 200;
const WIDTH = 1200;
const HEIGHT = 630;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

describe('Node.js OG 이미지 응답', () => {
  test('라이트·다크 테마에서 실제 PNG를 생성한다', async () => {
    for (const theme of ['light', 'dark']) {
      const response = await GET(
        new NextRequest('https://bendd.me/api/og?title=Observability', {
          headers: { 'Sec-CH-Prefers-Color-Scheme': theme },
        })
      );
      expect(response.status).toBe(HTTP_OK);
      expect(response.headers.get('content-type')).toBe('image/png');
      const image = await response.arrayBuffer();
      expect([...new Uint8Array(image).slice(0, PNG_SIGNATURE.length)]).toEqual(
        PNG_SIGNATURE
      );
      const header = new DataView(image);
      expect(header.getUint32(16)).toBe(WIDTH);
      expect(header.getUint32(20)).toBe(HEIGHT);
    }
  });
});
