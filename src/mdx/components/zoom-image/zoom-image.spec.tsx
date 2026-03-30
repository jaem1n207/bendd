import { render, screen } from '@testing-library/react';

import { MDXZoomImage } from './zoom-image';

vi.mock('react-medium-image-zoom', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="zoom-wrapper">{children}</div>
  ),
}));

vi.mock('react-medium-image-zoom/dist/styles.css', () => ({}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

describe('MDXZoomImage', () => {
  describe('일반 이미지', () => {
    it('Zoom 래퍼로 감싸서 렌더링한다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트 이미지" />);

      expect(screen.getByTestId('zoom-wrapper')).toBeDefined();
      expect(screen.getByAltText('테스트 이미지')).toBeDefined();
    });

    it('Next.js Image 컴포넌트를 사용한다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트" />);

      const img = screen.getByAltText('테스트');
      expect(img.getAttribute('src')).toBe('/test.png');
    });

    it('alt가 없으면 빈 문자열을 기본값으로 사용한다', () => {
      render(<MDXZoomImage src="/test.png" />);

      const img = screen.getByAltText('');
      expect(img.getAttribute('alt')).toBe('');
    });

    it('className을 전달한다', () => {
      render(
        <MDXZoomImage src="/test.png" alt="테스트" className="custom-class" />
      );

      const img = screen.getByAltText('테스트');
      expect(img.className).toContain('custom-class');
    });
  });

  describe('SVG data URI', () => {
    const svgDataUri = 'data:image/svg+xml;base64,PHN2Zz4=';

    it('Zoom 래퍼 없이 렌더링한다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);

      expect(screen.queryByTestId('zoom-wrapper')).toBeNull();
      expect(screen.getByAltText('SVG')).toBeDefined();
    });

    it('일반 img 태그를 사용한다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);

      const img = screen.getByAltText('SVG');
      expect(img.tagName).toBe('IMG');
      expect(img.getAttribute('src')).toBe(svgDataUri);
    });
  });

  describe('에러 처리', () => {
    it('src가 없으면 에러를 던진다', () => {
      expect(() => {
        render(<MDXZoomImage src="" alt="에러" />);
      }).toThrow('src is required for ZoomImage');
    });

    it('src가 undefined이면 에러를 던진다', () => {
      expect(() => {
        render(<MDXZoomImage src={undefined} alt="에러" />);
      }).toThrow('src is required for ZoomImage');
    });
  });
});
