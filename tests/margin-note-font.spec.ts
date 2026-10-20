import { expect, test } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.CI ? 3001 : 3000}`;

test('모든 손글씨 안내가 fallback 없이 Gaegu로 표시된다', async ({
  page,
  browserName,
}) => {
  // eslint-disable-next-line playwright/no-skipped-test -- CDP의 실제 글꼴 조회는 Chromium에서만 지원합니다.
  test.skip(
    browserName !== 'chromium',
    '실제 글꼴 조회는 Chromium CDP를 사용합니다.'
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto(`${baseURL}/`);
  const notes = page.locator('aside[lang="ko"] [data-note-accent]');
  await expect(notes).toHaveCount(5);
  await notes.last().scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector: 'aside[lang="ko"] [data-note-accent]',
  });

  for (const [index, nodeId] of nodeIds.entries()) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const note = await notes.nth(index).innerText();
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(font.familyName, note).toBe('Gaegu');
      expect(font.isCustomFont).toBe(true);
    }
  }
});

test('손글씨 안내의 각 구절이 불필요하게 줄바꿈되지 않는다', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto(`${baseURL}/`);
  await page.evaluate(() => document.fonts.ready);
  const phrases = page.locator('aside[lang="ko"] [data-note-accent] > span');
  const lineCounts = await phrases.evaluateAll(elements =>
    elements.map(element => {
      const style = getComputedStyle(element);
      return (
        Number.parseFloat(style.height) / Number.parseFloat(style.lineHeight)
      );
    })
  );
  for (const count of lineCounts) {
    expect(count).toBeLessThanOrEqual(1.1);
  }
});
