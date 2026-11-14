import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {chromium} from '@playwright/test';
const latest=new Map();for(const line of readFileSync('research/rights/full-photo-recovery/outcomes.jsonl','utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);latest.set(row.id,row);}
const unique=new Map();for(const r of latest.values())if(r.status==='imported'){const group=unique.get(r.photo.url)||[];group.push(r);unique.set(r.photo.url,group);}
const photos=[...unique],dir='data/photo-review/sheets';mkdirSync(dir,{recursive:true});
const previous=existsSync(dir+'/index.json')?JSON.parse(readFileSync(dir+'/index.json','utf8')):[],order=new Map(previous.map((r,i)=>[r.url,i]));
photos.sort((a,b)=>(order.get(a[0])??Infinity)-(order.get(b[0])??Infinity));
writeFileSync(dir+'/index.json',JSON.stringify(photos.map(([url,places],index)=>({index,sheet:Math.floor(index/20),url,places:places.map(p=>({id:p.id,name:p.name,city:p.city,title:p.photo.title}))})),null,2));
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
 const start=Math.max(0,Number(process.argv[2])||0)*20;
 for(let offset=start;offset<photos.length;offset+=20){
  const html='<!doctype html><style>body{margin:0;padding:12px;font:14px sans-serif;background:#fff}main{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}article{height:255px;overflow:hidden}img{width:100%;height:190px;object-fit:contain;background:#eee}p{margin:2px 0}</style><main>'+photos.slice(offset,offset+20).map(([url,group],i)=>`<article><img src="${esc(pathToFileURL(path.resolve('public'+url)).href)}"><p>${offset+i}: ${esc(group.map(p=>p.name+' ('+p.city+')').join('; '))}</p><small>${esc(group[0].photo.title)}</small></article>`).join('')+'</main>';
  const file=path.resolve(dir+'/review.html');writeFileSync(file,html);await page.goto(pathToFileURL(file).href);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await page.screenshot({path:dir+'/sheet-'+Math.floor(offset/20)+'.jpg',quality:85});
 }
 console.log(JSON.stringify({uniquePhotos:photos.length,sheets:Math.ceil(photos.length/20),index:dir+'/index.json'}));
}finally{await browser.close();}
