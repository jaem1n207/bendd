type CharType =
  | 'space'
  | 'lowerCase'
  | 'upperCase'
  | 'digit'
  | 'symbol'
  | 'korean';

const charPools: Record<CharType, string> = {
  lowerCase: 'abcdefghijklmnopqrstuvwxyz',
  upperCase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digit: '0123456789',
  symbol: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  korean: '',
  space: ' ',
};

function getRandomCharacterForType(charType: CharType): string {
  const pool = charPools[charType];

  if (charType === 'korean') {
    return String.fromCharCode(0xac00 + Math.floor(Math.random() * 11172));
  }

  return pool[Math.floor(Math.random() * pool.length)] || '';
}

export function isKorean(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

export function isElement(value: unknown): value is Element {
  return (
    !!value &&
    typeof value === 'object' &&
    'nodeType' in value &&
    value.nodeType === 1
  );
}

type ShuffleConfig = {
  /**
   * 문자를 섞을 반복 횟수입니다.
   */
  iterations?: number;
  /**
   * 문자열을 업데이트할 초당 프레임 수입니다.
   */
  fps?: number;
  /**
   * 셔플이 완료되면 호출되는 콜백 함수입니다.
   * @param element 셔플이 완료된 요소입니다.
   */
  onComplete?: (element: HTMLElement) => void;
};
export function shuffleLetters(
  element: HTMLElement,
  config: ShuffleConfig = {}
): () => void {
  const options = {
    iterations: 8,
    fps: 30,
    onComplete: () => {},
    ...config,
  };

  if (options.iterations < 1 || options.iterations > 50) {
    throw new RangeError('iterations는 1 이상 50 이하의 값이어야 합니다.');
  }

  if (options.fps < 1 || options.fps > 60) {
    throw new RangeError('fps는 1 이상 60 이하의 값이어야 합니다.');
  }

  if (!isElement(element)) {
    throw new TypeError('유효한 HTML 요소를 전달해야 해요.');
  }

  const text = element.textContent ?? '';
  const charsArray = Array.from(text); // 문자열을 문자열 배열로 변환
  const charsTypes = charsArray.map(char => {
    if (/\s/.test(char)) return 'space';
    if (isKorean(char)) return 'korean';
    if (/[a-z]/.test(char)) return 'lowerCase';
    if (/[A-Z]/.test(char)) return 'upperCase';
    if (/[0-9]/.test(char)) return 'digit';
    return 'symbol';
  });

  const charsPositions = charsArray.reduce<number[]>((acc, char, index) => {
    if (!/\s/.test(char)) acc.push(index);
    return acc;
  }, []);

  element.textContent = '';

  let timeout: NodeJS.Timeout | null = null;

  const shuffle = (start: number): void => {
    if (start > charsPositions.length) {
      options.onComplete(element);
      return;
    }

    const shuffledChars = [...charsArray];
    for (let i = Math.max(start, 0); i < charsPositions.length; i++) {
      if (i < start + options.iterations) {
        const charType = charsTypes[charsPositions[i]];
        if (charType !== 'space') {
          shuffledChars[charsPositions[i]] = getRandomCharacterForType(
            charType as Exclude<typeof charType, 'space'>
          );
        }
      } else {
        shuffledChars[charsPositions[i]] = '';
      }
    }

    element.textContent = shuffledChars.join('');

    timeout = setTimeout(() => shuffle(start + 1), 1000 / options.fps);
  };

  shuffle(-options.iterations);

  return () => {
    if (timeout) clearTimeout(timeout);
  };
}
