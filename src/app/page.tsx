import { Typography } from '@/components/ui/typography';

export default function Home() {
  return (
    <div className="bd-relative bd-mx-auto bd-min-h-screen bd-max-w-2xl bd-overflow-hidden bd-px-6 bd-py-24 sm:bd-pb-16 sm:bd-pt-32 ">
      <header className="bd-mb-32 bd-flex bd-flex-col">
        <Typography variant="h5" asChild>
          <h1>이재민</h1>
        </Typography>
        <Typography variant="p" affects="muted" prose="removePMargin" asChild>
          <p>소프트웨어 엔지니어</p>
        </Typography>
      </header>
      <main>
        <div className="bd-mt-16 sm:bd-mt-24">
          <Typography
            variant="p"
            affects="large"
            className="bd-mb-5 bd-block"
            asChild
          >
            <span>소개</span>
          </Typography>
          <Typography variant="p" affects="muted" asChild>
            <p className="bd-break-keep">
              누군가에게는 사소해 보일 수 있는 애니메이션과 마이크로 인터랙션이
              유려한 사용자 경험의 핵심을 만듭니다.
              <br />
              살아있는 유기체처럼 자연스럽게 움직이면서도 접근성과 성능, 정확한
              타이밍이 조화를 이루는 인터페이스는 시장에서 제품을 돋보이게 하는
              요소입니다.
              <br />
              이러한 디테일에 대한 깊은 고민과 기술적 구현으로 사용자에게 예측
              가능하면서도 즐거운 경험을 제공하고, 궁극적으로 혁신적인 사용자
              경험으로 이어진다고 생각합니다.
            </p>
          </Typography>
        </div>

        <div className="bd-mt-16 sm:bd-mt-24">
          <Typography
            variant="p"
            affects="large"
            className="bd-mb-5 bd-block"
            asChild
          >
            <span>프로젝트</span>
          </Typography>
          <div className="-bd-mx-3">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://jaem1n207.github.io/synchronize-tab-scrolling/"
              className="bd-group bd-flex bd-flex-col bd-gap-2 bd-rounded-xl bd-p-3 bd-transition-colors hover:bd-bg-gray-400 focus-visible:bd-outline-none focus-visible:bd-ring-2 focus-visible:bd-ring-ring focus-visible:bd-ring-offset-2 dark:hover:bd-bg-gray-200"
            >
              <div className="bd-flex bd-items-center bd-gap-2">
                <Typography
                  variant="p"
                  affects="small"
                  prose="removePMargin"
                  asChild
                >
                  <span>Synchronize Tab Scrolling</span>
                </Typography>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="bd-text-muted-foreground bd-transition-transform group-hover:-bd-translate-y-0.5 group-hover:bd-translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="m7 17 10-10" />
                  <path d="M7 7h10v10" />
                </svg>
              </div>
              <Typography
                variant="p"
                affects="muted"
                prose="removePMargin"
                asChild
              >
                <span className="bd-break-keep">
                  여러 탭의 스크롤을 실시간으로 동기화하는 오픈소스 브라우저
                  확장 프로그램입니다. 번역본 비교, 코드 리뷰, 문서 대조 등 탭을
                  나란히 놓고 비교하는 작업에 유용합니다.
                </span>
              </Typography>
              <div className="bd-flex bd-flex-wrap bd-items-center bd-gap-1.5">
                <span className="bd-rounded-md bd-bg-gray-300 bd-px-2 bd-py-0.5 bd-text-xs bd-text-muted-foreground">
                  Chrome
                </span>
                <span className="bd-rounded-md bd-bg-gray-300 bd-px-2 bd-py-0.5 bd-text-xs bd-text-muted-foreground">
                  Firefox
                </span>
                <span className="bd-rounded-md bd-bg-gray-300 bd-px-2 bd-py-0.5 bd-text-xs bd-text-muted-foreground">
                  Edge
                </span>
              </div>
            </a>
            <div className="bd-flex bd-items-center bd-gap-3 bd-px-3 bd-pt-2 bd-text-sm">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://chromewebstore.google.com/detail/synchronize-tab-scrolling/phceoocamipnafpgnchbfhkdlbleeafc"
                className="bd-select-none bd-text-muted-foreground bd-transition-colors hover:bd-text-primary"
              >
                Web Store
              </a>
              <span className="bd-text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/jaem1n207/synchronize-tab-scrolling"
                className="bd-select-none bd-text-muted-foreground bd-transition-colors hover:bd-text-primary"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="bd-mt-16 sm:bd-mt-24">
          <Typography
            variant="p"
            affects="large"
            className="bd-mb-5 bd-block"
            asChild
          >
            <span>기여</span>
          </Typography>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/shuding/nextra/pull/2746"
            className="-bd-mx-3 bd-flex bd-flex-col bd-gap-1 bd-rounded-md bd-px-3 bd-transition-colors hover:bd-bg-gray-400 focus-visible:bd-outline-none focus-visible:bd-ring-2 focus-visible:bd-ring-ring focus-visible:bd-ring-offset-2 dark:hover:bd-bg-gray-200 sm:bd-py-3"
          >
            <Typography
              variant="p"
              affects="small"
              prose="removePMargin"
              asChild
            >
              <span>Nextra - Memory Leak Fix</span>
            </Typography>
            <Typography
              variant="p"
              affects="muted"
              prose="removePMargin"
              asChild
            >
              <span>
                13.1K 스타의 Nextra에서 검색어에 연속된 공백이 포함될 때
                발생하는 메모리 누수를 수정했습니다. 정규식이 빈 문자열과
                매칭되어 무한 루프에 빠지는 문제를 해결하여 검색 기능을
                안정화했습니다.
              </span>
            </Typography>
          </a>
        </div>
      </main>
    </div>
  );
}
