import { fireEvent, render, screen } from '@testing-library/react';

import { MDXZoomImage } from './zoom-image';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (
          key.startsWith('on') ||
          key === 'className' ||
          key === 'role' ||
          key.startsWith('aria-') ||
          key.startsWith('data-')
        ) {
          safeProps[key] = value;
        }
      }
      return <div {...(safeProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    img: (
      props: React.ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>,
    ) => {
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (
          key.startsWith('on') ||
          key === 'className' ||
          key === 'src' ||
          key === 'alt' ||
          key === 'role' ||
          key.startsWith('aria-') ||
          key.startsWith('data-')
        ) {
          safeProps[key] = value;
        }
      }
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      return <img {...(safeProps as React.ImgHTMLAttributes<HTMLImageElement>)} />;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('./zoom-image.module.css', () => ({
  default: { overlay: 'overlay', image: 'image' },
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

describe('MDXZoomImage', () => {
  describe('일반 이미지', () => {
    it('이미지를 렌더링한다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트 이미지" />);
      expect(screen.getByAltText('테스트 이미지')).toBeDefined();
    });

    it('alt가 없으면 빈 문자열을 기본값으로 사용한다', () => {
      render(<MDXZoomImage src="/test.png" />);
      const img = screen.getByAltText('');
      expect(img.getAttribute('alt')).toBe('');
    });

    it('className을 전달한다', () => {
      render(
        <MDXZoomImage src="/test.png" alt="테스트" className="custom-class" />,
      );
      const img = screen.getByAltText('테스트');
      expect(img.className).toContain('custom-class');
    });
  });

  describe('줌 동작', () => {
    it('클릭하면 줌 오버레이가 열린다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.click(img);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
    });

    it('오버레이 클릭 시 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('줌 이미지 클릭 시 오버레이가 닫히지 않는다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const images = screen.getAllByAltText('줌 테스트');
      const zoomedImg = images[1];
      fireEvent.click(zoomedImg);

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('키보드 Enter로 줌을 열 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.keyDown(img, { key: 'Enter' });

      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });

  describe('SVG data URI', () => {
    const svgDataUri = 'data:image/svg+xml;base64,PHN2Zz4=';

    it('줌 없이 렌더링한다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);

      expect(screen.queryByRole('button')).toBeNull();
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
