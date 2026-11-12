import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {places as originals} from '../shared/catalog.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {commonsPhoto,isNearby,normalName,wikiRequest,type CommonsImage,type PhotoIdentity} from '../server/photo-search.js';
import {publicImage} from '../server/public-image-fetch.js';
const all:Place[]=[...originals,...JSON.parse(readFileSync('shared/expanded-places.json','utf8'))];
const identities:Record<string,PhotoIdentity>=JSON.parse(readFileSync('shared/photo-identities.json','utf8'));
const output:Record<string,PlaceImage>=existsSync('shared/entity-photo-candidates.json')?JSON.parse(readFileSync('shared/entity-photo-candidates.json','utf8')):{};
const sourced={...JSON.parse(readFileSync('shared/place-images.json','utf8')),...JSON.parse(readFileSync('shared/web-photo-candidates.json','utf8')),...JSON.parse(readFileSync('shared/venue-photo-candidates.json','utf8')),...output};
const groups=new Map<string,Place[]>();for(const place of all){const q=identities[place.id]?.wikidataId;if(q&&!sourced[place.id]){const group=groups.get(q)||[];group.push(place);groups.set(q,group);}}
mkdirSync('data/sources/photos/entities',{recursive:true});const candidates:{place:Place;file:string}[]=[];
let checked=0;console.log(`Researching ${groups.size} remaining linked place identities using Wikidata’s documented cached data files.`);
for(const [q,places] of groups){try{
 const file=`data/sources/photos/entities/${q}.json`;let result:any;
 if(existsSync(file))result=JSON.parse(readFileSync(file,'utf8'));else{
  await new Promise(r=>setTimeout(r,800));
  for(let attempt=0;attempt<4;attempt++){
   const response=await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`,{headers:{'User-Agent':'RoamItinerary/1.0 (http://localhost:3001; attributed destination photographs)'},signal:AbortSignal.timeout(15000)});
   if(response.status===429||response.status===503){await new Promise(r=>setTimeout(r,Math.min(60000,Math.max(5000,(Number(response.headers.get('retry-after'))||5*2**attempt)*1000))));continue;}
   if(!response.ok)break;result=await response.json();writeFileSync(file,JSON.stringify(result));break;
  }
 }
 const entity=result?.entities?.[q];const image=entity?.claims?.P18?.find((c:any)=>c.rank!=='deprecated')?.mainsnak?.datavalue?.value;const coordinate=entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
 if(typeof image==='string')for(const place of places)if(!coordinate||isNearby(place,[{lat:coordinate.latitude,lon:coordinate.longitude}],10))candidates.push({place,file:image});
}catch{}checked++;if(checked%25===0)console.log(`Checked ${checked}/${groups.size} identities · ${candidates.length} additional photographic candidates`);}
const files=[...new Set(candidates.map(c=>c.file))];const info=new Map<string,NonNullable<ReturnType<typeof commonsPhoto>>>();
for(let i=0;i<files.length;i+=30){const batch=files.slice(i,i+30);try{
 const params={action:'query',titles:batch.map(f=>`File:${f}`).join('|'),prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'640',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories'};
 const cache=`data/sources/photos/entities/meta-${createHash('sha256').update(JSON.stringify(params)).digest('hex')}.json`;
 const data=existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',params);if(!existsSync(cache))writeFileSync(cache,JSON.stringify(data));
 for(const page of data.query?.pages||[]){const photo=commonsPhoto(page,'Exact place identity linked by the travel guide');if(photo)info.set(normalName(page.title.replace(/^File:/,'')),photo);}
}catch(error){console.log(`Metadata paused: ${(error as Error).message}`);break;}}
let saved=0;
for(const {place,file} of candidates){const photo=info.get(normalName(file));if(!photo||output[place.id])continue;try{const filename=createHash('sha256').update(photo.remoteUrl).digest('hex').slice(0,24)+'.jpg',url=`/images/places/${filename}`;if(!existsSync(`public${url}`)){await new Promise(r=>setTimeout(r,500));writeFileSync(`public${url}`,await publicImage(photo.remoteUrl));}const {remoteUrl,...credit}=photo;output[place.id]={...credit,url};saved++;if(saved%25===0){writeFileSync('shared/entity-photo-candidates.json',JSON.stringify(output));console.log(`Saved ${saved} additional identity-linked place photos`);}}catch{}}
writeFileSync('shared/entity-photo-candidates.json',JSON.stringify(output));console.log(JSON.stringify({identities:checked,candidates:candidates.length,photos:Object.keys(output).length}));
