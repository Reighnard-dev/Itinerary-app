import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://localhost:5173');
 await page.getByLabel('Country',{exact:true}).selectOption('Vietnam');
 await page.getByRole('combobox',{name:'Location',exact:true}).fill('Sa Pa');
 await page.getByRole('option',{name:'Sa Pa',exact:true}).click();
 await page.getByRole('button',{name:'Find my adventure'}).click();
 await page.locator('.load-more-places').click({timeout:30000});
 await expect(page.locator('.place-card')).toHaveCount(25,{timeout:20000});
 await page.locator('.place-card img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
 console.log(await page.locator('.place-card img').evaluateAll(async imgs=>{await Promise.allSettled(imgs.map(img=>img.decode()));return imgs.filter(img=>!img.complete||!img.naturalWidth||img.src.endsWith('/fallback.svg')).map(img=>({alt:img.alt,src:img.src}));}));
 await expect.poll(()=>page.locator('.place-card img').evaluateAll(imgs=>imgs.filter(img=>img.complete&&img.naturalWidth>0&&!img.src.endsWith('/fallback.svg')).length)).toBe(25);
 await page.getByRole('button',{name:'Food & drink',exact:true}).click();
 await expect(page.locator('.place-card')).toHaveCount(1);
 await expect(page.locator('.place-card')).toContainText('Cong Caphe');
 await page.getByRole('button',{name:'Restaurants',exact:true}).click();
 await expect(page.locator('.place-card')).toHaveCount(3);
 await expect(page.locator('.place-card').filter({hasText:'Hoa Tam Vegetarian Restaurant'})).toBeVisible();
 await page.getByRole('button',{name:'Everything',exact:true}).click();
 await page.getByRole('button',{name:'Add Hotel de la Coupole to itinerary'}).click();
 await expect(page.getByRole('button',{name:'Add Hotel de la Coupole to itinerary'})).toContainText('Added');
 await page.screenshot({path:'data/sapa/app.png',fullPage:true});
 console.log('PASS: Sa Pa → 25 photos → cafe and restaurant filters → hotel added to itinerary');
}finally{await browser.close();}
