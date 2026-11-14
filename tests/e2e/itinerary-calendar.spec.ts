import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('roam.active.guest', JSON.stringify({
    id: 'calendar-preview-trip',
    title: 'A little escape to Rome',
    country: 'Italy',
    city: 'Rome',
    days: 5,
    startDate: '2026-11-14',
    stops: [],
    updatedAt: '2026-11-14T00:00:00.000Z',
  })));
});

test('itinerary calendar edits the inclusive date range and chapter dates', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', {name:'View my itinerary'}).click();

  await expect(page.getByRole('button', {name:/Arrival date.*November 14, 2026/})).toBeVisible();
  await expect(page.getByRole('button', {name:/Departure date.*November 18, 2026/})).toBeVisible();
  await expect(page.getByLabel('Number of days')).toHaveText('5 days');

  await page.getByRole('button', {name:/Arrival date/}).click();
  await expect(page.getByRole('region', {name:'Trip calendar'})).toBeVisible();
  await page.getByRole('button', {name:'Monday, November 16, 2026'}).click();
  await expect(page.getByText('Choose your departure date')).toBeVisible();
  await page.getByRole('button', {name:'Saturday, November 21, 2026'}).click();

  await expect(page.getByLabel('Number of days')).toHaveText('6 days');
  await expect(page.locator('.planner-day')).toHaveCount(6);
  await expect(page.locator('.planner-day').first()).toContainText('Nov 16, 2026');
  await expect(page.locator('.planner-day').last()).toContainText('Nov 21, 2026');

  await page.getByRole('button', {name:/Departure date/}).click();
  await expect(page.locator('.stay-grid button[data-arrival]')).toHaveText('16');
  await expect(page.locator('.stay-grid button[data-departure]')).toHaveText('21');
  await expect(page.locator('.stay-grid button[data-range]')).toHaveCount(4);
  await page.getByRole('button', {name:'Close calendar'}).click();

  await page.getByRole('button', {name:'Increase trip length'}).click();
  await expect(page.getByLabel('Number of days')).toHaveText('7 days');
  await expect(page.getByRole('button', {name:/Departure date.*November 22, 2026/})).toBeVisible();
  await expect(page.locator('.planner-day')).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('itinerary calendar remains usable on a phone viewport', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await page.goto('/');
  await page.getByRole('button', {name:'View my itinerary'}).click();
  await page.getByRole('button', {name:/Departure date/}).click();
  await expect(page.getByRole('region', {name:'Trip calendar'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Today', exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
