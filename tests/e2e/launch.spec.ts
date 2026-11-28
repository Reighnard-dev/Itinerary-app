import { expect, test } from '@playwright/test';

test('phone launch shows the splash while the app bundle is still loading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  let unblockApp!: () => void;
  const appReady = new Promise<void>(resolve => { unblockApp = resolve; });
  const appAsset = /\/assets\/main-[^/]+\.(?:js|css)$/;
  await page.route(appAsset, async route => {
    await appReady;
    await route.continue();
  });

  const splash = page.locator('#launch-splash');
  const heading = page.getByRole('heading', { name: 'Your next somewhere.' });
  try {
    await Promise.all([page.waitForRequest(appAsset), page.goto('/', { waitUntil: 'commit' })]);
    await expect(splash).toBeVisible();
    await expect(splash).toContainText('For the wanderers.');
    await expect(splash).toHaveCSS('opacity', '1');
    await expect(heading).toHaveCount(0);
  } finally {
    unblockApp();
  }

  await Promise.all([
    expect(heading).toBeVisible(),
    page.waitForFunction(() => {
      const overlay = document.getElementById('launch-splash');
      if (!overlay) return false;
      const opacity = Number(getComputedStyle(overlay).opacity);
      return opacity > 0 && opacity < 1;
    }, undefined, { timeout: 10_000 }),
  ]);
  await expect(splash).toHaveCount(0);
});
