import { test, expect } from '@playwright/test';

test.describe('Mobile interactive landing page & cross-platform download hub', () => {
  test('renders interactive ROAM landing page on mobile device and lets user explore & launch app', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');

    // 1. Mobile visitor sees the interactive ROAM landing page automatically
    const landing = page.getByTestId('roam-mobile-landing');
    await expect(landing).toBeVisible();
    await expect(page.getByRole('heading', { name: /Meet roam\./i })).toBeVisible();

    // 2. Interactive city switcher updates preview card
    await page.getByRole('tab', { name: /Paris/i }).click();
    await expect(landing.locator('.ml-city-card')).toContainText('Paris, France');
    await expect(landing.getByRole('button', { name: /Start planning Paris/i })).toBeVisible();

    // 3. Interactive mini-itinerary demo updates stops & hours
    await expect(landing.locator('.ml-timeline-head')).toContainText('2 stops scheduled');
    await page.getByRole('button', { name: /Local Market Bites/i }).click();
    await expect(landing.locator('.ml-timeline-head')).toContainText('3 stops scheduled');

    // 4. Platform tabs (Android / Huawei / iOS) expose direct automatic download links
    await expect(landing.getByRole('link', { name: /Download ROAM for iOS/i })).toHaveAttribute(
      'href',
      '/api/download-ios'
    );

    await page.getByRole('tab', { name: 'Huawei' }).click();
    await expect(
      landing.getByRole('link', { name: /Download ROAM for Huawei \(GMS-Free APK\)/i })
    ).toHaveAttribute('href', '/api/download-apk');

    await page.getByRole('tab', { name: /iPhone \/ iPad/i }).click();
    await expect(
      landing.getByRole('link', { name: /Download ROAM for iPhone \/ iPad/i })
    ).toHaveAttribute('href', '/api/download-ios');

    await page.getByRole('tab', { name: 'Android' }).click();
    await expect(landing.getByRole('link', { name: /Download ROAM APK/i })).toHaveAttribute(
      'href',
      '/api/download-apk'
    );

    // 5. Launching into the main ROAM app preloads the chosen city
    await landing.getByRole('button', { name: /Start planning Paris/i }).click();
    await expect(landing).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your next somewhere.' })).toBeVisible();
    await expect(page.locator('.destination-tag')).toContainText('Paris, France');

    expect(errors).toEqual([]);
    await context.close();
  });

  test('desktop visitors can open /download explicitly from Get the App', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Desktop lands directly on the main app
    await expect(page.getByRole('heading', { name: 'Your next somewhere.' })).toBeVisible();
    await expect(page.getByTestId('roam-mobile-landing')).toHaveCount(0);

    // Clicking "Get the App" opens the interactive intro & download page
    await page.getByRole('button', { name: /Get the App/i }).click();
    await expect(page.getByTestId('roam-mobile-landing')).toBeVisible();
    await expect(page).toHaveURL(/\/download$/);
  });

  test('Android web browser shows download landing while installed Android APK WebView lands directly on Roam', async ({
    browser,
  }) => {
    const androidChromeUa =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
    const androidStockWvUa =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36';
    const androidBrandedApkUa = `${androidStockWvUa} RoamAndroidApp/1.0.0`;

    // 1. Android mobile web browser sees the download landing page
    const webContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: androidChromeUa,
      hasTouch: true,
    });
    const webPage = await webContext.newPage();
    await webPage.goto('/');
    await expect(webPage.getByTestId('roam-mobile-landing')).toBeVisible();
    await expect(webPage.getByRole('link', { name: /Download ROAM APK/i }).first()).toBeVisible();
    await webContext.close();

    // 2. Installed Android APK WebViews (stock v1.0.0 WebView & tagged RoamAndroidApp) land straight on Roam
    for (const apkUa of [androidStockWvUa, androidBrandedApkUa]) {
      const appContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: apkUa,
        hasTouch: true,
      });
      const appPage = await appContext.newPage();
      const errors: string[] = [];
      appPage.on('pageerror', (e) => errors.push(e.message));

      await appPage.goto('/');
      await expect(appPage.getByTestId('roam-mobile-landing')).toHaveCount(0);
      await expect(appPage.getByRole('heading', { name: 'Your next somewhere.' })).toBeVisible();
      expect(errors).toEqual([]);
      await appContext.close();
    }
  });
});
