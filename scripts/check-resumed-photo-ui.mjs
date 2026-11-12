import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('data/photo-review/resumed',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3001/');
 await expect(page.getByLabel('Country',{exact:true}).locator('option')).toHaveCount(250);
 for(const [country,city,name,credit] of [
  ['Singapore','Singapore','OCBC Garden Rhapsody','Lim Yaohui'],
  ['Japan','Tokyo','Yanaka Ginza','timelesstokyo.com']
 ]){
  await page.getByLabel('Country',{exact:true}).selectOption(country);
  await page.getByLabel('Location',{exact:true}).fill(city);
  await page.getByRole('option',{name:city,exact:true}).click();
  await page.getByRole('button',{name:'Find my adventure'}).click();
  await page.getByLabel('Find a place',{exact:true}).fill(name);
  const card=page.locator('.place-card').filter({has:page.getByRole('button',{name:`Explore ${name}`,exact:true})});
  await expect(card).toHaveCount(1);
  await expect(card.locator('img')).toHaveAttribute('data-photo-status','available');
  await card.locator('img').evaluate(img=>img.decode());
  const src=await card.locator('img').getAttribute('src');
  await card.getByRole('button',{name:`Explore ${name}`,exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.locator('.detail-photo').evaluate(img=>img.decode());
  await expect(dialog.locator('.photo-attribution')).toContainText(credit);
  await expect(dialog.locator('.photo-attribution')).toContainText('rights retained');
  await page.waitForTimeout(350); // Let the existing dialog entrance animation settle.
  await page.screenshot({path:`data/photo-review/resumed/ui-${city.toLowerCase()}.png`});
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw new Error(`${name}: mobile overflow`);
  await page.screenshot({path:`data/photo-review/resumed/ui-${city.toLowerCase()}-mobile.png`});
  results.push({name,src,creditVisible:true,mobileOverflow:overflow});
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.setViewportSize({width:1440,height:1100});
  await page.getByLabel('Find a place',{exact:true}).fill('');
 }
 if(errors.length)throw new Error(errors.join('\n'));
 writeFileSync('data/photo-review/resumed/ui-check.json',JSON.stringify({errors,results},null,2));
 console.log(JSON.stringify({errors,results}));
}finally{await browser.close();}
