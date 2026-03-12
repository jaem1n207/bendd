/**
 * SSR 환경(Node.js)에서 localStorage가 없거나 불완전할 때 폴리필을 적용합니다.
 *
 * @shikijs/twoslash -> @typescript/vfs가 모듈 로드 시 localStorage.getItem을 호출하여
 * SSR에서 TypeError가 발생합니다. Node.js 19+에서는 globalThis.localStorage가
 * 존재하지만 getItem이 함수가 아닌 경우가 있어, 단순 undefined 체크로는 부족합니다.
 *
 * @see https://github.com/nicolo-ribaudo/tc39-proposal-structs/issues/1
 */
export function ensureLocalStorage(): void {
  if (typeof globalThis.localStorage?.getItem !== 'function') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });
  }
}
