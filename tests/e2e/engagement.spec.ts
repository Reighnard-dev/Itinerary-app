import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('one-click suggest day, quick-add from card/featured/map, time slots, and quick notes work end-to-end', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next somewhere.' })).toBeVisible();

  // 1. One-click Suggest Day 1 from Discover sidebar
  await page.getByRole('button', { name: 'Suggest Day 1' }).click();
  await expect(page.locator('.mini-stop')).toHaveCount(4);
  await expect(page.locator('.mini-stop-meta').first()).toContainText('9:00 AM');

  // Switch to Day 2 in sidebar so Day 2 is empty, then test Quick-add controls
  await page.getByRole('button', { name: 'Select Day 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Suggest Day 2' })).toBeVisible();

  // 2. Quick-add from Featured Place banner to Day 2
  const featured = page.locator('.explore-feature');
  const featuredName = (await featured.getByRole('heading').innerText()).trim();
  await page.getByRole('button', { name: `Quick add featured ${featuredName} to Day 2` }).click();
  await expect(page.locator('.mini-stop')).toContainText(featuredName);

  // 3. Quick-add from a place card choosing Day 3 via card day selector
  const secondCard = page.locator('.place-card').nth(1);
  const secondName = (await secondCard.locator('.card-title').innerText()).trim();
  await page.getByLabel(`Quick-add day for ${secondName}`).selectOption('3');
  await secondCard.locator('.add-btn').click();
  await page.getByRole('button', { name: 'Select Day 3', exact: true }).click();
  await expect(page.locator('.mini-stop')).toContainText(secondName);

  // 4. Interactive Map View pin selection & quick-add from map pin
  await page.getByRole('button', { name: 'Map view', exact: true }).click();
  const pinRail = page.getByRole('group', { name: 'Map place pins' });
  await expect(pinRail).toBeVisible();
  const thirdPin = pinRail.locator('button').nth(2);
  const thirdPinName = (await thirdPin.locator('.map-pin-name').innerText()).trim();
  await thirdPin.click();
  await expect(page.locator('.map-selected-card')).toContainText(thirdPinName);
  await page.getByRole('button', { name: `Quick add ${thirdPinName} from map to Day 3` }).click();
  await expect(page.locator('.mini-stop')).toHaveCount(2);

  // 5. Planner: Suggest this day for Day 4, time slot presets, Sort by time, and note starters
  await page.getByRole('button', { name: 'View my itinerary' }).click();
  await page.getByRole('button', { name: 'Day 4', exact: false }).click();
  await page.getByRole('button', { name: 'Suggest this day' }).first().click();
  await expect(page.locator('.itinerary-stop').first()).toBeVisible();

  // Switch back to Day 3 (has 2 untimed stops: secondName and thirdPinName), assign out-of-order presets & sort
  await page.getByRole('button', { name: 'Day 3', exact: false }).click();
  const stop1 = page.locator('.itinerary-stop').nth(0);
  const stop2 = page.locator('.itinerary-stop').nth(1);
  await stop1.getByRole('button', { name: 'Afternoon', exact: true }).click();
  await stop2.getByRole('button', { name: 'Morning', exact: true }).click();
  await expect(stop1.locator('.time-badge')).toContainText('3:30 PM');

  await page.getByRole('button', { name: 'Sort by time' }).click();
  await expect(page.locator('.itinerary-stop').first()).toContainText(thirdPinName);

  await page.locator('.itinerary-stop').first().getByRole('button', { name: '+ Book tickets ahead' }).click();
  await expect(page.getByLabel(`Notes for ${thirdPinName}`)).toHaveValue(/Book tickets ahead/);

  // Mobile layout check at 360px
  await page.setViewportSize({ width: 360, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Back to discovering' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  expect(errors).toEqual([]);
});

test('shareable read-only link opens cleanly in a fresh browser and clones to editable trip', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Suggest Day 1' }).click();
  await page.getByRole('button', { name: 'View my itinerary' }).click();
  await page.getByLabel('Trip title', { exact: true }).fill('Shareable Kyoto Highlights');

  const firstStopNotes = page.locator('.itinerary-stop textarea').first();
  await firstStopNotes.fill('Bring cash for temple admission');

  await page.getByRole('button', { name: 'Share trip', exact: true }).click();
  const shareModal = page.getByRole('dialog');
  await expect(shareModal.getByRole('heading', { name: 'Share your itinerary.' })).toBeVisible();
  const shareUrl = await shareModal.getByLabel('Shareable trip link').inputValue();
  expect(shareUrl).toContain('share=');

  // Open the share URL in a separate fresh incognito context
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const guestErrors: string[] = [];
  guestPage.on('pageerror', e => guestErrors.push(e.message));

  await guestPage.goto(shareUrl);
  await expect(guestPage.getByText('Read-only view')).toBeVisible();
  await expect(guestPage.getByRole('heading', { name: 'Shareable Kyoto Highlights' })).toBeVisible();
  await expect(guestPage.getByText('Bring cash for temple admission')).toBeVisible();

  await guestPage.getByRole('button', { name: 'Clone to my trips' }).click();
  await expect(guestPage.getByLabel('Trip title', { exact: true })).toHaveValue('Shareable Kyoto Highlights');
  await expect(guestPage.locator('.itinerary-stop textarea').first()).toHaveValue('Bring cash for temple admission');

  expect(guestErrors).toEqual([]);
  await guestContext.close();
  expect(errors).toEqual([]);
});

test('guest draft transfers seamlessly when signing up via header CTA', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Suggest Day 1' }).click();
  await expect(page.locator('.guest-handoff-banner')).toBeVisible();

  // Click header signup button (not Save to account)
  await page.getByRole('button', { name: 'Let’s get going' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.auth-draft-notice')).toContainText('4 stops');

  const email = `handoff-${randomUUID()}@example.com`;
  await modal.getByLabel('Your name').fill('Morgan Explorer');
  await modal.getByLabel('Email address').fill(email);
  await modal.getByLabel('Password', { exact: true }).fill('Wanderlust123!');
  await modal.getByRole('button', { name: 'Create my account' }).click();
  await expect(modal).not.toBeVisible();

  // Reload and confirm the guest draft carried over and persisted under the new account
  await page.reload();
  await expect(page.getByText('Hey, Morgan')).toBeVisible();
  await expect(page.locator('.mini-stop')).toHaveCount(4);

  expect(errors).toEqual([]);
});
