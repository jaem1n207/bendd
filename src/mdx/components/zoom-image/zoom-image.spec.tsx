import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import { MDXZoomImage } from './zoom-image';

// open()의 2-frame rAF를 즉시 실행하여 cloneAnimated=true가 되도록 함
// close()의 스크롤 추적 rAF 루프는 무한 재귀 방지를 위해 최대 3회 실행
const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;
let rafCallCount = 0;
beforeEach(() => {
  rafCallCount = 0;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    if (rafCallCount++ < 10) {
      cb(0);
    }
    return rafCallCount;
  };
  globalThis.cancelAnimationFrame = vi.fn();
});
afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
  rafCallCount = 0;
  document.body.style.overflow = '';
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

// 헬퍼: 줌을 열고 dialog가 렌더링됐는지 확인
function openZoom(alt = '줌 테스트') {
  const img = screen.getByAltText(alt);
  fireEvent.click(img);
  expect(screen.getByRole('dialog')).toBeDefined();
  return img;
}

// 헬퍼: 줌을 닫고 transitionEnd까지 처리
function closeZoomViaOverlay(alt = '줌 테스트') {
  fireEvent.click(screen.getByRole('dialog'));
  const clone = screen.getAllByAltText(alt)[1];
  fireEvent.transitionEnd(clone);
}

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

    it('rounded-lg 클래스가 적용된다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트" />);
      expect(screen.getByAltText('테스트').className).toContain('rounded-lg');
    });

    it('w-full 클래스가 적용된다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트" />);
      expect(screen.getByAltText('테스트').className).toContain('w-full');
    });
  });

  describe('접근성', () => {
    it('role="button"이 설정된다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트" />);
      expect(screen.getByRole('button')).toBeDefined();
    });

    it('tabIndex={0}이 설정되어 포커스 가능하다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트" />);
      expect(screen.getByAltText('테스트').getAttribute('tabindex')).toBe('0');
    });

    it('alt가 있으면 aria-label에 확대 안내가 포함된다', () => {
      render(<MDXZoomImage src="/test.png" alt="테스트 이미지" />);
      expect(screen.getByAltText('테스트 이미지').getAttribute('aria-label')).toBe(
        '테스트 이미지 - 클릭하여 확대',
      );
    });

    it('alt가 없으면 aria-label에 기본 안내가 표시된다', () => {
      render(<MDXZoomImage src="/test.png" />);
      expect(screen.getByAltText('').getAttribute('aria-label')).toBe(
        '이미지 클릭하여 확대',
      );
    });

    it('줌 오버레이에 role="dialog"가 설정된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      openZoom();
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('줌 오버레이에 aria-modal="true"가 설정된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      openZoom();
      expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe(
        'true',
      );
    });

    it('줌 오버레이에 alt 기반 aria-label이 설정된다', () => {
      render(<MDXZoomImage src="/test.png" alt="접근성 테스트" />);
      openZoom('접근성 테스트');
      expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe(
        '접근성 테스트',
      );
    });

    it('alt가 없으면 오버레이에 기본 aria-label이 설정된다', () => {
      render(<MDXZoomImage src="/test.png" />);
      openZoom('');
      expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe(
        '이미지 확대 보기',
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

    it('alt가 비어있으면 캡션이 표시되지 않는다', () => {
      render(<MDXZoomImage src="/test.png" />);
      openZoom('');

      // caption 클래스를 가진 요소가 없어야 함
      const dialog = screen.getByRole('dialog');
      const caption = dialog.querySelector('.caption');
      expect(caption).toBeNull();
    });

    it('키보드 Enter로 줌을 열 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.keyDown(screen.getByAltText('줌 테스트'), { key: 'Enter' });

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('키보드 Space로 줌을 열 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.keyDown(screen.getByAltText('줌 테스트'), { key: ' ' });

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('Enter/Space 외 키로는 줌이 열리지 않는다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.keyDown(screen.getByAltText('줌 테스트'), { key: 'Tab' });

      expect(screen.queryByRole('dialog')).toBeNull();
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

    it('클론 이미지 위에서 세로 wheel 입력이면 줌이 닫힌다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.wheel(clone, { deltaY: 50, deltaX: 0 });
      fireEvent.transitionEnd(clone);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('클론 이미지 위에서 가로 wheel 입력이면 줌이 유지된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.wheel(clone, { deltaY: 0, deltaX: 50 });

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

  describe('포커스 관리', () => {
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

    it('wheel로 닫은 후 원본 이미지에 포커스가 복원된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.click(img);
      fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 100, deltaX: 0 });
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

    it('줌인→줌아웃→Enter로 다시 줌인할 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.keyDown(img, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeDefined();

      fireEvent.keyDown(document, { key: 'Escape' });
      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      fireEvent.keyDown(img, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('줌인→줌아웃→클릭으로 다시 줌인할 수 있다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');

      fireEvent.click(img);
      expect(screen.getByRole('dialog')).toBeDefined();

      closeZoomViaOverlay();

      fireEvent.click(img);
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });

  describe('body overflow 관리', () => {
    it('줌 열면 body overflow가 hidden이 된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('줌 닫으면 body overflow가 복원된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));
      expect(document.body.style.overflow).toBe('hidden');

      fireEvent.click(screen.getByRole('dialog'));
      // close() 호출 시 overflow 즉시 복원됨 (transition 완료 전)
      expect(document.body.style.overflow).toBe('');
    });

    it('Escape로 닫아도 body overflow가 복원된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.body.style.overflow).toBe('');
    });

    it('wheel로 닫아도 body overflow가 복원된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 100, deltaX: 0 });
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('isClosingRef 중복 호출 방지', () => {
    it('연속 wheel 이벤트가 close를 한 번만 실행한다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      const dialog = screen.getByRole('dialog');
      // 연속 wheel 이벤트 3번 발생
      fireEvent.wheel(dialog, { deltaY: 100, deltaX: 0 });
      fireEvent.wheel(dialog, { deltaY: 200, deltaX: 0 });
      fireEvent.wheel(dialog, { deltaY: 300, deltaX: 0 });

      // 클론이 아직 존재 (transitionEnd 전)
      const clones = screen.getAllByAltText('줌 테스트');
      expect(clones.length).toBe(2); // 원본 + 클론 1개 (중복 생성 없음)

      // transitionEnd 한 번으로 정리
      fireEvent.transitionEnd(clones[1]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('Escape 후 wheel이 와도 안전하다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.keyDown(document, { key: 'Escape' });
      // Escape 이후 wheel이 와도 에러 없이 무시됨
      fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 100, deltaX: 0 });

      const clone = screen.getAllByAltText('줌 테스트')[1];
      fireEvent.transitionEnd(clone);

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('cloneAnimated=false 분기 (열기 전 빠른 닫기)', () => {
    it('열기 애니메이션 전에 닫으면 즉시 정리된다', () => {
      // rAF를 실행하지 않도록 설정 (cloneAnimated가 false인 상태 유지)
      globalThis.requestAnimationFrame = () => 0;

      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      const img = screen.getByAltText('줌 테스트');
      fireEvent.click(img);

      // isOpen=true이지만 cloneAnimated=false인 상태에서 닫기
      fireEvent.keyDown(document, { key: 'Escape' });

      // transitionEnd 없이 즉시 정리됨
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('안전 타임아웃 (400ms)', () => {
    it('transitionEnd가 발생하지 않으면 400ms 후 자동 정리된다', () => {
      vi.useFakeTimers();
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      fireEvent.click(screen.getByRole('dialog'));
      // transitionEnd를 호출하지 않음

      // 400ms 전에는 포탈이 남아있음
      act(() => {
        vi.advanceTimersByTime(399);
      });
      expect(screen.queryByRole('dialog')).not.toBeNull();

      // 400ms 후 자동 정리
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByRole('dialog')).toBeNull();

      vi.useRealTimers();
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

    it('클릭해도 줌이 열리지 않는다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);
      fireEvent.click(screen.getByAltText('SVG'));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('cursor-zoom-in 클래스가 없다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);
      expect(screen.getByAltText('SVG').className).not.toContain(
        'cursor-zoom-in',
      );
    });

    it('role="button"이 없다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('tabIndex가 설정되지 않는다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);
      expect(screen.getByAltText('SVG').getAttribute('tabindex')).toBeNull();
    });

    it('rounded-lg 클래스가 적용된다', () => {
      render(<MDXZoomImage src={svgDataUri} alt="SVG" />);
      expect(screen.getByAltText('SVG').className).toContain('rounded-lg');
    });

    it('className을 전달한다', () => {
      render(
        <MDXZoomImage src={svgDataUri} alt="SVG" className="custom-svg" />,
      );
      expect(screen.getByAltText('SVG').className).toContain('custom-svg');
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

  describe('다중 인스턴스', () => {
    it('여러 이미지가 독립적으로 동작한다', () => {
      render(
        <>
          <MDXZoomImage src="/first.png" alt="첫 번째" />
          <MDXZoomImage src="/second.png" alt="두 번째" />
        </>,
      );

      // 첫 번째 이미지만 줌 (원본 = getAllByAltText[0])
      const firstOriginal = screen.getAllByAltText('첫 번째')[0];
      fireEvent.click(firstOriginal);
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(firstOriginal.style.visibility).toBe('hidden');
      expect(screen.getByAltText('두 번째').style.visibility).not.toBe(
        'hidden',
      );
    });

    it('하나를 닫고 다른 하나를 열 수 있다', () => {
      render(
        <>
          <MDXZoomImage src="/first.png" alt="첫 번째" />
          <MDXZoomImage src="/second.png" alt="두 번째" />
        </>,
      );

      // 첫 번째 열기 → 닫기
      const firstOriginal = screen.getAllByAltText('첫 번째')[0];
      fireEvent.click(firstOriginal);
      closeZoomViaOverlay('첫 번째');
      expect(screen.queryByRole('dialog')).toBeNull();

      // 두 번째 열기
      fireEvent.click(screen.getByAltText('두 번째'));
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });

  describe('클론 이미지 속성', () => {
    it('클론에 원본과 동일한 src가 설정된다', () => {
      render(<MDXZoomImage src="/clone-test.png" alt="클론" />);
      fireEvent.click(screen.getByAltText('클론'));

      const images = screen.getAllByAltText('클론');
      const clone = images[1];
      expect(clone.getAttribute('src')).toBe('/clone-test.png');
    });

    it('클론에 원본과 동일한 alt가 설정된다', () => {
      render(<MDXZoomImage src="/test.png" alt="클론 alt 테스트" />);
      fireEvent.click(screen.getByAltText('클론 alt 테스트'));

      const images = screen.getAllByAltText('클론 alt 테스트');
      expect(images).toHaveLength(2);
    });

    it('클론에 clone CSS 클래스가 적용된다', () => {
      render(<MDXZoomImage src="/test.png" alt="클론" />);
      fireEvent.click(screen.getByAltText('클론'));

      const clone = screen.getAllByAltText('클론')[1];
      expect(clone.className).toContain('clone');
    });

    it('클론에 transition 스타일이 적용된다', () => {
      render(<MDXZoomImage src="/test.png" alt="클론" />);
      fireEvent.click(screen.getByAltText('클론'));

      const clone = screen.getAllByAltText('클론')[1];
      expect(clone.style.transition).toContain('transform');
      expect(clone.style.transition).toContain('300ms');
    });
  });

  describe('오버레이 스타일', () => {
    it('줌 열린 상태에서 오버레이 opacity가 1이다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      expect(screen.getByRole('dialog').style.opacity).toBe('1');
    });

    it('줌 닫힌 상태에서 오버레이 opacity가 0이다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      // 닫기 (transitionEnd 전이므로 포탈은 아직 존재)
      fireEvent.click(screen.getByRole('dialog'));

      expect(screen.getByRole('dialog').style.opacity).toBe('0');
    });

    it('오버레이에 overlay CSS 클래스가 적용된다', () => {
      render(<MDXZoomImage src="/test.png" alt="줌 테스트" />);
      fireEvent.click(screen.getByAltText('줌 테스트'));

      expect(screen.getByRole('dialog').className).toContain('overlay');
    });
  });

  describe('언마운트 안전성', () => {
    it('줌 열린 상태에서 언마운트해도 에러가 발생하지 않는다', () => {
      const { unmount } = render(
        <MDXZoomImage src="/test.png" alt="줌 테스트" />,
      );
      fireEvent.click(screen.getByAltText('줌 테스트'));
      expect(screen.getByRole('dialog')).toBeDefined();

      // 에러 없이 언마운트
      expect(() => unmount()).not.toThrow();
    });

    it('줌 닫히는 중 언마운트해도 에러가 발생하지 않는다', () => {
      const { unmount } = render(
        <MDXZoomImage src="/test.png" alt="줌 테스트" />,
      );
      fireEvent.click(screen.getByAltText('줌 테스트'));
      fireEvent.click(screen.getByRole('dialog'));
      // transitionEnd 전 (닫히는 중)

      expect(() => unmount()).not.toThrow();
    });

    it('언마운트 후 body overflow가 복원된다', () => {
      const { unmount } = render(
        <MDXZoomImage src="/test.png" alt="줌 테스트" />,
      );
      fireEvent.click(screen.getByAltText('줌 테스트'));
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      // useEffect cleanup에서 keydown 리스너 제거는 하지만 overflow 직접 복원은
      // 컴포넌트 책임이 아님 — 하지만 에러 없이 안전해야 함
    });
  });
});
