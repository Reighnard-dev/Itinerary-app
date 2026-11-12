import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3001/',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Your next somewhere.'}).waitFor();
 await page.locator('.place-card').first().scrollIntoViewIfNeeded();await page.locator('.place-card img').first().evaluate(img=>img.decode());
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'test-results/hero-static-text.png'});
 await page.waitForFunction(()=>Boolean(document.querySelector('.hero-slide[data-incoming="true"]')),{},{timeout:12000});await page.screenshot({path:'test-results/hero-mid-fade.png'});
 await page.getByRole('button',{name:'Explore Fushimi Inari Shrine',exact:true}).click();await page.getByRole('dialog').locator('.detail-photo').evaluate(img=>img.decode());await page.waitForTimeout(350);await page.screenshot({path:'test-results/place-photo-and-credit.png'});
 await page.getByRole('button',{name:'Close dialog'}).click();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'test-results/mobile-smooth-hero.png'});
 console.log(JSON.stringify({pageErrors:errors,mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),firstPhoto:await page.locator('.place-card img').first().getAttribute('src')}));
 const manifest=JSON.parse(readFileSync('shared/place-images.json','utf8'));const entries=Object.entries(manifest);const samples=[...entries.slice(0,8),...Array.from({length:24},(_,i)=>entries[Math.floor((i+1)*entries.length/25)])].filter(Boolean);
 const gallery=await browser.newPage({viewport:{width:1500,height:1400}});
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 await gallery.setContent(`<html><body style="margin:0;padding:20px;font:12px system-ui;background:#faf9f1;display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${samples.map(([id,photo])=>`<figure style="margin:0;min-width:0"><img src="http://127.0.0.1:3001${escape(photo.url)}" style="width:100%;height:150px;object-fit:cover;border-radius:5px"><figcaption style="margin-top:6px;font-size:9px;line-height:1.5;overflow-wrap:anywhere">${escape(id)}<br>${escape(photo.title)}</figcaption></figure>`).join('')}</body></html>`);
 await gallery.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));await gallery.screenshot({path:'test-results/place-photo-contact-sheet.png',fullPage:true});
 console.log(JSON.stringify({sampled:samples.length,unloaded:await gallery.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).length)}));
}finally{await browser.close();}
