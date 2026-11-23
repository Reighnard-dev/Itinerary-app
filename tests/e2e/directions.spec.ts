import { test, expect } from '@playwright/test';

test('hybrid in-app directions panel opens, calculates walking & driving, handles transit fallback, and provides Google Maps link', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next somewhere.' })).toBeVisible();

  // Open landmark detail
  await page.getByRole('button', { name: 'Fushimi Inari Shrine', exact: true }).click();
  const detailModal = page.getByRole('dialog', { name: 'Fushimi Inari Shrine' });
  await expect(detailModal).toBeVisible();

  // Click "Get directions"
  await detailModal.getByRole('button', { name: 'Get directions' }).click();

  // In-app Directions panel should be open
  const directionsPanel = page.getByRole('dialog', { name: 'Directions to Fushimi Inari Shrine' });
  await expect(directionsPanel).toBeVisible();

  // Check destination landmark name and address
  await expect(directionsPanel.locator('.directions-destination-title')).toHaveText('Fushimi Inari Shrine');
  await expect(directionsPanel.locator('.directions-destination-address')).toContainText('Kyoto');

  // Check interactive map section is present
  await expect(directionsPanel.locator('.directions-map-wrapper')).toBeVisible();

  // Check Travel Mode tabs
  const transitTab = directionsPanel.getByRole('tab', { name: 'Public transit' });
  const drivingTab = directionsPanel.getByRole('tab', { name: 'Driving' });
  const walkingTab = directionsPanel.getByRole('tab', { name: 'Walking' });
  await expect(transitTab).toBeVisible();
  await expect(drivingTab).toBeVisible();
  await expect(walkingTab).toBeVisible();

  // By default, public transit is selected. In development/offline without Google key,
  // it must show the clear message and never invent bus numbers or schedules!
  await expect(
    directionsPanel.getByText('Live transit details are unavailable for this location.')
  ).toBeVisible();
  await expect(directionsPanel.locator('.roam-transit-advice')).toBeVisible();

  // Test Walking mode
  await walkingTab.click();
  await expect(directionsPanel.getByText('Live directions unavailable',{exact:true})).toBeVisible();
  await expect(directionsPanel.locator('.route-summary-card')).toHaveCount(0);

  // Test Driving mode
  await drivingTab.click();
  await expect(directionsPanel.getByText('Live directions unavailable',{exact:true})).toBeVisible();
  await expect(directionsPanel.locator('.route-summary-card')).toHaveCount(0);

  // Test Custom origin input
  await directionsPanel.getByRole('radio', { name: 'Custom address' }).click();
  const originInput = directionsPanel.getByLabel('Starting address or landmark');
  await originInput.fill('Kyoto Station');
  await directionsPanel.getByRole('button', { name: 'Set origin' }).click();
  await expect(directionsPanel.getByText('Live directions unavailable',{exact:true})).toBeVisible();
  await expect(directionsPanel.locator('.route-summary-card')).toHaveCount(0);

  // Test "Open in Google Maps" secondary fallback button
  const fallbackLink = directionsPanel.getByRole('link', { name: 'Open in Google Maps' });
  await expect(fallbackLink).toBeVisible();
  const fallbackHref = await fallbackLink.getAttribute('href');
  expect(fallbackHref).toContain('https://www.google.com/maps/dir/');
  expect(fallbackHref).toContain('destination=34.9671,135.7727');
  expect(fallbackHref).toContain('travelmode=driving');
  expect(fallbackHref).toContain('origin=Kyoto%20Station');

  // Test "Back to landmark"
  await directionsPanel.getByRole('button', { name: 'Back to landmark' }).click();
  await expect(directionsPanel).not.toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Fushimi Inari Shrine' })).toBeVisible();

  // Close detail
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  expect(errors).toEqual([]);
});

test('directions panel handles geolocation permission denied gracefully and works on mobile viewport', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Deny geolocation permissions
  await context.clearPermissions();

  // Set mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  // Open a landmark detail
  await page.getByRole('button', { name: 'Fushimi Inari Shrine', exact: true }).click();
  await page.getByRole('button', { name: 'Get directions' }).click();

  const directionsPanel = page.getByRole('dialog', { name: 'Directions to Fushimi Inari Shrine' });
  await expect(directionsPanel).toBeVisible();

  // Select Current location with geolocation denied
  await directionsPanel.getByRole('radio', { name: 'Current location' }).click();
  await expect(
    directionsPanel.getByText('Location access was denied. You can enter an address manually or choose a saved hotel.')
  ).toBeVisible();

  // Mobile layout check: ensure panel fits and doesn't cause horizontal overflow
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Close panel
  await directionsPanel.getByRole('button', { name: 'Close directions panel' }).click();
  await expect(directionsPanel).not.toBeVisible();

  expect(errors).toEqual([]);
});
