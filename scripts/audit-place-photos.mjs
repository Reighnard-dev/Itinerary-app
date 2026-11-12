import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const load=file=>JSON.parse(readFileSync(file,'utf8'));
const originals=(await import('../dist-server/shared/catalog.js')).places;
const seen=new Set(),places=[...originals,...load('shared/expanded-places.json')].filter(p=>{const key=`${p.country}:${p.city}:${p.name.toLowerCase()}`;if(seen.has(key))return false;seen.add(key);return true;});
const sources={wikimedia:load('shared/place-images.json'),identity:load('shared/entity-photo-candidates.json'),venue:load('shared/venue-photo-candidates.json'),web:load('shared/web-photo-candidates.json')};
const photos={...sources.web,...sources.venue,...sources.identity,...sources.wikimedia};
mkdirSync('data/photo-review',{recursive:true});
const server=createServer((req,res)=>{const path=req.url?.split('?')[0];if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body></body></html>');return;}if(!/^\/images\/places\/[a-f0-9]{24}\.jpg$/.test(path||'')||!existsSync(`public${path}`)){res.writeHead(404).end();return;}res.setHeader('Access-Control-Allow-Origin','*');res.end(readFileSync(`public${path}`));});
await new Promise(resolve=>server.listen(3112,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1400}});
 // Keep local image checks on the local origin; recent Chrome blocks requests
 // from an opaque about:blank origin into the loopback network.
 await page.goto('http://127.0.0.1:3112/');
 const urls=[...new Set(Object.values(photos).map(p=>p.url))];
 const sheetsOnly=process.argv.includes('--sheets-only');
 const decoded=sheetsOnly?[]:await page.evaluate(async urls=>{let cursor=0;const results=[];async function worker(){while(cursor<urls.length){const url=urls[cursor++];const result=await new Promise(resolve=>{const img=new Image();const timer=setTimeout(()=>resolve({url,error:'timeout'}),15000);img.onload=()=>{clearTimeout(timer);resolve({url,width:img.naturalWidth,height:img.naturalHeight});};img.onerror=()=>{clearTimeout(timer);resolve({url,error:'decode'});};img.src=`http://127.0.0.1:3112${url}`;});results.push(result);}}await Promise.all(Array.from({length:16},worker));return results;},urls);
 const failures=decoded.filter(p=>p.error||p.width<150||p.height<100);
 const named=new Map(places.map(p=>[p.id,p]));
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 for(const [label,manifest] of Object.entries(sources)){
  const entries=Object.entries(manifest).filter(([id])=>named.has(id));
  const samples=Array.from({length:Math.min(64,entries.length)},(_,i)=>entries[Math.floor(i*entries.length/Math.min(64,entries.length))]);
  await page.setContent(`<html><body style="margin:0;padding:16px;font:11px system-ui;background:#faf9f1;display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${samples.map(([id,photo])=>{const p=named.get(id);return `<figure style="margin:0;min-width:0"><img src="http://127.0.0.1:3112${escape(photo.url)}" style="width:100%;height:135px;object-fit:cover"><figcaption style="height:62px;overflow:hidden;line-height:1.4"><b>${escape(p.name)}</b> · ${escape(p.city)}<br>${escape(photo.title)}</figcaption></figure>`;}).join('')}</body></html>`);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
  await page.screenshot({path:`data/photo-review/photo-audit-${label}.png`,fullPage:true});
 }
 const unresolved=places.filter(p=>!photos[p.id]);
 const report={generatedAt:new Date().toISOString(),places:places.length,photographed:places.length-unresolved.length,uniqueFiles:urls.length,sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,Object.keys(v).length])),failures,unresolved:unresolved.map(p=>({id:p.id,name:p.name,country:p.country,city:p.city,category:p.category,address:p.address,lat:p.lat,lng:p.lng}))};
 if(!sheetsOnly)writeFileSync('data/photo-coverage.json',JSON.stringify(report));
 console.log(sheetsOnly?'Contact sheets saved to data/photo-review.':JSON.stringify({...report,failures:failures.length,unresolved:unresolved.length}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
