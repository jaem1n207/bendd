import { fireEvent, render, screen } from '@testing-library/react';

import { MDXZoomImage } from './zoom-image';

vi.mock('./zoom-image.module.css', () => ({
  default: { overlay: 'overlay', caption: 'caption' },
}));

vi.mock('next/image', () => {
  const { forwardRef } = require('react');
  return {
    default: forwardRef(
      (
        props: React.ImgHTMLAttributes<HTMLImageElement>,
        ref: React.Ref<HTMLImageElement>,
      ) => (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img ref={ref} {...props} />
      ),
    ),
  };
});

describe('MDXZoomImage', () => {
  describe('일반 이미지', () => {
    it('이미지를 렌더링한다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트 이미지" />);
      expect(screen.getByAltText('테스트 이미지')).toBeDefined();
    });

    it('alt가 없으면 빈 문자열을 기본값으로 사용한다', () => {
      render(<MDXZoomImage src="/test.png" />);
      expect(screen.getByAltText('')).toBeDefined();
    });

    it('className을 전달한다', () => {
      render(
        <MDXZoomImage src="/test.png" alt="테스트" className="custom-class" />,
      );
      expect(screen.getByAltText('테스트').className).toContain('custom-class');
    });

    it('cursor-zoom-in 클래스가 적용된다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트" />);
      expect(screen.getByAltText('테스트').className).toContain(
        'cursor-zoom-in',
      );
    });
  });

  describe('줌 동작', () => {
    it('클릭하면 오버레이가 마운트된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);

      fireEvent.click(screen.getByAltText('줌 테스트'));

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('오버레이 클릭 시 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);

      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.click(screen.getByRole('dialog'));

      fireEvent.transitionEnd(screen.getByAltText('줌 테스트'));

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('이미지 클릭으로도 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);

      fireEvent.click(screen.getByAltText('줌 테스트'));
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.transitionEnd(screen.getByAltText('줌 테스트'));

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('줌 열면 alt 텍스트가 캡션으로 표시된다', () => {
      render(<MDXZoomImage src="/test.png" alt="캡션 테스트" />);

      fireEvent.click(screen.getByAltText('캡션 테스트'));

      expect(screen.getByText('캡션 테스트')).toBeDefined();
    });

    it('키보드 Enter로 줌을 열 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);

      fireEvent.keyDown(screen.getByAltText('줌 테스트'), { key: 'Enter' });

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
