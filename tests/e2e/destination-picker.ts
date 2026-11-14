import {expect, type Page} from '@playwright/test';

export async function selectCountry(page: Page, country: string) {
  await page.getByRole('button', {name:/^Choose country:/}).click();
  const search = page.getByRole('searchbox', {name:'Search countries'});
  await expect(page.locator('.destination-kicker[role=status]')).toHaveText('250 countries & territories');
  await search.fill(country);
  await search.press('Enter');
  await expect(page.getByRole('button', {name:`Choose country: ${country}`, exact:true})).toBeVisible();
}

export async function selectCity(page: Page, city: string, query = city) {
  await page.getByRole('button', {name:/^Choose city:/}).click();
  await page.getByRole('searchbox', {name:'Search cities'}).fill(query);
  await page.getByRole('region', {name:'Pick your city'}).getByRole('button', {name:city, exact:true}).click();
}
