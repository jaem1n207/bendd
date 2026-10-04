const sounds = new Map<string, HTMLAudioElement>();

// 클릭할 때만 생성하고 같은 URL의 재생 요소를 공유한다.
export function playSound(assetPath: string) {
  if (typeof Audio === 'undefined') {
    return;
  }

  try {
    let sound = sounds.get(assetPath);
    if (!sound) {
      sound = new Audio(assetPath);
      sounds.set(assetPath, sound);
    }
    sound.currentTime = 0;
    void sound.play().catch(() => {
      // 재생 거부가 클릭 동작을 막지 않게 한다.
    });
  } catch {
    // 오디오 미지원 환경에서도 컨트롤은 동작한다.
  }
}
