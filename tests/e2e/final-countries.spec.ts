import {selectCountry} from './destination-picker';
import {test,expect} from '@playwright/test';

test('the final ten destinations show sourced places and cleared photos or explicit absences',async({page})=>{
 await page.goto('/');
 for(const country of ['Pitcairn','Reunion','Saint Barthelemy','Saint Lucia','Sint Maarten','Turks and Caicos Islands','Tuvalu','Ukraine','United States Minor Outlying Islands','Wallis and Futuna']){
  await selectCountry(page,country);await page.getByRole('button',{name:'Find my adventure'}).click();
  await expect(page.locator('.destination-tag')).toContainText(country);
  await expect(page.locator('.place-card').first(),country).toBeVisible();
  await page.locator('.place-card').first().scrollIntoViewIfNeeded();
  if(country==='United States Minor Outlying Islands')await expect(page.locator('.place-card [data-photo-status="generated"]').first(),country).toBeVisible();
  else await expect(page.locator('.place-card img[data-photo-status="available"]').first(),country).toBeVisible();
  await page.locator('.place-card').first().locator('.card-title').click();
  await expect(page.locator('.guide-information')).toBeVisible();await page.getByRole('button',{name:'Close dialog'}).click();
  if(country==='Saint Barthelemy'||country==='Ukraine')await page.screenshot({path:`test-results/final-${country.replaceAll(' ','-')}.png`,fullPage:true});
 }
 await expect(page.locator('.discovery-loading')).not.toBeVisible();
});
