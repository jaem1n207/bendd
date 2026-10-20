import { expect, test, type Locator } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;
const routes = [
  '/article/naming-tokens-in-design',
  '/craft/implement-rauno-style-text-animation',
];
const widths = [390, 767, 768, 1024, 1440, 1920];

async function readMetrics(article: Locator) {
  return article.evaluate(element => {
    const paragraph = element.querySelector('p');
    const summary = document.querySelector('#BenddDoc > blockquote');
    if (!paragraph || !summary) {
      throw new Error('본문과 요약이 필요합니다.');
    }

    const style = getComputedStyle(paragraph);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      summaryFontSize: Number.parseFloat(getComputedStyle(summary).fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      width: element.getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

test('넓어진 코드 블록에 제목 폭이 맞춰진다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}${routes[0]}`);
  const figure = page
    .locator('figure[data-rehype-pretty-code-figure]:has(> figcaption)')
    .first();
  await expect(figure).toBeVisible();
  const widths = await figure.evaluate(element => ({
    caption: element.querySelector('figcaption')!.getBoundingClientRect().width,
    frame: element
      .querySelector('[data-code-block-frame]')!
      .getBoundingClientRect().width,
  }));
  expect(widths.caption).toBeCloseTo(widths.frame, 0);
});

async function readLineEnds(paragraph: Locator) {
  return paragraph.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const lines = new Map<number, string>();
    let node = walker.nextNode();

    while (node) {
      for (let offset = 0; offset < (node.textContent?.length ?? 0); offset++) {
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        const top = Math.round(rect.top);
        lines.set(top, (lines.get(top) ?? '') + range.toString());
      }
      node = walker.nextNode();
    }

    return [...lines.values()].map(line => line.trim());
  });
}

for (const route of routes) {
  test(`${route}: 본문과 요약이 연속 확대되고 읽기 폭을 유지한다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: widths[0], height: 900 });
    await page.goto(`${baseURL}${route}`);
    await page.evaluate(() => document.fonts.ready);
    const article = page.locator('article[data-content-font="pretendard"]');
    await expect(article).toBeVisible();

    const samples = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      samples.push(await readMetrics(article));
    }

    expect(samples[0].fontSize).toBeGreaterThanOrEqual(17.9);
    expect(samples[4].fontSize).toBeGreaterThanOrEqual(20);
    expect(samples[4].fontSize).toBeLessThanOrEqual(22);
    for (const sample of samples) {
      expect(sample.summaryFontSize).toBeCloseTo(sample.fontSize, 1);
      expect(sample.lineHeight / sample.fontSize).toBeGreaterThanOrEqual(1.7);
      expect(sample.overflow).toBeLessThanOrEqual(1);
    }
    for (const [index, sample] of samples.slice(1).entries()) {
      expect(sample.fontSize).toBeGreaterThan(samples[index].fontSize);
    }
    expect(samples[2].fontSize - samples[1].fontSize).toBeLessThan(0.01);
    expect(samples[5].width / samples[5].fontSize).toBeCloseTo(
      samples[4].width / samples[4].fontSize,
      1
    );

    const largeLines = await readLineEnds(article.locator('p').first());
    await page.setViewportSize({ width: 1440, height: 900 });
    const mediumLines = await readLineEnds(article.locator('p').first());
    expect(mediumLines.length).toBeGreaterThan(1);
    expect(mediumLines).toEqual(largeLines);
  });

  test(`${route}: 좁은 화면과 글자 확대에서도 가로로 넘치지 않는다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`${baseURL}${route}`);
    const article = page.locator('article[data-content-font="pretendard"]');
    await expect(article).toBeVisible();
    const original = await readMetrics(article);

    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    const enlarged = await readMetrics(article);
    expect(enlarged.fontSize).toBeGreaterThan(original.fontSize * 1.9);
    expect(enlarged.overflow).toBeLessThanOrEqual(1);
    expect(enlarged.width).toBeLessThanOrEqual(320);
  });
}
