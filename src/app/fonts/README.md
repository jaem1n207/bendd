# 수동 웹폰트 생성

런타임은 `generated.css`, `generated.ts`, `generated-manifest.json`과
`public/fonts/optimized/`의 커밋된 파일만 사용한다. `dev`와 `build`에서는
폰트를 처리하거나 Google Fonts에 접속하지 않는다.

```sh
python3 -m venv .font-tools-venv
source .font-tools-venv/bin/activate
python -m pip install -r scripts/font-requirements.txt
pnpm install --frozen-lockfile
pnpm fonts:optimize
```

본문·Craft·컴포넌트 문구, inline/CSS 굵기·축·OpenType 설정, 원본 폰트가
바뀌면 다시 실행하고 생성 결과를 함께 커밋한다. 수동으로 관리하는
`FEATURES`, 축 사용 범위와 `CORE`, UI/Home 수집 범위도 그때 검토한다.
`scripts/generate-home-font.mjs`와 `pnpm fonts:home`은 같은 수동 작업의 호환 진입점이다.

원본 Pretendard와 라이선스는 이 디렉터리에, 기존 홈 장식 폰트와 라이선스는
`public/fonts/`에, 기존 Google Fira Mono 3.206의 21개 입력 파일은
`scripts/font-sources/fira/`에 보관한다. 생성물의 내부 이름은 OFL Reserved
Font Name을 사용하지 않는 Bendd 이름이다. 저작권·라이선스는 보존한다.

core와 extended는 같은 CSS family 안에 선언하며 fallback은 그 뒤에 둔다.
ASCII와 흔한 구두점만으로는 extended를 요청하지 않는다. extended의 core
보조 글리프는 조합·커닝에 필요하며 정확한 cmap에서 unicode-range를 만든다.
새로 생성하는 sans core에는 결합 문자를 **인코딩하지 않는다**. Fira는 원래 cmap과 경계를 보존하는 예외다. 그러면 브라우저가 악센트 글자를
core의 기본 글자와 결합 문자로 분해해 원본과 다른 픽셀을 만드는 일을 피한다.

기존 `font-display`와 fallback family/metric 조정은 그대로 유지한다.
UI 폰트의 분할, wght 축 축소 등 픽셀이 달라지는 최적화는 기본값에서 제외한다.
자세한 측정·예외·검증 재실행 방법은 [측정 보고서](../../../docs/font-optimization.md)를 참고한다.
