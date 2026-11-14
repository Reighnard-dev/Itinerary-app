import {selectCountry, selectCity} from './destination-picker';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('bulk recovered photos retain canonical credits and display on location cards',async({page,request})=>{
 const latest=new Map<string,any>();for(const line of readFileSync('research/rights/full-photo-recovery/outcomes.jsonl','utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);latest.set(row.id,row);}
 const imported=[...latest.values()].filter(r=>r.status==='imported');expect(imported.length).toBeGreaterThan(0);
 const sample=imported.filter((_r,i)=>i%Math.max(1,Math.floor(imported.length/12))===0).slice(0,12);
 for(const row of sample){const response=await request.get('/api/place-image',{params:{id:row.id}});expect(response.ok()).toBe(true);const {photo}=await response.json();expect(photo).toEqual(row.photo);expect((await request.get(photo.url)).ok()).toBe(true);}
 await page.goto('/');await selectCountry(page,'Ghana');
 await selectCity(page,'Accra');await page.getByRole('button',{name:'Find my adventure'}).click();
 const card=page.locator('.place-card').filter({has:page.getByRole('button',{name:'Ussher Fort',exact:true})});await card.scrollIntoViewIfNeeded();const img=card.locator('img[data-photo-status="available"]');await expect(img).toBeVisible();await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(100);await expect(card.locator('.photo-credit')).toHaveAttribute('href',latest.get('guide-gh-a7ba5782e1063cc814e0').photo.sourceUrl);
 await page.screenshot({path:'test-results/full-recovery-desktop.png'});await page.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);await page.screenshot({path:'test-results/full-recovery-mobile.png'});
});
