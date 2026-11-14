import {selectCountry, selectCity} from './destination-picker';
import {test,expect} from '@playwright/test';
test('missing landmark photos show labeled photorealistic atmosphere in cards, details and itineraries',async({page})=>{
 await page.route('**/api/place-image?**',route=>route.fulfill({json:{photo:null}}));
 await page.goto('/');
 await selectCountry(page,'Vietnam');
 await selectCity(page,'Sa Pa');await page.getByRole('button',{name:'Find my adventure'}).click();
 const card=page.locator('.place-card').filter({has:page.getByRole('button',{name:'Fansipan Mountain',exact:true})});
 await card.scrollIntoViewIfNeeded();await expect(card.locator('[data-photo-status="generated"]')).toBeVisible();await expect(card.getByText('AI-generated atmosphere',{exact:true})).toBeVisible();
 await expect.poll(()=>card.locator('.atmosphere-photo img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(100);
 await page.screenshot({path:'test-results/atmosphere-sapa.png',fullPage:false});
 await card.getByRole('button',{name:'Fansipan Mountain',exact:true}).click();await expect(page.locator('.photo-attribution')).toContainText('Fictional scene, not a photograph');
 await page.getByRole('button',{name:'Close dialog'}).click();await card.locator('.add-btn').click();await page.getByRole('button',{name:'View my itinerary'}).click();await expect(page.locator('.itinerary-stop [data-photo-status="generated"]')).toBeVisible();
});
