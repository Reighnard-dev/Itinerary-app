import {readFileSync,readdirSync} from 'node:fs';
import {commonsPhoto,type CommonsImage} from '../server/photo-search.js';
const pages=new Map<string,CommonsImage>();
for(const file of readdirSync('data/sources/photos').filter(x=>x.endsWith('.json'))){const data=JSON.parse(readFileSync(`data/sources/photos/${file}`,'utf8'));for(const p of data.query?.pages||[])if(p.imageinfo)pages.set(p.title,p);}
const all=[...pages.values()],accepted=all.filter(p=>commonsPhoto(p,''));
console.log(JSON.stringify({metadata:all.length,accepted:accepted.length}));
if(process.argv.includes('--probe')){const manifest=JSON.parse(readFileSync('shared/place-images.json','utf8'));const saved=new Set(Object.values(manifest).map((p:any)=>p.sourceUrl));for(const page of accepted.filter(p=>!saved.has(p.imageinfo?.[0].descriptionurl)).slice(0,3)){const photo=commonsPhoto(page,'')!;const response=await fetch(photo.remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (http://localhost:3001; attributed photographs)'},signal:AbortSignal.timeout(15000)});console.log(JSON.stringify({title:page.title,status:response.status,type:response.headers.get('content-type'),retryAfter:response.headers.get('retry-after'),message:response.ok?undefined:(await response.text()).slice(0,300)}));}}
