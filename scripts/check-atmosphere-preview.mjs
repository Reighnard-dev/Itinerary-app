import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 await page.goto('http://127.0.0.1:3001/');await page.getByLabel('Country',{exact:true}).selectOption('Vietnam');
 const city=page.getByLabel('Location',{exact:true});await city.fill('Sa Pa');await city.press('ArrowDown');await city.press('Enter');await page.getByRole('button',{name:'Find my adventure'}).click();
 const card=page.locator('.place-card').filter({has:page.getByRole('button',{name:'Ta Phin Village',exact:true})});
 await card.scrollIntoViewIfNeeded();await card.locator('img[data-photo-status="available"], .atmosphere-photo img').first().evaluate(img=>img.decode());
 await page.screenshot({path:'test-results/atmosphere-preview-desktop.png'});
 const valley=page.locator('.place-card').filter({has:page.getByRole('button',{name:'Muong Hoa Valley',exact:true})});
 const src=await valley.locator('img').first().getAttribute('src');if(src.includes('/atmosphere/')&&!src.includes('terraces.jpg'))throw new Error('Generated valley atmosphere should use terraces');
 await page.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/atmosphere-preview-mobile.png'});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Mobile horizontal overflow');
 console.log(JSON.stringify({preview:'http://localhost:3001/',valley:src,mobileOverflow:false}));
}finally{await browser.close();}
