import { act, fireEvent, render, screen } from '@testing-library/react';

import { MDXZoomImage } from './zoom-image';

// open()의 2-frame rAF를 즉시 실행하여 cloneAnimated=true가 되도록 함
// close()의 스크롤 추적 rAF 루프는 무한 재귀 방지를 위해 최대 3회 실행
const originalRAF = globalThis.requestAnimationFrame;
let rafCallCount = 0;
beforeEach(() => {
  rafCallCount = 0;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    if (rafCallCount++ < 10) {
      cb(0);
    }
    return 0;
  };
});
afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF;
  rafCallCount = 0;
});

vi.mock('./zoom-image.module.css', () => ({
  default: { overlay: 'overlay', caption: 'caption', clone: 'clone' },
}));

vi.mock('next/image', () => {
  const { forwardRef } = require('react');
  const MockImage = forwardRef(
    (
      props: React.ImgHTMLAttributes<HTMLImageElement>,
      ref: React.Ref<HTMLImageElement>,
    ) => (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img ref={ref} {...props} />
    ),
  );
  MockImage.displayName = 'MockImage';
  return { default: MockImage };
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
    it('클릭하면 오버레이와 클론이 렌더링된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      expect(screen.getByRole('dialog')).toBeDefined();
      // 원본(hidden) + 클론 = 2개
      expect(screen.getAllByAltText('줌 테스트')).toHaveLength(2);
    });

    it('클릭하면 원본 이미지가 visibility: hidden이 된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.click(img);

      expect(img.style.visibility).toBe('hidden');
    });

    it('오버레이 클릭 시 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.click(screen.getByRole('dialog'));

      // 클론의 transitionEnd 시뮬레이션 → 포탈 언마운트
      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('클론 이미지 클릭으로도 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.click(clone);
      fireEvent.transitionEnd(clone);

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

    it('Escape로 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.keyDown(document, { key: 'Escape' });

      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('세로 wheel 입력이면 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 100, deltaX: 0 });

      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('가로 wheel 입력이면 줌이 유지된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 0, deltaX: 100 });

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('줌 닫힌 후 원본 이미지에 포커스가 복원된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.click(img);
      fireEvent.click(screen.getByRole('dialog'));
      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(document.activeElement).toBe(img);
    });

    it('Escape로 닫은 후 원본 이미지에 포커스가 복원된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.keyDown(img, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Escape' });
      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(document.activeElement).toBe(img);
    });

    it('줌인→줌아웃→Space로 다시 줌인할 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      // 1차 줌인
      fireEvent.keyDown(img, { key: ' ' });
      expect(screen.getByRole('dialog')).toBeDefined();

      // 줌아웃
      fireEvent.keyDown(document, { key: 'Escape' });
      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(img);

      // 2차 줌인 (포커스가 복원되었으므로 Space로 다시 열 수 있어야 함)
      fireEvent.keyDown(img, { key: ' ' });
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('줌 닫힌 후 원본 이미지가 다시 보인다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.click(img);
      expect(img.style.visibility).toBe('hidden');

      fireEvent.click(screen.getByRole('dialog'));
      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(img.style.visibility).not.toBe('hidden');
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
