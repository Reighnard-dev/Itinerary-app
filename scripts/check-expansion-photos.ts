import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {places} from '../server/catalog.js';
import codes from '../shared/expansion-countries.json' with {type:'json'};
import {countryCode} from '../server/world.js';
const requested=new Set(process.argv.slice(2).filter(arg=>!arg.startsWith('--')));
const original=new Set((JSON.parse(readFileSync('shared/expanded-places.json','utf8')) as {id:string}[]).map(p=>p.id));
const groups=new Map<string,typeof places>();
for(const p of places){if((requested.size&&!requested.has(p.country))||!p.photo||original.has(p.id)||!codes.includes(countryCode(p.country)))continue;const group=groups.get(p.country)||[];group.push(p);groups.set(p.country,group);}
const samples=[...groups.values()].flatMap(group=>group.slice(0,Number(process.argv.find(arg=>arg.startsWith('--per-country='))?.split('=')[1]||2)));
const dir=requested.size===1?'data/photo-review/final-'+[...requested][0].toLowerCase().replaceAll(' ','-'):requested.size?'data/photo-review/final-ten':'data/photo-review/country-expansion';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1150},deviceScaleFactor:1});
const escape=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
for(let i=0;i<samples.length;i+=20){
 const group=samples.slice(i,i+20),html=group.map(p=>`<article><img src="data:image/jpeg;base64,${readFileSync(`public${p.photo!.url}`).toString('base64')}"/><b>${escape(p.name)}</b><span>${escape(p.city)}, ${escape(p.country)}</span></article>`).join('');
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:12px;background:#f5f2e9;font:14px Arial;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}article{height:212px;background:white;padding:7px;overflow:hidden}img{width:100%;height:160px;object-fit:contain;background:#ddd}b,span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}b{margin-top:4px}span{font-size:11px;color:#555}</style>${html}`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(el=>(el as HTMLImageElement).decode())));
 await page.screenshot({path:`${dir}/sheet-${String(i/20+1).padStart(2,'0')}.png`,fullPage:true});
}
await browser.close();writeFileSync(`${dir}/samples.json`,JSON.stringify(samples.map(p=>({id:p.id,name:p.name,city:p.city,country:p.country,photo:p.photo})),null,2));
console.log(JSON.stringify({sampled:samples.length,countries:groups.size,sheets:Math.ceil(samples.length/20),directory:dir}));
