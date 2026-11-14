import {expect, test} from '@playwright/test';
import {selectCity, selectCountry} from './destination-picker';

test('the visual planner loads distinct destination images and applies the stay', async ({page, request}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await selectCountry(page, 'Philippines');
  const country = page.getByRole('button', {name:'Choose country: Philippines'}).locator('img');
  const manila = page.getByRole('button', {name:'Choose city: Manila'}).locator('img');
  for (const img of [country, manila]) {
    await expect.poll(() => img.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
  const countryUrl = await country.getAttribute('src');
  const manilaUrl = await manila.getAttribute('src');
  expect(manilaUrl).not.toBe(countryUrl);
  await expect(manila).toHaveAttribute('title', /Manila Cathedral/);
  await selectCity(page, 'Cebu');
  const cebu = page.getByRole('button', {name:'Choose city: Cebu', exact:true}).locator('img');
  await expect(cebu).toHaveAttribute('title', /Santo Niño/);
  expect(await cebu.getAttribute('src')).not.toBe(manilaUrl);
  await expect(country).toHaveAttribute('src', countryUrl!);
  await selectCountry(page, 'France');
  await expect(page.getByRole('button', {name:'Choose city: Paris'}).locator('img')).toHaveAttribute('title', /Eiffel Tower/);
  await selectCountry(page, 'Philippines');
  await expect(country).toHaveAttribute('src', countryUrl!);
  await expect(manila).toHaveAttribute('src', manilaUrl!);

  await page.getByRole('button', {name:/^Arrival date/}).click();
  await page.getByRole('button', {name:'Next month'}).click();
  const dates = page.locator('.stay-grid button');
  await dates.nth(10).click();
  await expect(page.getByText('Choose your departure date')).toBeVisible();
  await dates.nth(15).click();
  await expect(page.getByLabel('Number of days')).toHaveText('6 days');
  await expect(page.getByRole('button', {name:/^Departure date/})).toContainText(/Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov/);
  await page.getByRole('button', {name:/^Departure date/}).click();
  await expect(page.locator('.stay-grid button[data-range]')).toHaveCount(4);
  await expect(page.locator('.stay-grid button[data-arrival]')).toHaveCount(1);
  await expect(page.locator('.stay-grid button[data-departure]')).toHaveCount(1);
  await page.screenshot({path:'test-results/stay-range-calendar.png'});
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'Find my adventure'}).click();
  await expect(page.locator('.destination-tag')).toContainText('Manila, Philippines');
  await expect(page.locator('.place-card').first()).toBeVisible();
  await expect(page.locator('.trip-preview .mini-trip')).toContainText('6 days');
  await page.setViewportSize({width:1440,height:1060});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path:'test-results/destination-planner-desktop.png'});

  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button', {name:/^Departure date/}).click();
  await expect(page.getByText('Choose your departure date')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/destination-planner-mobile.png'});
  const {destinations} = await (await request.get('/api/destinations')).json();
  const countryPhotos = destinations.flatMap((item: {photo?: {url:string}}) => item.photo ? [item.photo.url] : []);
  const {cities} = await (await request.get('/api/destination-artwork?country=Philippines')).json();
  expect(cities.Manila.photo.url).toBe(manilaUrl);
  expect(cities.Manila.lat).toBeCloseTo(14.6, 1);
  const fallback = destinations.find((item: {photo?: {url:string}}) => !item.photo);
  expect(fallback).toBeDefined();
  await selectCountry(page, fallback.country);
  await expect(page.getByRole('button', {name:`Choose country: ${fallback.country}`}).locator('[data-artwork]'))
    .toHaveAttribute('data-artwork', 'map');
  const cityPhotos = Object.values(cities).flatMap(item => {
    const city = item as {photo?: {url:string}};
    return city.photo ? [city.photo.url] : [];
  });
  expect(new Set([...countryPhotos,...cityPhotos]).size).toBe(countryPhotos.length + cityPhotos.length);
  expect(errors).toEqual([]);
});
