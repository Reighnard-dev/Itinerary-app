import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('production serves credited photography and refuses quarantined media',async({page,request})=>{
 const remediation=JSON.parse(readFileSync('research/rights/remediation.json','utf8'));
 const removed=remediation.movedAssets.map((a:{file:string})=>a.file.replaceAll('\\','/')).find((file:string)=>file.startsWith('public/images/')&&file.endsWith('.jpg'));
 expect(removed).toBeTruthy();expect((await request.get('/'+removed.slice(7))).status()).toBe(404);
 expect((await request.get('/illustrations/culture.svg')).status()).toBe(404);
 const knowledgePhoto=await request.get('/api/place-image?id=wikidata-Q1655368');expect(knowledgePhoto.ok()).toBe(true);expect((await knowledgePhoto.json()).photo.sourceUrl).toContain('commons.wikimedia.org/wiki/File:');
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your next somewhere.'})).toBeVisible();
 await expect.poll(()=>page.locator('.hero-slide[data-active="true"]').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(100);
 await expect(page.locator('.hero-photo-credit a[href*="creativecommons.org"]').first()).toBeVisible();
 expect(await page.locator('img[src*="illustrations"]').count()).toBe(0);
 const credits=await request.get('/photo-credits.html');expect(credits.ok()).toBe(true);expect(await credits.text()).toContain('CSS crops');
 const response=await request.get('/api/source-data/odbl-places.json');expect(response.ok()).toBe(true);expect((await response.json()).license).toBe('ODbL 1.0');
 await page.screenshot({path:'test-results/rights-desktop.png',fullPage:false});
});
test('slow photo lookups leave navigation responsive and use at most two connections',async({page})=>{
 let lookups=0,release!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/place-image?**',async route=>{lookups++;await hold;await route.fulfill({json:{photo:null}}).catch(()=>{});});
 try{await page.goto('/');await expect(page.getByRole('heading',{name:'Your next somewhere.'})).toBeVisible();await page.locator('.place-card').nth(6).scrollIntoViewIfNeeded();
  await expect.poll(()=>lookups).toBe(2);await page.getByRole('button',{name:'My itineraries',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your next chapters.'})).toBeVisible();expect(lookups).toBe(2);
 }finally{release();}
});
