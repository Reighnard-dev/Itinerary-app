// Render every photo added since this device's reconstructed baseline.
// This is a review artifact, not automatic proof of an exact-place match.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const baseline=load(process.argv[2]||'data/photo-review/resume-baseline-2026-11-12.json');
const missing=new Map(baseline.unresolved.map(p=>[p.id,p]));
const manifests=['web-photo-candidates','venue-photo-candidates','entity-photo-candidates','place-images'];
const photos=Object.assign({},...manifests.map(n=>load(`shared/${n}.json`)));
const entries=Object.entries(photos).filter(([id])=>missing.has(id));
mkdirSync('data/photo-review/resumed',{recursive:true});
writeFileSync('data/photo-review/resumed/entries.json',JSON.stringify(entries.map(([id,photo])=>({place:missing.get(id),photo})),null,2));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200}});
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 for(let offset=0;offset<entries.length;offset+=24){
  await page.setContent(`<html><body style="margin:0;padding:12px;font:13px system-ui;background:#faf9f1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${entries.slice(offset,offset+24).map(([id,p],i)=>`<figure style="margin:0;min-width:0"><img src="${'data:image/jpeg;base64,'+readFileSync('public'+p.url).toString('base64')}" style="width:100%;height:220px;object-fit:contain;background:#eee"><figcaption style="height:95px;overflow:hidden"><b>${offset+i+1}. ${escape(missing.get(id).name)} · ${escape(missing.get(id).city)}</b><br>${escape(p.title)}<br>${escape(p.sourceUrl)}</figcaption></figure>`).join('')}</body></html>`);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
  const unloaded=await page.locator('img').evaluateAll(imgs=>imgs.filter(img=>!img.naturalWidth).length);
  if(unloaded)throw new Error(`${unloaded} review images failed to decode`);
  await page.screenshot({path:`data/photo-review/resumed/sheet-${String(offset/24+1).padStart(3,'0')}.png`,fullPage:true});
 }
 console.log(JSON.stringify({newPhotos:entries.length,sheets:Math.ceil(entries.length/24)}));
}finally{await browser.close();}
