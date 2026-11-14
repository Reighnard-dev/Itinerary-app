import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {places} from '../server/catalog.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {commonsPhoto,isNearby,normalName,wikiRequest,type CommonsImage,type WikipediaPage} from '../server/photo-search.js';
const dir='data/sources/world-expansion/photos';mkdirSync(dir,{recursive:true});mkdirSync('public/images/places',{recursive:true});
const manifest:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const requestedCountries=new Set(process.argv.slice(2).filter(arg=>!arg.startsWith('--')));
const inScope=(p:Place)=>!requestedCountries.size||requestedCountries.has(p.country);
const selected=places.filter(p=>inScope(p)&&(!process.argv.includes('--direct-only')||p.photoIdentity?.commonsFile)&&!p.photo&&(p.id.startsWith('geo-')||p.photoIdentity||p.id.startsWith('osm-')||(requestedCountries.size>0&&p.id.startsWith('overture-')&&!['Restaurants','Food & drink','Shopping'].includes(p.category))));
const candidates:Record<string,{file:string;match:string}>=existsSync(`${dir}/candidates.json`)?JSON.parse(readFileSync(`${dir}/candidates.json`,'utf8')):{};
type Entity={claims?:Record<string,{mainsnak:{datavalue?:{value:unknown}}}[]>};
const knownEntities=new Map<string,Entity>(),knownPages=new Map<string,WikipediaPage>(),knownAliases=new Map<string,string>();
for(const folder of [dir,'data/sources/world-expansion/coordinates'])if(existsSync(folder))for(const file of readdirSync(folder)){
 if(!/\.json$/.test(file)||file==='candidates.json')continue;
 const data=JSON.parse(readFileSync(`${folder}/${file}`,'utf8'));
 for(const [id,entity] of Object.entries(data.entities||{}))knownEntities.set(id,entity as Entity);
 for(const page of data.query?.pages||[])if(!page.title?.startsWith('File:'))knownPages.set(page.title,page);
 for(const alias of [...(data.query?.normalized||[]),...(data.query?.redirects||[])])if(!alias.from.startsWith('File:'))knownAliases.set(alias.from,alias.to);
}
async function cached<T>(host:Parameters<typeof wikiRequest>[0],params:Record<string,string>):Promise<T>{const file=`${dir}/${createHash('sha256').update(host+JSON.stringify(params)).digest('hex')}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));const data=await wikiRequest<T>(host,params);writeFileSync(file,JSON.stringify(data));return data;}
function chunks<T>(values:T[],size:number){return Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,(i+1)*size));}
const persist=()=>writeFileSync(`${dir}/candidates.json`,JSON.stringify(candidates));
for(const p of selected)if(p.photoIdentity?.commonsFile)candidates[p.id]={file:p.photoIdentity.commonsFile,match:'Photograph explicitly linked by the place listing'};
const linked=selected.filter(p=>p.photoIdentity?.wikidataId&&!candidates[p.id]);const qids=[...new Set(linked.map(p=>p.photoIdentity!.wikidataId!))].filter(id=>!knownEntities.has(id));
for(const [index,batch] of chunks(qids,45).entries()){
 try{
  const data=await cached<{entities:Record<string,{claims?:Record<string,{mainsnak:{datavalue?:{value:unknown}}}[]>}>}>('www.wikidata.org',{action:'wbgetentities',ids:batch.join('|'),props:'claims'});
  for(const [id,entity] of Object.entries(data.entities))knownEntities.set(id,entity);
  for(const p of linked){const entity=data.entities[p.photoIdentity!.wikidataId!];if(!entity)continue;const file=entity.claims?.P18?.[0]?.mainsnak.datavalue?.value;const coord=entity.claims?.P625?.[0]?.mainsnak.datavalue?.value as {latitude:number;longitude:number}|undefined;
   if(typeof file==='string'&&(!coord||isNearby(p,[{lat:coord.latitude,lon:coord.longitude}],3)))candidates[p.id]={file,match:'Exact Wikidata identity linked by the source listing'};
  }
  persist();if(index%10===0)console.log(`Linked entities ${Math.min((index+1)*45,qids.length)}/${qids.length}; ${Object.keys(candidates).length} candidates`);
 }catch(error){console.log(`Entity batch failed: ${(error as Error).message}`);}
}
for(const p of linked){const entity=knownEntities.get(p.photoIdentity!.wikidataId!),file=entity?.claims?.P18?.[0]?.mainsnak.datavalue?.value,coord=entity?.claims?.P625?.[0]?.mainsnak.datavalue?.value as {latitude:number;longitude:number}|undefined;if(typeof file==='string'&&(!coord||isNearby(p,[{lat:coord.latitude,lon:coord.longitude}],3)))candidates[p.id]={file,match:'Exact Wikidata identity linked by the source listing'};}
const byTitle=new Map<string,Place[]>();
for(const p of selected){if(candidates[p.id])continue;const title=p.photoIdentity?.wikipediaTitle||p.name;const group=byTitle.get(title)||[];group.push(p);byTitle.set(title,group);}
function canonicalTitle(title:string){for(let i=0;i<5&&knownAliases.has(title);i++)title=knownAliases.get(title)!;return title;}
const titleBatches=chunks([...byTitle.keys()].filter(title=>!knownPages.has(canonicalTitle(title))),40);
for(const [index,batch] of titleBatches.entries()){
 try{
  const data=await cached<{query?:{pages:WikipediaPage[];normalized?:{from:string;to:string}[];redirects?:{from:string;to:string}[]}}>('en.wikipedia.org',{action:'query',titles:batch.join('|'),redirects:'1',prop:'pageimages|coordinates',piprop:'name',pilicense:'free',colimit:'max'});
  const aliases=new Map([...(data.query?.normalized||[]),...(data.query?.redirects||[])].map(a=>[a.from,a.to]));
  for(const [from,to] of aliases)knownAliases.set(from,to);for(const page of data.query?.pages||[])knownPages.set(page.title,page);
  for(const title of batch){let canonical=title;for(let i=0;i<5&&aliases.has(canonical);i++)canonical=aliases.get(canonical)!;const page=data.query?.pages.find(p=>p.title===canonical);if(!page?.pageimage)continue;
   for(const p of byTitle.get(title)||[])if(isNearby(p,page.coordinates,3))candidates[p.id]={file:page.pageimage,match:p.photoIdentity?.wikipediaTitle?'Linked Wikipedia article with matching coordinates':'Exact article title with matching coordinates'};
  }
  persist();if(index%10===0)console.log(`Article batches ${index+1}/${titleBatches.length}; ${Object.keys(candidates).length} candidates`);
 }catch(error){console.log(`Article batch failed: ${(error as Error).message}`);}
}
for(const [title,group] of byTitle){const page=knownPages.get(canonicalTitle(title));if(!page?.pageimage)continue;for(const p of group)if(isNearby(p,page.coordinates,3))candidates[p.id]={file:page.pageimage,match:p.photoIdentity?.wikipediaTitle?'Linked Wikipedia article with matching coordinates':'Exact article title with matching coordinates'};}
persist();
// A geographic record can merge into an Overture record in the displayed
// catalog. Keep its researched photo candidate: catalog merging transfers that
// photo to the same named nearby venue.
const rawPhotoPlaces:Place[]=['researched-places.json','geographic-places.json','map-places.json','knowledge-places.json'].flatMap(file=>JSON.parse(readFileSync(`shared/${file}`,'utf8')));
const valid=new Map([...rawPhotoPlaces,...places].map(p=>[p.id,p]));
const byFile=new Map<string,string[]>();for(const [id,entry] of Object.entries(candidates)){if(manifest[id]||!valid.has(id)||!inScope(valid.get(id)!))continue;const group=byFile.get(entry.file)||[];group.push(id);byFile.set(entry.file,group);}
// Interleave countries so broad coverage appears before a long city's queue.
const countryFiles=new Map<string,string[]>();for(const file of byFile.keys()){const country=valid.get(byFile.get(file)![0])!.country;const bucket=countryFiles.get(country)||[];bucket.push(file);countryFiles.set(country,bucket);}
const files:string[]=[];for(let i=0;files.length<byFile.size;i++)for(const bucket of countryFiles.values())if(bucket[i])files.push(bucket[i]);
async function saveManifest(){const temporary='shared/place-images.importing.json';writeFileSync(temporary,JSON.stringify(manifest));for(let i=0;i<10;i++){try{renameSync(temporary,'shared/place-images.json');return;}catch(error){if(i===9)throw error;await new Promise(resolve=>setTimeout(resolve,200));}}}
let saved=0,checked=0,downloadErrors=0;const batches:string[][]=[];for(const file of files){const batch=batches.at(-1);if(!batch||batch.length>=40||new URLSearchParams({titles:[...batch,file].join('|')}).toString().length>5500)batches.push([file]);else batch.push(file);}
const outcomes:Record<string,{status:string;reason?:string}>=existsSync(`${dir}/download-outcomes.json`)?JSON.parse(readFileSync(`${dir}/download-outcomes.json`,'utf8')):{};
function progress(complete=false){writeFileSync(`${dir}/progress.json`,JSON.stringify({updatedAt:new Date().toISOString(),complete,checked,totalFiles:byFile.size,newPhotoAssignments:saved,downloadErrors,manifestEntries:Object.keys(manifest).length}));writeFileSync(`${dir}/download-outcomes.json`,JSON.stringify(outcomes));}
const active=new Set<Promise<void>>();
let blockedUntil=0;
async function schedule(work:()=>Promise<void>){while(active.size>=2)await Promise.race(active);const request=work().catch(error=>{downloadErrors++;console.log(`Photo download: ${(error as Error).message}`);}).finally(()=>active.delete(request));active.add(request);}
for(const batch of batches){
 try{
  const data=await cached<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:batch.map(f=>`File:${f}`).join('|'),prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories|ImageDescription|DateTimeOriginal|Restrictions|Attribution|Copyright'});
  const info=new Map((data.query?.pages||[]).map(page=>[normalName(page.title.replace(/^File:/,'')),commonsPhoto(page,'')]));
  const work=async(file:string)=>{
   const photo=info.get(normalName(file));if(!photo){outcomes[file]={status:'unacceptable_metadata'};return;}
   const basename=createHash('sha256').update(photo.remoteUrl).digest('hex').slice(0,24)+'.jpg',output=`public/images/places/${basename}`;
   if(!existsSync(output)){
    let response:Response|undefined;
    for(let attempt=0;attempt<3;attempt++){
     while(Date.now()<blockedUntil)await new Promise(resolve=>setTimeout(resolve,Math.min(30000,blockedUntil-Date.now())));
     response=await fetch(photo.remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (https://en.wikivoyage.org/wiki/Wikivoyage:Listings; attributed place thumbnails)'},signal:AbortSignal.timeout(20000)});
     if(response.status!==429&&response.status!==503)break;
     const backoff=Math.max(5000,(Number(response.headers.get('retry-after'))||5)*1000);blockedUntil=Math.max(blockedUntil,Date.now()+backoff);await response.body?.cancel();console.log(`Image source requested ${Math.round(backoff/1000)} seconds of backoff.`);
    }
    if(!response?.ok||!response.headers.get('content-type')?.startsWith('image/')){outcomes[file]={status:'download_error',reason:`HTTP ${response?.status}`};downloadErrors++;return;}
    const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1500||bytes.length>3000000)return;writeFileSync(output,bytes);
   }
   const {remoteUrl,...credit}=photo;
   for(const id of byFile.get(file)||[]){manifest[id]={...credit,title:credit.title.slice(0,500),license:credit.license.slice(0,100),url:`/images/places/${basename}`,match:candidates[id].match};saved++;}
   outcomes[file]={status:'saved'};
  };
  for(const file of batch)await schedule(()=>work(file).catch(error=>{outcomes[file]={status:'download_error',reason:(error as Error).message};throw error;}));
  await saveManifest();checked+=batch.length;
  progress();
  console.log(`Photo files ${checked}/${byFile.size}; added ${saved} place photos`);
 }catch(error){console.log(`Photo metadata batch failed: ${(error as Error).message}`);}
}
await Promise.all(active);await saveManifest();
progress(true);
console.log(JSON.stringify({added:saved,total:Object.keys(manifest).length,candidates:Object.keys(candidates).length}));
