import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {places} from '../server/catalog.js';
import {placeSnapshotSchema} from '../server/validation.js';
import {geoCity} from '../server/world.js';
const rows=places.filter(p=>p.country==='Vietnam'&&p.city==='Sa Pa');
if(!geoCity('Vietnam','Sa Pa')||!rows.length)throw Error('Sa Pa missing');
for(const p of rows){const check=placeSnapshotSchema.safeParse(p);if(!check.success)throw Error(p.name+JSON.stringify(check.error));if(!p.photo)throw Error('Photo missing '+p.name);}
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.setContent(`<style>body{font:14px Arial;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}article{height:205px}img{width:100%;height:170px;object-fit:contain}b{display:block}</style>`+rows.map(p=>`<article><img src="data:image/jpeg;base64,${readFileSync('public'+p.photo!.url).toString('base64')}"/><b>${p.name}</b></article>`).join(''));
await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await page.screenshot({path:'data/sapa/photo-review.png',fullPage:true});await browser.close();console.log(JSON.stringify({city:true,places:rows.length,photos:rows.filter(p=>p.photo).length,categories:[...new Set(rows.map(p=>p.category))]}));
