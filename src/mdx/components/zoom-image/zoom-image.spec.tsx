import { fireEvent, render, screen } from '@testing-library/react';

import { MDXZoomImage } from './zoom-image';

// framer-motion의 motion 컴포넌트를 HTML 요소로 모킹
function filterDOMProps(props: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (
      key === 'children' ||
      key.startsWith('on') ||
      key === 'className' ||
      key === 'role' ||
      key === 'src' ||
      key === 'alt' ||
      key.startsWith('aria-') ||
      key.startsWith('data-')
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

vi.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = (props: Record<string, unknown>) => {
      const { children, ...rest } = filterDOMProps(props) as Record<string, unknown> & { children?: React.ReactNode };
      const El = Tag as React.ElementType;
      return <El {...rest}>{children}</El>;
    };
    Component.displayName = `motion.${Tag}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      img: createMotionComponent('img'),
      figcaption: createMotionComponent('figcaption'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

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

    it('줌 이미지 클릭 시에도 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const dialog = screen.getByRole('dialog');
      // 오버레이(dialog)를 클릭하면 닫힘 — 이미지 클릭도 버블링으로 닫힘
      fireEvent.click(dialog);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('줌 열면 alt 텍스트가 캡션으로 표시된다', () => {
      render(<MDXZoomImage src="/test.png" alt="캡션 테스트" />);
      fireEvent.click(screen.getByAltText('캡션 테스트'));

      expect(screen.getByText('캡션 테스트')).toBeDefined();
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
