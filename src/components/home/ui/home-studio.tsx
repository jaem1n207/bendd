import {
  ArrowUpRight,
  BriefcaseBusiness,
  CornerDownLeft,
  CornerDownRight,
  FlaskConical,
  GitPullRequest,
  Layers3,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { TextShuffleDemo } from '@/components/home/ui/craft-demos';
import { DockDemo } from '@/components/home/ui/dock-demo';
import { CodeSteps } from '@/components/home/ui/code-steps';
import { ExtensionInstallMenu } from '@/components/home/ui/extension-install-menu';
import { HomeMotion } from '@/components/home/ui/home-motion';
import styles from '@/components/home/ui/home-studio.module.css';
import { ScrollSyncDemo } from '@/components/home/ui/scroll-sync-demo';
import { TechStack } from '@/components/home/ui/tech-stack';
import { HomeProfile } from '@/components/profile';
import { GitHub } from '@/components/ui/icons';
import type { Article } from '@/mdx/mdx';

// Small, build-generated subsets can finish during the font block period.
// Keep their preloads on the home route, away from long-form article pages.
const homeSans = localFont({
  src: '../../../app/fonts/PretendardHome.woff2',
  variable: '--font-home-sans',
  weight: '100 900',
  display: 'block',
  preload: true,
  adjustFontFallback: false,
});

const homeNotes = localFont({
  src: '../../../../public/fonts/gaegu-notes.woff2',
  variable: '--font-home-notes',
  weight: '400',
  display: 'block',
  preload: true,
  adjustFontFallback: false,
});

const profileSerif = localFont({
  src: '../../../../public/fonts/profile/profile-serif.woff2',
  variable: '--font-profile-serif',
  weight: '200 900',
  display: 'block',
  preload: true,
  adjustFontFallback: false,
});

const profileDots = localFont({
  src: '../../../../public/fonts/profile/profile-dots.woff2',
  variable: '--font-profile-dots',
  weight: '100 900',
  display: 'block',
  preload: true,
  adjustFontFallback: false,
});

function SectionHeading({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <>
      <hr className={styles.sectionDivider} aria-hidden="true" />
      <div
        className={styles.sectionHeading}
        data-reveal
        data-reveal-kind="heading"
      >
        <div className={styles.headingTitle}>
          <Icon aria-hidden="true" strokeWidth={1.7} />
          <h2 id={id}>{title}</h2>
        </div>
        {children}
      </div>
    </>
  );
}

function MarginNote({
  side = 'left',
  children,
}: {
  side?: 'left' | 'right';
  children: ReactNode;
}) {
  const Arrow = side === 'left' ? CornerDownRight : CornerDownLeft;

  return (
    <aside className={styles.marginNote} data-side={side} lang="ko">
      <div data-reveal data-reveal-kind="note">
        <p data-note-accent>{children}</p>
        <Arrow aria-hidden="true" strokeWidth={1.25} />
      </div>
    </aside>
  );
}

export function HomeStudio({
  articles,
}: {
  articles: Pick<Article, 'slug' | 'metadata'>[];
}) {
  return (
    <div
      className={`${styles.page} ${homeSans.variable} ${homeNotes.variable} ${profileSerif.variable} ${profileDots.variable}`}
    >
      <HomeMotion>
        <div className={styles.studio}>
          <div className={styles.masthead}>
            <span className={styles.wordmark}>bendd.</span>
            <span className={styles.profileKicker}>A PERSONAL WORKSPACE</span>
          </div>
          <HomeProfile />
          <main id="home-content">
            <section
              className={styles.section}
              aria-labelledby="home-projects"
              data-reveal-group="projects"
            >
              <SectionHeading
                id="home-projects"
                title="Projects"
                icon={BriefcaseBusiness}
              >
                <p className={styles.sectionNote}>직접 쓰기 위해 만든 도구</p>
              </SectionHeading>
              <MarginNote>
                <span>내가 쓰려고</span> <span>만든 도구</span>
              </MarginNote>
              <article className={styles.feature}>
                <div className={styles.projectHeading} data-reveal>
                  <div>
                    <h3>Synchronize Tab Scrolling</h3>
                    <p>원문과 번역문, 두 탭의 읽는 위치를 함께 맞춥니다.</p>
                  </div>
                  <span className={styles.tag}>BROWSER EXTENSION</span>
                </div>
                <div data-reveal data-reveal-kind="preview">
                  <ScrollSyncDemo />
                </div>
                <div className={styles.projectLinks} data-reveal>
                  <div className={styles.linkGroup}>
                    <Link href="/craft/synchronize-tab-scrolling-product-story">
                      만든 과정
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                    <ExtensionInstallMenu />
                  </div>
                  <a
                    href="https://github.com/jaem1n207/synchronize-tab-scrolling"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitHub aria-hidden="true" />
                    Source
                  </a>
                </div>
              </article>
            </section>
            <section
              className={styles.section}
              aria-labelledby="home-craft"
              data-reveal-group="craft"
              data-reveal-sequence="list"
            >
              <SectionHeading id="home-craft" title="Craft" icon={FlaskConical}>
                <p className={styles.sectionNote}>
                  작은 움직임을 직접 만져보세요
                </p>
              </SectionHeading>
              <div className={styles.crafts}>
                <div className={styles.craftEntry}>
                  <MarginNote side="right">
                    <span>안에서 스크롤해</span> <span>보세요</span>
                  </MarginNote>
                  <article
                    className={`${styles.craft} ${styles.codeCraft}`}
                    data-reveal
                    data-reveal-kind="craft"
                  >
                    <CodeSteps />
                    <Link
                      className={styles.craftTitle}
                      href="/article/immediate-motion-component"
                    >
                      <h3>단계별 코드 설명</h3>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                    <p>한 번에 한 부분씩, 설명과 코드의 초점을 맞춥니다.</p>
                    <p className={styles.craftCredit}>
                      Shiki Magic Move 기반 · 설명 흐름과 접근성 개선
                    </p>
                  </article>
                </div>
                <div className={styles.craftEntry}>
                  <MarginNote>
                    <span>글자를 눌러</span> <span>섞어 보세요</span>
                  </MarginNote>
                  <article
                    className={`${styles.craft} ${styles.compactCraft}`}
                    data-reveal
                    data-reveal-kind="craft"
                  >
                    <TextShuffleDemo />
                    <div className={styles.craftDetails}>
                      <Link
                        className={styles.craftTitle}
                        href="/craft/implement-rauno-style-text-animation"
                      >
                        <h3>문자별 텍스트 셔플</h3>
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                      <p>한글·영문·숫자·기호를 각자의 문자 안에서 섞습니다.</p>
                      <p className={styles.craftCredit}>
                        Rauno에서 영감을 받아 문자별 처리로 확장
                      </p>
                    </div>
                  </article>
                </div>
                <div className={styles.craftEntry}>
                  <MarginNote side="right">
                    <span>도구를 눌러</span> <span>보세요</span>
                  </MarginNote>
                  <article
                    className={styles.craft}
                    data-reveal
                    data-reveal-kind="craft"
                  >
                    <DockDemo />
                    <div className={styles.craftTitle}>
                      <h3>직접 크기를 조절하는 Dock</h3>
                    </div>
                    <p>
                      손잡이를 위아래로 끌면 Dock의 크기가 바뀌고, 이름은
                      움직이는 방향으로 이어집니다.
                    </p>
                    <p className={styles.craftCredit}>
                      macOS Dock에서 영감을 받은 인터랙션 · 이 사이트의 탐색에도
                      적용
                    </p>
                  </article>
                </div>
              </div>
            </section>
            <section
              className={styles.section}
              aria-labelledby="home-writing"
              data-reveal-group="writing"
              data-reveal-sequence="list"
            >
              <SectionHeading
                id="home-writing"
                title="Writing"
                icon={NotebookPen}
              >
                <Link className={styles.allLink} href="/article">
                  모든 글<ArrowUpRight aria-hidden="true" />
                </Link>
              </SectionHeading>
              <MarginNote>
                <span>만들며 배운 걸</span> <span>기록합니다.</span>
              </MarginNote>
              <ul className={styles.writingList}>
                {articles.map(article => (
                  <li key={article.slug} data-reveal data-reveal-kind="writing">
                    <Link
                      className={styles.writingLink}
                      href={`/article/${article.slug}`}
                    >
                      <div>
                        <h3>{article.metadata.title}</h3>
                        <p>{article.metadata.summary}</p>
                      </div>
                      <span className={styles.writingMeta}>
                        <time dateTime={article.metadata.publishedAt}>
                          {article.metadata.publishedAt
                            .slice(0, 7)
                            .replace('-', '.')}
                        </time>
                        <ArrowUpRight aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section
              className={styles.section}
              aria-labelledby="home-tech-stack"
              data-reveal-group="tech-stack"
            >
              <SectionHeading
                id="home-tech-stack"
                title="Tech Stack"
                icon={Layers3}
              >
                <p className={styles.sectionNote}>
                  만들고, 다듬고, 검증하는 도구
                </p>
              </SectionHeading>
              <TechStack />
            </section>
            <div
              className={styles.contribution}
              data-reveal
              data-reveal-group="contribution"
            >
              <GitPullRequest aria-hidden="true" />
              <div>
                <h2>작게 보태는 오픈 소스</h2>
                <div className={styles.contributionDetail}>
                  <a
                    href="https://github.com/shuding/nextra/pull/2746"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Nextra 검색 메모리 누수 수정
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                  <span className={styles.contributionStatus}>
                    Merged · #2746
                  </span>
                  <p>
                    검색어에 공백이 연속으로 들어가면 검색 결과를 강조하는
                    처리가 무한 반복되며 메모리가 증가하는 문제를 발견했습니다.
                    공백 처리와 반복문의 종료 조건을 고쳐, 검색이 정상적으로
                    끝나도록 기여했습니다.
                  </p>
                </div>
              </div>
            </div>
          </main>
          <footer className={styles.footer}>
            <div className={styles.colophon}>
              <span>© {new Date().getFullYear()} BENDD</span>
              <span>ALWAYS A WORK IN PROGRESS.</span>
            </div>
          </footer>
        </div>
      </HomeMotion>
    </div>
  );
}
