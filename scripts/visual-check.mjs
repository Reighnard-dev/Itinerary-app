import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 const failed=[];page.on('pageerror',e=>failed.push(e.message));
 await page.goto('http://127.0.0.1:3001/',{waitUntil:'networkidle'});
 await page.locator('.place-card').last().scrollIntoViewIfNeeded();
 await page.evaluate(()=>Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;setTimeout(resolve,10000);}))))
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/desktop-discover.png',fullPage:false});
 console.log(JSON.stringify({pageErrors:failed,images:await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({alt:i.alt,loaded:i.complete&&i.naturalWidth>0,fallback:i.src.includes('fallback')}))),desktopOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
 await page.setViewportSize({width:390,height:1000});await page.screenshot({path:'test-results/mobile-discover.png',fullPage:false});
 await page.getByLabel('Country',{exact:true}).selectOption('Singapore');await Promise.all([page.waitForResponse(r=>r.url().includes('/api/places?')&&r.url().includes('Singapore')),page.getByRole('button',{name:'Find my adventure'}).click()]);
 await page.getByRole('button',{name:'Restaurants',exact:true}).click();await page.locator('.place-card').first().waitFor();
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'test-results/desktop-restaurants.png',fullPage:false});
 console.log(JSON.stringify({mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
}finally{await browser.close();}
