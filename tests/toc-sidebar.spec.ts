import { expect, type Page, test } from '@playwright/test';

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

    const connectorMetrics = await page
      .locator('nav.toc-navbar ul a')
      .evaluateAll(links => {
        const animatedStroke = links[0]?.querySelector('svg line:last-of-type');

        if (!animatedStroke) {
          throw new Error('Animated TOC connector stroke is missing');
        }

        const strokeStyles = getComputedStyle(animatedStroke);

        return {
          ariaLevelCount: new Set(
            links.map(link => link.parentElement?.getAttribute('aria-level'))
          ).size,
          connectorCount: links.filter(link => link.querySelector('svg'))
            .length,
          hasRoundedDepthTransition: links.some(link =>
            link.querySelector('svg path[d*="Q"]')
          ),
          indentationCount: new Set(
            links.map(link => getComputedStyle(link).paddingInlineStart)
          ).size,
          transitionDuration: strokeStyles.transitionDuration,
          transitionTimingFunction: strokeStyles.transitionTimingFunction,
        };
      });

    expect(connectorMetrics.ariaLevelCount).toBeGreaterThan(1);
    expect(connectorMetrics.connectorCount).toBeGreaterThan(0);
    expect(connectorMetrics.hasRoundedDepthTransition).toBe(true);
    expect(connectorMetrics.indentationCount).toBeGreaterThan(1);
    expect(connectorMetrics.transitionDuration).toBe('0.2s');
    expect(connectorMetrics.transitionTimingFunction).toBe(
      'cubic-bezier(0.77, 0, 0.175, 1)'
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

    const activeConnector = page
      .locator('nav.toc-navbar ul a[data-active="true"]')
      .first()
      .locator('svg line')
      .last();

    await expect(activeConnector).toHaveCSS('opacity', '1');
    await expect(activeConnector).toHaveCSS('stroke-dashoffset', '0px');
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
