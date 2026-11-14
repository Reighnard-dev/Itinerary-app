import {selectCountry, selectCity} from './destination-picker';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('reviewed landmark photos are served with canonical credits and replace the AI fallback',async({page,request})=>{
 const imported=JSON.parse(readFileSync('research/rights/landmark-photo-import.json','utf8'));
 for(const [id,entry] of Object.entries(imported) as [string,any][]){
  const response=await request.get('/api/place-image',{params:{id}});expect(response.ok()).toBe(true);
  const {photo}=await response.json();expect(photo).toEqual(entry.photo);
  const image=await request.get(photo.url);expect(image.ok()).toBe(true);expect(image.headers()['content-type']).toContain('image/');
  expect((await image.body()).length).toBeGreaterThan(1500);
 }
 await page.goto('/');await selectCountry(page,'Vietnam');
 await selectCity(page,'Sa Pa');
 await page.getByRole('button',{name:'Find my adventure'}).click();
 const card=page.locator('.place-card').filter({has:page.getByRole('button',{name:'Ta Phin Village',exact:true})});
 await card.scrollIntoViewIfNeeded();const image=card.locator('img[data-photo-status="available"]');
 await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(100);
 await expect(card.locator('.atmosphere-label')).toHaveCount(0);
 await expect(card.locator('.photo-credit')).toHaveAttribute('href',imported['sapa-96e37a9b1d8a29f5'].photo.sourceUrl);
 await page.screenshot({path:'test-results/real-landmarks-desktop.png'});
 await page.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 await page.screenshot({path:'test-results/real-landmarks-mobile.png'});
});
