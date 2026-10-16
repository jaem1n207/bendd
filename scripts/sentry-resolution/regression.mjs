import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

const ARTICLE = '/article/fix-compacting-conversation';
const STORAGE_MESSAGE =
  '브라우저 저장소를 사용할 수 없어 댓글을 불러오지 못했어요.';
const HTTP_OK = 200;
const MODES = ['property', 'getItem', 'setItem', 'removeItem'];

async function blockStorage(context, origin, mode) {
  await context.addInitScript(
    ({ origin, mode }) => {
      if (location.origin !== origin) {
        return;
      }
      const probe = { denials: 0 };
      Object.defineProperty(window, '__benddStorageProbe', { value: probe });
      const deny = () => {
        probe.denials += 1;
        throw new DOMException(
          'localStorage access denied by regression test',
          'SecurityError'
        );
      };
      if (mode === 'property') {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get: deny,
        });
      } else {
        const local = window.localStorage;
        const original = Storage.prototype[mode];
        Object.defineProperty(Storage.prototype, mode, {
          configurable: true,
          writable: true,
          value(...args) {
            if (this === local) {
              return deny();
            }
            return Reflect.apply(original, this, args);
          },
        });
      }
    },
    { origin, mode }
  );
}

function dockHandle(page) {
  return page
    .getByRole('group', { name: '사이트 탐색 Dock', exact: true })
    .getByRole('slider', { name: 'Dock 크기 조절', exact: true })
    .first();
}

async function checkBlocked(page, baseUrl, route, mode, sha) {
  const errors = [];
  const scripts = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('request', request => {
    if (request.url() === 'https://giscus.app/client.js') {
      scripts.push(request.url());
    }
  });
  const isArticle = route === ARTICLE;
  const fallback = page
    .getByRole('status')
    .filter({ hasText: STORAGE_MESSAGE });
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: 'domcontentloaded',
  });
  assert.equal(response.status(), HTTP_OK);
  await checkRelease(page, sha);
  if (isArticle) {
    await expect(fallback).toBeVisible();
  }
  const handle = dockHandle(page);
  await expect(handle).toHaveAttribute('aria-valuenow', '40');
  await handle.focus();
  await handle.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '64');
  await handle.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '32');
  assert.ok(await page.evaluate(() => window.__benddStorageProbe.denials > 0));
  const reload = await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(reload.status(), HTTP_OK);
  await checkRelease(page, sha);
  if (isArticle) {
    await expect(fallback).toBeVisible();
  }
  await expect(handle).toHaveAttribute(
    'aria-valuenow',
    mode === 'removeItem' ? '32' : '40'
  );
  await page.waitForLoadState('networkidle');
  assert.ok(await page.evaluate(() => window.__benddStorageProbe.denials > 0));
  await expect(
    page.locator('script[src="https://giscus.app/client.js"]')
  ).toHaveCount(0);
  await expect(page.locator('iframe.giscus-frame')).toHaveCount(0);
  assert.deepEqual(scripts, []);
  assert.deepEqual(errors, []);
}

async function checkNormal(page, baseUrl, sha) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${baseUrl}${ARTICLE}`, {
    waitUntil: 'domcontentloaded',
  });
  assert.equal(response.status(), HTTP_OK);
  await checkRelease(page, sha);
  const handle = dockHandle(page);
  await expect(handle).toHaveAttribute('aria-valuenow', '40');
  await handle.focus();
  await handle.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '64');
  const reload = await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(reload.status(), HTTP_OK);
  await checkRelease(page, sha);
  await expect(handle).toHaveAttribute('aria-valuenow', '64');
  await expect(
    page.getByRole('status').filter({ hasText: STORAGE_MESSAGE })
  ).toHaveCount(0);
  const frame = page.locator('iframe.giscus-frame');
  await expect(frame).toHaveCount(1);
  await frame.scrollIntoViewIfNeeded();
  // An article without a discussion receives a handled API 404 from Giscus.
  // Require a working widget and no uncaught JS errors instead of suppressing errors globally.
  await expect(
    page
      .frameLocator('iframe.giscus-frame')
      .getByRole('link', { name: 'GitHub으로 로그인' })
  ).toBeVisible({ timeout: 20_000 });
  assert.deepEqual(errors, []);
}

async function checkRelease(page, sha) {
  await expect
    .poll(() => page.evaluate(() => window.SENTRY_RELEASE?.id))
    .toBe(sha);
}

export async function checkProduction(browser, baseUrl, sha) {
  assert.match(sha, /^[a-f0-9]{40}$/);
  const cases = [
    ...MODES.map(mode => ({ name: `article:${mode}`, route: ARTICLE, mode })),
    { name: 'home:property', route: '/', mode: 'property' },
    { name: 'article:normal', route: ARTICLE },
  ];
  const results = [];
  for (const entry of cases) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
      locale: 'ko-KR',
    });
    try {
      if (entry.mode) {
        await blockStorage(context, new URL(baseUrl).origin, entry.mode);
      }
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(30_000);
      if (entry.mode) {
        await checkBlocked(page, baseUrl, entry.route, entry.mode, sha);
      } else {
        await checkNormal(page, baseUrl, sha);
      }
      results.push({ name: entry.name, passed: true });
    } catch (error) {
      results.push({ name: entry.name, passed: false, error: error.message });
    } finally {
      await context.close();
    }
  }
  return results;
}
