import { expect, test } from '@playwright/test';

test('Explore artwork, featured place, and the category rail work at desktop and mobile widths', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Explore your adventure' })).toBeVisible();

  const rail = page.getByRole('group', { name: 'Experience types' });
  const everything = rail.getByRole('button', { name: 'Everything' });
  await expect(everything).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => rail.locator('img').evaluateAll(images =>
    images.every(image => (image as HTMLImageElement).naturalWidth > 0),
  )).toBe(true);

  const featured = page.locator('.explore-feature');
  const name = await featured.getByRole('heading').innerText();
  await featured.getByRole('button', { name: /View featured place/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'More categories' }).click();
  await expect.poll(() => rail.evaluate(row => row.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Previous categories' }).click();
  await expect.poll(() => rail.evaluate(row => row.scrollLeft)).toBe(0);

  const nature = rail.getByRole('button', { name: 'Nature', exact: true });
  await nature.click();
  await expect(nature).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Experience category')).toHaveValue('Nature');
  await expect(page.locator('.place-card').first().locator('.card-category')).toContainText('Nature');
  await expect(featured).toHaveCount(0);
  await page.getByLabel('Experience category').selectOption('All experiences');
  await expect(everything).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
