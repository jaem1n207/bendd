# Fira Mono 3.206 입력

기존 `next/font/google` production 빌드가 내려받은 400/500/700의
Latin, Latin-ext, symbols, Greek, Greek-ext, Cyrillic, Cyrillic-ext 파일을
그대로 보관한다. `ranges.json`은 그때의 Google CSS 범위다. 파일별 SHA-256,
크기와 글리프·feature 정보는 `generated-manifest.json`의 `inputs`에 있다.
OFL 라이선스는 `OFL.txt`에 보관한다.

기본 생성은 Latin 및 Latin-ext 원본의 shaping 데이터를 보존한다.
400의 실제 코드에서 쓰는 box drawing 때문에 symbols도 남긴다.
Greek/Cyrillic은 현재 mono 텍스트에서 쓰지 않아 출력하지 않는다.
정규화에 관여하는 원본 cmap 보조 문자는 남기되 CSS 범위에서는 원래처럼
가린다. 선언한 unicode-range의 모든 문자는 실제 파일에 들어 있다.

이 예외는 합친 두 파일이 Latin 픽셀 비교를 통과하지 못했기 때문이다.
원본 이름에는 OFL Reserved Font Name이 지정되지 않았다. 수정한
Pretendard 계열의 내부 이름은 별도로 Bendd로 바꾼다.
새 버전으로 교체하려면 기존 파일을 덮어쓰지 말고 같은 조건의 픽셀 검증을
먼저 수행한다. 일반 `dev`/`build`는 이 입력을 처리하지 않는다.
