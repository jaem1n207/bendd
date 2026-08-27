import { expect, type Locator, type Page, test } from '@playwright/test';

async function readRailInsets(rail: Locator) {
  return rail.evaluate(element => {
    const clipPath = getComputedStyle(element).clipPath;
    const values = Array.from(
      clipPath.matchAll(/(-?\d+(?:\.\d+)?)px/g),
      match => Number(match[1])
    );

    if (!values.length) {
      throw new Error(`Unexpected clip-path value: ${clipPath}`);
    }

    return {
      clipPath,
      top: values[0],
      bottom: values.length >= 3 ? values[2] : values[0],
    };
  });
}

async function readRailInsetsDuringTransition(rail: Locator) {
  return rail.evaluate(
    element =>
      new Promise<{ clipPath: string; top: number; bottom: number }>(
        (resolve, reject) => {
          const timeoutId = window.setTimeout(
            () => reject(new Error('TOC rail transition did not start')),
            500
          );

          function sample() {
            const animation = element
              .getAnimations()
              .find(candidate => candidate.playState === 'running');
            const progress = animation?.effect?.getComputedTiming().progress;

            if (
              progress !== null &&
              progress !== undefined &&
              progress > 0.15 &&
              progress < 0.85
            ) {
              window.clearTimeout(timeoutId);
              const clipPath = getComputedStyle(element).clipPath;
              const values = Array.from(
                clipPath.matchAll(/(-?\d+(?:\.\d+)?)px/g),
                match => Number(match[1])
              );

              resolve({
                clipPath,
                top: values[0],
                bottom: values.length >= 3 ? values[2] : values[0],
              });
              return;
            }

            requestAnimationFrame(sample);
          }

          sample();
        }
      )
  );
}

async function waitForRailTransitionEnd(rail: Locator) {
  await rail.evaluate(async element => {
    await Promise.all(
      element.getAnimations().map(animation => animation.finished)
    );
  });
}

async function retargetRailDuringTransition(rail: Locator) {
  return rail.evaluate(
    element =>
      new Promise<{
        beforeRetarget: number;
        afterRetarget: number;
      }>((resolve, reject) => {
        const list = element.closest('ul');
        if (!list) {
          reject(new Error('TOC list is missing'));
          return;
        }
        const tocList = list;

        const timeoutId = window.setTimeout(
          () => reject(new Error('TOC rail transition did not start')),
          500
        );

        function readTopInset() {
          const [topInset] = Array.from(
            getComputedStyle(element).clipPath.matchAll(/(-?\d+(?:\.\d+)?)px/g),
            match => Number(match[1])
          );
          return topInset;
        }

        function sample() {
          const animation = element
            .getAnimations()
            .find(candidate => candidate.playState === 'running');
          const progress = animation?.effect?.getComputedTiming().progress;

          if (
            progress !== null &&
            progress !== undefined &&
            progress > 0.15 &&
            progress < 0.85
          ) {
            window.clearTimeout(timeoutId);
            const beforeRetarget = readTopInset();
            tocList.style.setProperty('--toc-active-top', '20px');
            const afterRetarget = readTopInset();
            resolve({ beforeRetarget, afterRetarget });
            return;
          }

          requestAnimationFrame(sample);
        }

        tocList.style.setProperty('--toc-active-top', '120px');
        sample();
      })
  );
}

async function scrollToMultiHighlightScenario(page: Page) {
  const scenario = await page
    .locator('nav.toc-navbar ul a')
    .evaluateAll(links => {
      const navbar = document.querySelector('nav.toc-navbar');
      const scrollOffset = (navbar?.getBoundingClientRect().top ?? 0) + 8;
      const headings = links.flatMap(link => {
        const href = link.getAttribute('href');
        const id = href ? decodeURIComponent(href.slice(1)) : '';
        const heading = document.getElementById(id);

        if (!href || !heading) return [];

        const rect = heading.getBoundingClientRect();
        return [
          {
            href,
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
          },
        ];
      });

      for (const candidate of headings) {
        const scrollY = Math.max(1, Math.ceil(candidate.bottom + 24));
        const visibleHrefs = headings
          .filter(
            heading =>
              heading.bottom > scrollY &&
              heading.top < scrollY + window.innerHeight
          )
          .map(({ href }) => href);
        const carriedHeading = headings
          .filter(heading => heading.top <= scrollY + scrollOffset)
          .at(-1);

        if (
          carriedHeading?.href === candidate.href &&
          candidate.bottom <= scrollY &&
          visibleHrefs.length >= 2 &&
          !visibleHrefs.includes(candidate.href)
        ) {
          return {
            scrollY,
            expectedHrefs: headings
              .filter(
                ({ href }) =>
                  href === candidate.href || visibleHrefs.includes(href)
              )
              .map(({ href }) => href),
          };
        }
      }

      throw new Error(
        '직전 섹션과 두 개 이상의 보이는 헤더를 포함하는 테스트 위치가 필요합니다.'
      );
    });

  await page.evaluate(scrollY => window.scrollTo(0, scrollY), scenario.scrollY);

  return scenario;
}

test.describe('Table of Contents sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/article/naming-tokens-in-design');
  });

  test('should be visible on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const tocNav = page.locator('nav.toc-navbar');
    await expect(tocNav).toBeVisible();
  });

  test('should be hidden on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const tocContainer = page.locator('.fixed.bottom-16.left-5.top-24');
    await expect(tocContainer).toBeHidden();
  });

  test('should display "On this page" heading', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await expect(page.locator('text=On this page')).toBeVisible();
  });

  test('should keep the back link and TOC free of an outer rail', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const tocNav = page.locator('nav.toc-navbar');
    await expect(tocNav).toBeVisible();

    const navMetrics = await tocNav.evaluate(nav => {
      const styles = getComputedStyle(nav);
      const headingIcon = nav.querySelector('div > svg');

      if (!headingIcon) {
        throw new Error('TOC heading icon is missing');
      }

      return {
        borderLeftWidth: styles.borderLeftWidth,
        headingIconInset:
          headingIcon.getBoundingClientRect().left -
          nav.getBoundingClientRect().left,
      };
    });

    expect(navMetrics.borderLeftWidth).toBe('0px');
    expect(navMetrics.headingIconInset).toBeGreaterThan(0);
  });

  test('should contain TOC items as links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const tocLinks = page.locator('nav.toc-navbar ul a');
    await tocLinks.first().waitFor();
    const count = await tocLinks.count();

    expect(count).toBeGreaterThan(0);

    const firstLink = tocLinks.first();
    await expect(firstLink).toHaveAttribute('href', /^#/);
  });

  test('should render depth-aware connector rails', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/difference-between-put-patch');
    await page.locator('nav.toc-navbar ul a').first().waitFor();
    await expect(page.locator('nav.toc-navbar ul')).toHaveAttribute(
      'data-toc-rail-ready',
      'true'
    );

    const connectorMetrics = await page
      .locator('nav.toc-navbar ul')
      .evaluate(list => {
        const links = Array.from(list.querySelectorAll('a'));
        const basePath = list.querySelector<SVGPathElement>(
          '[data-toc-rail="base"] path'
        );
        const activeRail = list.querySelector<SVGSVGElement>(
          '[data-toc-rail="active"]'
        );
        const activePath = activeRail?.querySelector('path');

        if (!basePath || !activeRail || !activePath) {
          throw new Error('Continuous TOC rail is missing');
        }

        const railStyles = getComputedStyle(activeRail);

        return {
          ariaLevelCount: new Set(
            links.map(link => link.parentElement?.getAttribute('aria-level'))
          ).size,
          activeRailCount: list.querySelectorAll(
            '[data-toc-rail="active"] path'
          ).length,
          baseRailCount: list.querySelectorAll('[data-toc-rail="base"] path')
            .length,
          pathsMatch:
            basePath.getAttribute('d') === activePath.getAttribute('d'),
          hasRoundedDepthTransition:
            basePath.getAttribute('d')?.includes('Q') ?? false,
          indentationCount: new Set(
            links.map(link => getComputedStyle(link).paddingInlineStart)
          ).size,
          transitionDuration: railStyles.transitionDuration,
          transitionProperty: railStyles.transitionProperty,
          transitionTimingFunction: railStyles.transitionTimingFunction,
        };
      });

    expect(connectorMetrics.ariaLevelCount).toBeGreaterThan(1);
    expect(connectorMetrics.activeRailCount).toBe(1);
    expect(connectorMetrics.baseRailCount).toBe(1);
    expect(connectorMetrics.pathsMatch).toBe(true);
    expect(connectorMetrics.hasRoundedDepthTransition).toBe(true);
    expect(connectorMetrics.indentationCount).toBeGreaterThan(1);
    expect(connectorMetrics.transitionDuration).toBe('0.24s');
    expect(connectorMetrics.transitionProperty).toBe('clip-path');
    expect(connectorMetrics.transitionTimingFunction).toBe(
      'cubic-bezier(0.77, 0, 0.175, 1)'
    );
  });

  test('should interpolate and retarget both rail endpoints without jumping', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/difference-between-put-patch');

    const list = page.locator('nav.toc-navbar ul');
    const activeRail = list.locator('[data-toc-rail="active"]');

    await expect(list).toHaveAttribute('data-toc-rail-ready', 'true');

    await activeRail.evaluate((rail, initialInset) => {
      const list = rail.closest('ul');
      if (!list) throw new Error('TOC list is missing');

      (rail as SVGSVGElement).style.transition = 'none';
      list.style.setProperty('--toc-active-top', `${initialInset}px`);
      list.style.setProperty('--toc-active-bottom', `${initialInset}px`);
      getComputedStyle(rail).clipPath;
      (rail as SVGSVGElement).style.removeProperty('transition');
    }, 120);

    await list.evaluate(element =>
      element.style.setProperty('--toc-active-top', '20px')
    );

    const upperMidpoint = await readRailInsetsDuringTransition(activeRail);
    expect(upperMidpoint.top).toBeGreaterThan(20);
    expect(upperMidpoint.top).toBeLessThan(120);
    expect(upperMidpoint.bottom).toBeCloseTo(120, 0);

    await waitForRailTransitionEnd(activeRail);
    const upperEnd = await readRailInsets(activeRail);
    expect(upperEnd.top).toBeCloseTo(20, 0);

    await list.evaluate(element =>
      element.style.setProperty('--toc-active-bottom', '20px')
    );

    const lowerMidpoint = await readRailInsetsDuringTransition(activeRail);
    expect(lowerMidpoint.top).toBeCloseTo(20, 0);
    expect(lowerMidpoint.bottom).toBeGreaterThan(20);
    expect(lowerMidpoint.bottom).toBeLessThan(120);

    await waitForRailTransitionEnd(activeRail);
    const lowerEnd = await readRailInsets(activeRail);
    expect(lowerEnd.bottom).toBeCloseTo(20, 0);

    const { beforeRetarget, afterRetarget } =
      await retargetRailDuringTransition(activeRail);

    expect(Math.abs(afterRetarget - beforeRetarget)).toBeLessThan(1);
    expect(afterRetarget).toBeGreaterThan(20);
  });

  test('should disable rail movement when reduced motion is requested', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/difference-between-put-patch');

    const list = page.locator('nav.toc-navbar ul');
    await expect(list).toHaveAttribute('data-toc-rail-ready', 'true');

    await expect(list.locator('[data-toc-rail="active"]')).toHaveCSS(
      'transition-duration',
      '0s'
    );
  });

  test('should show back link to article list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const backLink = page.locator(
      '.fixed.bottom-16.left-5.top-24 a[href="/article"]'
    );
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Article');
  });

  test('should not extend below bottom-16 boundary', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const container = page.locator('.fixed.bottom-16.left-5.top-24');
    await expect(container).toBeVisible();

    const box = await container.boundingBox();
    expect(box).not.toBeNull();

    const viewportHeight = 800;
    const bottom16InPx = 64;
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      viewportHeight - bottom16InPx + 1
    );
  });

  test('should size the TOC border to the rendered list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const tocNav = page.locator('nav.toc-navbar');
    await expect(tocNav).toBeVisible();
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    const containerBox = await page
      .locator('.fixed.bottom-16.left-5.top-24')
      .boundingBox();
    const tocMetrics = await tocNav.evaluate(nav => {
      const list = nav.querySelector('ul');
      if (!list) {
        throw new Error('TOC list is missing');
      }

      const navRect = nav.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();

      return {
        listBottom: listRect.bottom,
        navBottom: navRect.bottom,
        navHeight: navRect.height,
      };
    });

    expect(containerBox).not.toBeNull();
    expect(tocMetrics.navHeight).toBeLessThan(containerBox!.height);
    expect(Math.abs(tocMetrics.navBottom - tocMetrics.listBottom)).toBeLessThan(
      2
    );
  });
});

test.describe('TOC multi-highlight after page refresh', () => {
  test('should keep the last TOC item active at the page bottom', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/naming-tokens-in-design');

    const tocNav = page.locator('nav.toc-navbar');
    await expect(tocNav).toBeVisible();

    await page.reload();
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(page.locator('nav.toc-navbar ul a').last()).toHaveAttribute(
      'data-active',
      'true'
    );
  });

  test('should activate the carried section and all visible headings', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/difference-between-put-patch');

    await page.reload();
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    const { expectedHrefs } = await scrollToMultiHighlightScenario(page);

    await expect
      .poll(() =>
        page
          .locator('nav.toc-navbar ul a[data-active="true"]')
          .evaluateAll(links => links.map(link => link.getAttribute('href')))
      )
      .toEqual(expectedHrefs);

    const activeRail = page.locator(
      'nav.toc-navbar ul [data-toc-rail="active"]'
    );
    await expect(activeRail).toHaveCount(1);
    await expect(activeRail).not.toHaveCSS(
      'clip-path',
      'inset(0px 0px 100% 0px)'
    );
  });
});

test.describe('TOC highlight restored on refresh without scroll', () => {
  test('should show highlight immediately after refresh at mid-page position', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/article/naming-tokens-in-design');

    const tocNav = page.locator('nav.toc-navbar');
    const highlightedLinks = page.locator(
      'nav.toc-navbar ul a[data-active="true"]'
    );

    await expect(tocNav).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(highlightedLinks.first()).toBeVisible();
    const activeHrefsBeforeReload = await highlightedLinks.evaluateAll(links =>
      links.map(link => link.getAttribute('href'))
    );
    expect(activeHrefsBeforeReload.length).toBeGreaterThan(0);

    await page.reload();
    await page.locator('nav.toc-navbar ul a').first().waitFor();

    await expect
      .poll(() =>
        highlightedLinks.evaluateAll(links =>
          links.map(link => link.getAttribute('href'))
        )
      )
      .toEqual(activeHrefsBeforeReload);
  });
});

test.describe('TOC sidebar on craft pages', () => {
  test('should show back link to craft list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/craft/implement-rauno-style-text-animation');

    const backLink = page.locator(
      '.fixed.bottom-16.left-5.top-24 a[href="/craft"]'
    );
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Craft');
  });
});
