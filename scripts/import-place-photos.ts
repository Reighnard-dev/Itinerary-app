import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {places as originals} from '../shared/catalog.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {commonsPhoto,identityFromListing,isNearby,normalName,wikiRequest,type CommonsImage,type PhotoIdentity,type WikipediaPage} from '../server/photo-search.js';

mkdirSync('data/sources/photos',{recursive:true});mkdirSync('public/images/places',{recursive:true});
const expanded:Place[]=JSON.parse(readFileSync('shared/expanded-places.json','utf8'));
const all=[...originals,...expanded];
const manifest:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const identities:Record<string,PhotoIdentity>=JSON.parse(readFileSync('shared/photo-identities.json','utf8'));
const sourceIdentities=new Map<string,PhotoIdentity>();
for(const file of readdirSync('data/sources/guides')){
 const page=JSON.parse(readFileSync(`data/sources/guides/${file}`,'utf8'));const doc=load(page.text);
 doc('.vcard').each((_i,node)=>{const el=doc(node),anchor=el.find('.listing-name').first().attr('id');if(anchor)sourceIdentities.set(`${page.title}#${anchor}`,identityFromListing(el.html()||''));});
}
for(const place of expanded){if(!place.source)continue;const source=new URL(place.source.url);const identity=sourceIdentities.get(`${source.searchParams.get('title')}#${decodeURIComponent(source.hash.slice(1))}`);if(identity&&(identity.wikidataId||identity.wikipediaTitle))identities[place.id]=identity;}
// Precise article titles for legacy handpicked entries with abbreviated display names.
const aliases:Record<string,string>={'kyoto-1':'Fushimi Inari-taisha','kyoto-2':'Arashiyama Bamboo Grove','kyoto-3':'Otagi Nenbutsu-ji','kyoto-4':'Kiyomizu-dera','kyoto-5':"Philosopher's Walk",'kyoto-6':'Nishiki Market','tokyo-1':'Sensō-ji','tokyo-2':'Shibuya Crossing','tokyo-3':'Yanaka Ginza','tokyo-4':'Todoroki Valley','bali-1':'Tegalalang','bali-2':'Uluwatu Temple','paris-1':'Eiffel Tower','paris-2':'Louvre','paris-3':'Petite Ceinture','paris-4':'Passage des Panoramas','rome-1':'Colosseum','rome-2':'Trevi Fountain','rome-3':'Quartiere Coppedè','rome-4':'Appian Way','cebu-1':'Kawasan Falls','cebu-2':'Basilica del Santo Niño','bangkok-1':'Wat Arun','bangkok-2':'Grand Palace','interlaken-1':'Harderkulm','interlaken-2':'Lake Brienz','interlaken-3':'Iseltwald'};
for(const p of originals)identities[p.id]={...identities[p.id],wikipediaTitle:aliases[p.id]||p.name};
writeFileSync('shared/photo-identities.json',JSON.stringify(identities));
const cached=async<T>(host:Parameters<typeof wikiRequest>[0],params:Record<string,string>):Promise<T>=>{const file=`data/sources/photos/${createHash('sha256').update(host+JSON.stringify(params)).digest('hex')}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));const result=await wikiRequest<T>(host,params);writeFileSync(file,JSON.stringify(result));return result;};
const filenameByPlace=new Map<string,{file:string;match:string}>();
const chunks=<T,>(list:T[],size:number)=>Array.from({length:Math.ceil(list.length/size)},(_,i)=>list.slice(i*size,(i+1)*size));
const ids=[...new Set(Object.values(identities).map(i=>i.wikidataId).filter((id):id is string=>Boolean(id)))];
console.log(`Looking up ${ids.length} linked Wikidata entities for ${all.length} places.`);
for(const batch of chunks(ids,40)){
 try{const data=await cached<{entities:Record<string,{claims?:Record<string,{mainsnak:{datavalue?:{value:unknown}}}[]>}>}>('www.wikidata.org',{action:'wbgetentities',ids:batch.join('|'),props:'claims'});
 for(const p of all){const identity=identities[p.id];if(!identity?.wikidataId||manifest[p.id])continue;const entity=data.entities[identity.wikidataId];if(!entity)continue;const file=entity.claims?.P18?.[0]?.mainsnak.datavalue?.value;const coordinate=entity.claims?.P625?.[0]?.mainsnak.datavalue?.value as {latitude:number;longitude:number}|undefined;if(typeof file==='string'&&(!coordinate||isNearby(p,[{lat:coordinate.latitude,lon:coordinate.longitude}],10)))filenameByPlace.set(p.id,{file,match:'Wikidata identity linked by the destination guide'});}
 }catch(error){console.log(`Wikidata import paused: ${(error as Error).message}`);break;}
 console.log(`Linked photos found: ${filenameByPlace.size}`);
}
const byTitle=new Map<string,Place[]>();for(const p of all){if(manifest[p.id]||filenameByPlace.has(p.id))continue;const title=identities[p.id]?.wikipediaTitle||p.name;const group=byTitle.get(title)||[];group.push(p);byTitle.set(title,group);}
for(const titles of chunks([...byTitle.keys()],35)){
 try{const data=await cached<{query?:{pages:WikipediaPage[];normalized?:{from:string;to:string}[];redirects?:{from:string;to:string}[]}}>('en.wikipedia.org',{action:'query',titles:titles.join('|'),redirects:'1',prop:'pageimages|coordinates',piprop:'name',pilicense:'free',colimit:'max'});
 const aliases=new Map([...(data.query?.normalized||[]),...(data.query?.redirects||[])].map(x=>[x.from,x.to]));
 for(const title of titles){let canonical=title;for(let i=0;i<5&&aliases.has(canonical);i++)canonical=aliases.get(canonical)!;const page=data.query?.pages.find(p=>p.title===canonical);if(!page?.pageimage)continue;for(const p of byTitle.get(title)||[]){const linked=Boolean(identities[p.id]?.wikipediaTitle);if((linked&&!page.coordinates?.length)||isNearby(p,page.coordinates,linked?10:3))filenameByPlace.set(p.id,{file:page.pageimage,match:linked?'Linked Wikipedia article':'Exact article title with matching location'});}}
 }catch(error){console.log(`Wikipedia import paused: ${(error as Error).message}`);break;}
 console.log(`Place articles checked: ${titles.at(-1)} · ${filenameByPlace.size} photo candidates`);
}
const files=[...new Set([...filenameByPlace.values()].map(v=>v.file))];const photoInfo=new Map<string,ReturnType<typeof commonsPhoto>>();
for(const batch of chunks(files,30)){
 try{const data=await cached<{query?:{pages:CommonsImage[];normalized?:{from:string;to:string}[]}}>('commons.wikimedia.org',{action:'query',titles:batch.map(f=>`File:${f}`).join('|'),prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'640',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories'});for(const page of data.query?.pages||[])photoInfo.set(normalName(page.title.replace(/^File:/,'')),commonsPhoto(page,''));}catch(error){console.log(`Photo metadata skipped: ${(error as Error).message}`);}
}
let downloaded=0;const downloads=new Map<string,Promise<string|null>>();
async function savePhoto(remoteUrl:string){
 if(downloads.has(remoteUrl))return downloads.get(remoteUrl)!;
 const promise=(async()=>{const hash=createHash('sha256').update(remoteUrl).digest('hex').slice(0,24),file=`public/images/places/${hash}.jpg`;if(existsSync(file))return `/images/places/${hash}.jpg`;try{const res=await fetch(remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed destination thumbnails)'},signal:AbortSignal.timeout(12000)});if(!res.ok||!res.headers.get('content-type')?.startsWith('image/'))return null;const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length<1500||bytes.length>3000000)return null;writeFileSync(file,bytes);return `/images/places/${hash}.jpg`;}catch{return null;}})();downloads.set(remoteUrl,promise);return promise;
}
const candidates=[...filenameByPlace.entries()];let cursor=0;
async function worker(){while(cursor<candidates.length){const [id,candidate]=candidates[cursor++];const photo=photoInfo.get(normalName(candidate.file));if(!photo)continue;const url=await savePhoto(photo.remoteUrl);if(!url)continue;const {remoteUrl,...credit}=photo;manifest[id]={...credit,url,match:candidate.match};downloaded++;if(downloaded%50===0){writeFileSync('shared/place-images.json',JSON.stringify(manifest));console.log(`Saved ${downloaded} place photos.`);}}}
await Promise.all([worker(),worker()]);writeFileSync('shared/place-images.json',JSON.stringify(manifest));
writeFileSync('data/sources/photos/last-import.json',JSON.stringify({places:all.length,identities:Object.keys(identities).length,candidates:filenameByPlace.size,photos:Object.keys(manifest).length,checkedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({photos:Object.keys(manifest).length,downloaded,checked:all.length}));
