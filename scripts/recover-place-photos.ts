import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {places as originals} from '../shared/catalog.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {commonsPhoto,isNearby,normalName,type CommonsImage,type WikipediaPage,type PhotoIdentity} from '../server/photo-search.js';

const places:Place[]=[...originals,...JSON.parse(readFileSync('shared/expanded-places.json','utf8'))];
const manifest:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const identities:Record<string,PhotoIdentity>=JSON.parse(readFileSync('shared/photo-identities.json','utf8'));
const articles=new Map<string,WikipediaPage>(),aliases=new Map<string,string>(),images=new Map<string,ReturnType<typeof commonsPhoto>>();
for(const file of readdirSync('data/sources/photos').filter(f=>f.endsWith('.json'))){
 const result=JSON.parse(readFileSync(`data/sources/photos/${file}`,'utf8'));
 for(const alias of [...(result.query?.normalized||[]),...(result.query?.redirects||[])])aliases.set(normalName(alias.from),normalName(alias.to));
 for(const page of result.query?.pages||[]){if(page.pageimage)articles.set(normalName(page.title),page);if(page.imageinfo)images.set(normalName(page.title.replace(/^File:/,'')),commonsPhoto(page as CommonsImage,''));}
}
let gate=Promise.resolve(),lastRequest=0,cooldown=0;
async function pace(){const task=gate.then(async()=>{await new Promise(r=>setTimeout(r,Math.max(0,400-(Date.now()-lastRequest),cooldown-Date.now())));lastRequest=Date.now();});gate=task;await task;}
const downloads=new Map<string,Promise<string|null>>();
async function download(url:string):Promise<string|null>{
 if(downloads.has(url))return downloads.get(url)!;
 const task=(async()=>{const hash=createHash('sha256').update(url).digest('hex').slice(0,24),local=`/images/places/${hash}.jpg`;if(existsSync(`public${local}`))return local;
  for(let attempt=0;attempt<4;attempt++){
   await pace();
   try{const response=await fetch(url,{headers:{'User-Agent':'RoamItinerary/1.0 (http://localhost:3001; attributed destination photographs)'},signal:AbortSignal.timeout(20000)});
    if(response.status===429||response.status===503){cooldown=Date.now()+Math.min(60000,Math.max(5000,(Number(response.headers.get('retry-after'))||5*2**attempt)*1000));await response.body?.cancel();continue;}
    if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))return null;const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1500||bytes.length>3000000)return null;writeFileSync(`public${local}`,bytes);return local;
   }catch{if(attempt===3)return null;}
  }
  return null;
 })();downloads.set(url,task);return task;
}
const tasks:{place:Place;photo:NonNullable<ReturnType<typeof commonsPhoto>>;match:string}[]=[];
for(const place of places){
 if(manifest[place.id])continue;const linked=Boolean(identities[place.id]?.wikipediaTitle);let title=normalName(identities[place.id]?.wikipediaTitle||place.name);for(let i=0;i<5&&aliases.has(title);i++)title=aliases.get(title)!;
 const article=articles.get(title);if(!article?.pageimage||!((linked&&!article.coordinates?.length)||isNearby(place,article.coordinates,linked?10:3)))continue;
 const photo=images.get(normalName(article.pageimage));if(photo)tasks.push({place,photo,match:linked?'Linked Wikipedia article':'Exact article title with matching location'});
}
console.log(`Recovering ${tasks.length} matched place records using already cached metadata.`);
let cursor=0,recovered=0,failed=0;
async function worker(){while(cursor<tasks.length){const {place,photo,match}=tasks[cursor++];const local=await download(photo.remoteUrl);if(!local){failed++;continue;}const {remoteUrl,...credit}=photo;manifest[place.id]={...credit,url:local,match};recovered++;if(recovered%25===0){writeFileSync('shared/place-images.json',JSON.stringify(manifest));console.log(`Recovered ${recovered} · ${Object.keys(manifest).length} total photo records`);}}}
await Promise.all([worker(),worker()]);writeFileSync('shared/place-images.json',JSON.stringify(manifest));console.log(JSON.stringify({total:Object.keys(manifest).length,recovered,failed}));
