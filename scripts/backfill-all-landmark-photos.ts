import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,appendFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {places} from '../server/catalog.js';
import {wikiRequest,commonsPhoto,isNearby,normalName,isExcludedPhotoTitle,plain,type CommonsImage,type WikipediaPage} from '../server/photo-search.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {recoveryRejection} from '../server/photo-recovery-policy.js';
const root='research/rights/full-photo-recovery';mkdirSync(root,{recursive:true});mkdirSync(root+'/requests',{recursive:true});
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const manifest:Record<string,PlaceImage>=read('shared/place-images.json'),verified=read('research/rights/verified-photo-sources.json'),ledger=read('research/rights/asset-evidence.json');
const sourceFiles=new Map<string,{url:string;sha256:string}>();for(const [url,entry] of Object.entries(ledger) as [string,any][])if(/^\/images\/places\/[a-f0-9]{24}\.jpg$/.test(url)&&existsSync('public'+url))sourceFiles.set(entry.sourceUrl,{url,sha256:entry.sha256});
const categoryOnly=process.argv.includes('--category-only'),decisions=existsSync(root+'/visual-decisions.json')?read(root+'/visual-decisions.json'):{};
const flagged=(p:Place)=>Boolean(p.photo&&decisions[p.id]?.sourceUrl===p.photo.sourceUrl);
const initial=places.filter(p=>!p.photo||(categoryOnly&&flagged(p))),status=new Map<string,any>(),retryables=new Map<string,any>(),failedFiles=new Set<string>();
function remember(row:any){status.set(row.id,row);if(['download-error','download-deferred'].includes(row.status))retryables.set(row.id,row);if(['imported','visual-review-rejected'].includes(row.status))retryables.delete(row.id);if(row.file&&['source-not-reusable','archival-image-rejected','synthetic-image-rejected'].includes(row.status))failedFiles.add(normalName(row.file));}
const journal=root+'/outcomes.jsonl';if(existsSync(journal))for(const line of readFileSync(journal,'utf8').split('\n').filter(Boolean))remember(JSON.parse(line));
const outcome=(p:Place,state:string,extra:Record<string,unknown>={})=>{const row={id:p.id,name:p.name,country:p.country,city:p.city,status:state,...extra};remember(row);appendFileSync(journal,JSON.stringify(row)+'\n');};
const requested=new Set(process.argv.slice(2).filter(a=>!a.startsWith('--')));
const knowledgeOnly=process.argv.includes('--knowledge-only');
const retryOnly=process.argv.includes('--retry-downloads');
const pdOnly=process.argv.includes('--pd-only');
const knowledgeCandidates=existsSync(root+'/knowledge-candidates.json')?read(root+'/knowledge-candidates.json'):{};
const categoryCandidates=existsSync(root+'/category-candidates.json')?read(root+'/category-candidates.json'):{};
const pdCandidates=existsSync(root+'/pd-candidates.json')?read(root+'/pd-candidates.json'):{};
const targets=initial.filter(p=>!requested.size||requested.has(p.id));
if(!existsSync(root+'/inventory.json'))writeFileSync(root+'/inventory.json',JSON.stringify({createdAt:new Date().toISOString(),totalCatalog:places.length,missing:initial.length,places:initial.map(({id,name,country,city,category,lat,lng,photoIdentity})=>({id,name,country,city,category,lat,lng,photoIdentity}))}));
async function save(file:string,data:unknown){const tmp=file+'.recovery.tmp';writeFileSync(tmp,JSON.stringify(data));for(let i=0;;i++){try{renameSync(tmp,file);return;}catch(e){if(i===20)throw e;await new Promise(r=>setTimeout(r,200));}}}
let assignments=0,processed=0,savedAssignments=0;
const imageBackoffFile=root+'/image-source-backoff.json';
let imageBlockedUntil=existsSync(imageBackoffFile)?Date.parse(read(imageBackoffFile).blockedUntil)||0:0,lastImageRequest=0;
async function download(url:string){
 for(let attempt=0;attempt<3;attempt++){
  if(Date.now()<imageBlockedUntil)throw new Error('IMAGE_SOURCE_BACKOFF');
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,4000-(Date.now()-lastImageRequest))));lastImageRequest=Date.now();
  const response=await fetch(url,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed landmark photo recovery)'},signal:AbortSignal.timeout(25000)});
  if(response.status!==429&&response.status!==503)return response;
  const header=response.headers.get('retry-after')||'',seconds=Number(header),delay=Math.max(5000,seconds>0?seconds*1000:Date.parse(header)-Date.now()||60000);
  imageBlockedUntil=Math.max(imageBlockedUntil,Date.now()+delay);writeFileSync(imageBackoffFile,JSON.stringify({blockedUntil:new Date(imageBlockedUntil).toISOString(),status:response.status}));await response.body?.cancel();console.log(JSON.stringify({phase:'image-backoff',status:response.status,retryAfterSeconds:Math.ceil(delay/1000)}));throw new Error('IMAGE_SOURCE_BACKOFF');
 }
 throw new Error('Image download unavailable');
}
async function persist(){if(assignments!==savedAssignments){await save('research/rights/verified-photo-sources.json',verified);await save('research/rights/asset-evidence.json',ledger);await save('shared/place-images.json',manifest);savedAssignments=assignments;}const counts:Record<string,number>={};for(const row of status.values())counts[row.status]=(counts[row.status]||0)+1;await save(root+'/progress.json',{updatedAt:new Date().toISOString(),initialMissing:initial.length,processed,assignments,counts,pending:targets.filter(p=>!status.has(p.id)&&!manifest[p.id]).length});}
async function request<T>(host:Parameters<typeof wikiRequest>[0],params:Record<string,string>):Promise<{data:T;evidence:string}>{const key=createHash('sha256').update(host+JSON.stringify(params)).digest('hex'),evidence=root+'/requests/'+key+'.json';if(existsSync(evidence))return {data:read(evidence).data,evidence};const data=await wikiRequest<T>(host,params,host==='en.wikipedia.org'?250:1200);writeFileSync(evidence,JSON.stringify({retrievedAt:new Date().toISOString(),host,params,data}));return {data,evidence};}
const candidates=new Map<string,{file:string;match:string;identityEvidence:string}>();
const pending=targets.filter(p=>(!manifest[p.id]||(categoryOnly&&flagged(p)))&&(pdOnly?Boolean(pdCandidates[p.id]):categoryOnly?Boolean(categoryCandidates[p.id]):retryOnly?retryables.has(p.id):knowledgeOnly?Boolean(knowledgeCandidates[p.id])&&status.get(p.id)?.status!=='visual-review-rejected':!['no-exact-article-photo','visual-review-rejected'].includes(status.get(p.id)?.status)));
if(knowledgeOnly||retryOnly||categoryOnly||pdOnly){for(const p of pending){const row=retryOnly?retryables.get(p.id):status.get(p.id);if(categoryOnly&&flagged(p))delete manifest[p.id];candidates.set(p.id,pdOnly?pdCandidates[p.id]:categoryOnly?categoryCandidates[p.id]:knowledgeOnly?knowledgeCandidates[p.id]:{file:row.file,match:'Previously matched place identity; source download retried',identityEvidence:row.identityEvidence||row.evidence||p.source?.url||p.id});}await importCandidates();await persist();console.log(JSON.stringify({complete:true,mode:pdOnly?'public-domain':categoryOnly?'category':knowledgeOnly?'knowledge':'retry',assignments}));process.exit(0);}
for(const p of pending)if(p.photoIdentity?.commonsFile&&!status.has(p.id))candidates.set(p.id,{file:p.photoIdentity.commonsFile,match:'Exact photograph linked in the place source',identityEvidence:p.source?.url||p.id});
type Entity={claims?:Record<string,{mainsnak:{datavalue?:{value:any}}}[]>};
await importCandidates();
const linked=pending.filter(p=>p.photoIdentity?.wikidataId&&!candidates.has(p.id));
const knownEntities=new Map<string,Entity>();
for(const folder of ['data/sources/world-expansion/photos','data/sources/world-expansion/coordinates'])if(existsSync(folder))for(const f of readdirSync(folder).filter(f=>f.endsWith('.json'))){const data=read(folder+'/'+f);for(const [id,entity] of Object.entries(data.entities||{}))knownEntities.set(id,entity as Entity);}
function entityCandidates(entities:Record<string,Entity>,evidence:string){
 for(const p of linked){
  if(manifest[p.id])continue;const entity=entities[p.photoIdentity!.wikidataId!];if(!entity)continue;
  const point=entity.claims?.P625?.[0]?.mainsnak.datavalue?.value;
  if(!point||!isNearby(p,[{lat:point.latitude,lon:point.longitude}],3))continue;
  const file=entity.claims?.P18?.map(c=>c.mainsnak.datavalue?.value).find(v=>typeof v==='string'&&!isExcludedPhotoTitle(v)&&status.get(p.id)?.file!==v);
  if(file)candidates.set(p.id,{file,match:'Exact Wikidata identity linked by the listing; coordinates checked',identityEvidence:evidence});
 }
}
entityCandidates(Object.fromEntries(knownEntities),'Retained source-linked Wikidata identity cache');
const qids=[...new Set(linked.map(p=>p.photoIdentity!.wikidataId!))].filter(id=>!knownEntities.has(id));
function batches<T>(items:T[],n=40):T[][]{const result:T[][]=[];for(let i=0;i<items.length;i+=n)result.push(items.slice(i,i+n));return result;}
for(const ids of process.argv.includes('--skip-entity-requests')?[]:batches(qids)){
 let result;try{result=await request<{entities:Record<string,Entity>}>('www.wikidata.org',{action:'wbgetentities',ids:ids.join('|'),props:'claims'});}catch(error){console.log(JSON.stringify({phase:'linked-identities',sourceUnavailable:String(error)}));break;}const {data,evidence}=result;
 for(const p of linked){const entity=data.entities[p.photoIdentity!.wikidataId!];if(!entity)continue;const point=entity.claims?.P625?.[0]?.mainsnak.datavalue?.value;
  if(!point||!isNearby(p,[{lat:point.latitude,lon:point.longitude}],3))continue;
  const files=entity.claims?.P18?.map(c=>c.mainsnak.datavalue?.value).filter(v=>typeof v==='string'&&!isExcludedPhotoTitle(v))||[];
  if(files.length)candidates.set(p.id,{file:files[0],match:'Exact Wikidata entity linked by the listing; coordinates checked',identityEvidence:evidence});
 }
 console.log(JSON.stringify({phase:'linked-identities',entities:ids.length,candidates:candidates.size}));
}
// Reuse old article discovery responses for identity research only. License
// approval is always performed against the retained Commons response below.
type Article=WikipediaPage&{images?:{title:string}[]};
const pages=new Map<string,Article>(),aliases=new Map<string,string>();
for(const folder of ['data/sources/world-expansion/photos','data/sources/world-expansion/coordinates'])if(existsSync(folder))for(const file of readdirSync(folder).filter(f=>f.endsWith('.json'))){const data=read(folder+'/'+file);for(const p of data.query?.pages||[])if(!p.title?.startsWith('File:'))pages.set(p.title,p);for(const a of [...(data.query?.normalized||[]),...(data.query?.redirects||[])])aliases.set(a.from,a.to);}
const canonical=(title:string)=>{for(let i=0;i<8&&aliases.has(title);i++)title=aliases.get(title)!;return title;};
const clean=(s:string)=>normalName(s.replace(/\s*\([^)]*\)\s*$/,''));
await importCandidates();
const byTitle=new Map<string,Place[]>();for(const p of pending){if(manifest[p.id])continue;const title=p.photoIdentity?.wikipediaTitle||p.name;if(/[|\x00-\x1f]/.test(title)){outcome(p,'no-exact-article-photo',{reason:'Listing name is not a valid MediaWiki article title; requires another identity source'});continue;}const group=byTitle.get(title)||[];group.push(p);byTitle.set(title,group);}
function articleFile(page:Article,title:string){const usable=(file:string)=>!isExcludedPhotoTitle(file)&&!failedFiles.has(normalName(file));if(page.pageimage&&usable(page.pageimage))return page.pageimage;const name=clean(title);return name.length>=8?page.images?.map(i=>i.title.replace(/^File:/,'')).find(f=>/\.(jpg|jpeg|png|webp)$/i.test(f)&&usable(f)&&clean(f).includes(name)):undefined;}
function consider(title:string,evidence:string){const page=pages.get(canonical(title));for(const p of byTitle.get(title)||[]){const file=page&&articleFile(page,title);if(file&&!page?.missing&&isNearby(p,page?.coordinates,3)&&(p.photoIdentity?.wikipediaTitle||clean(title)===clean(page!.title)))candidates.set(p.id,{file,match:'Named place article with matching location coordinates',identityEvidence:evidence});else outcome(p,'no-exact-article-photo',{identityEvidence:evidence});}}
// Import candidate files in groups, recording license and download evidence.
async function importCandidates(){
 const byFile=new Map<string,Place[]>();for(const p of pending){const c=candidates.get(p.id);if(!c||manifest[p.id])continue;const group=byFile.get(c.file)||[];group.push(p);byFile.set(c.file,group);}
 for(const files of batches([...byFile.keys()],30)){
  const withRevision=pdOnly||retryOnly||categoryOnly;
  const {data,evidence}=await request<{query?:{pages:CommonsImage[];normalized?:{from:string;to:string}[];redirects?:{from:string;to:string}[]}}>('commons.wikimedia.org',{action:'query',titles:files.map(f=>'File:'+f).join('|'),redirects:'1',prop:withRevision?'imageinfo|revisions':'imageinfo',...(withRevision?{rvprop:'ids|timestamp|content',rvslots:'main'}:{}),iiprop:'url|mime|size|extmetadata',iiurlwidth:'800'});
  const photoPages=new Map((data.query?.pages||[]).map(p=>[normalName(p.title.replace(/^File:/,'')),p]));const names=new Map([...(data.query?.normalized||[]),...(data.query?.redirects||[])].map(a=>[normalName(a.from.replace(/^File:/,'')),normalName(a.to.replace(/^File:/,''))]));
  for(const file of files){let name=normalName(file);for(let i=0;i<8&&names.has(name);i++)name=names.get(name)!;const page=photoPages.get(name),photo=page&&commonsPhoto(page,'Verified place identity');const group=byFile.get(file)!;
   if(!photo){for(const p of group)outcome(p,'source-not-reusable',{file,evidence});continue;}
   const meta=page?.imageinfo?.[0].extmetadata||{},description=plain(meta.ImageDescription?.value||'');
   const gps=meta.GPSLatitude?.value&&meta.GPSLongitude?.value?{lat:Number(meta.GPSLatitude.value),lon:Number(meta.GPSLongitude.value)}:undefined;
   const matched=group.filter(p=>!recoveryRejection(p,page!));
   for(const p of group)if(!matched.includes(p))outcome(p,recoveryRejection(p,page!)!,{file,evidence});
   if(!matched.length)continue;
   if(/historical (?:images|photographs)|black.and.white|postcards|\b(?:18\d\ds|19[0-8]\ds)\b/i.test(plain(meta.Categories?.value||''))||/\b(?:date|dato|datum|circa|ca)\s*[:/.]?\s*(?:ca\s*)?(?:18\d{2}|19[0-8]\d)\b/i.test(description)){for(const p of group)outcome(p,'archival-image-rejected',{file,evidence});continue;}
   const {remoteUrl,...credit}=photo;const prior=verified[photo.sourceUrl]?.photo;
   if(prior&&!['title','author','license','licenseUrl','notices'].every(k=>JSON.stringify(prior[k])===JSON.stringify((credit as any)[k]))){for(const p of group)outcome(p,'source-metadata-changed',{file,evidence});continue;}
   try{
    const existing=sourceFiles.get(photo.sourceUrl);let bytes:Buffer;
    if(existing){bytes=readFileSync('public'+existing.url);if(createHash('sha256').update(bytes).digest('hex')!==existing.sha256)throw new Error('Existing licensed asset bytes changed; review required');}
    else{const response=await download(remoteUrl);if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Image HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1500||bytes.length>5000000)throw new Error('Unexpected image size');}
    const sha256=createHash('sha256').update(bytes).digest('hex'),url=existing?.url||'/images/places/'+sha256.slice(0,24)+'.jpg';
    if(existsSync('public'+url)&&createHash('sha256').update(readFileSync('public'+url)).digest('hex')!==sha256)throw new Error('Asset collision');
    if(!existing){writeFileSync('public'+url,bytes);ledger[url]={sha256,sourceUrl:photo.sourceUrl,evidence,downloadUrl:remoteUrl,retrievedAt:new Date().toISOString(),basis:'Direct Commons download; explicit linked place identity or matching article name and coordinates'};sourceFiles.set(photo.sourceUrl,{url,sha256});}if(!verified[photo.sourceUrl]?.photo)verified[photo.sourceUrl]={photo:credit,evidence};
    for(const p of matched){if(/\bcent(?:er|re)\b/i.test(p.name)&&!normalName(description+' '+file).includes(normalName(p.name))){outcome(p,'identity-review-needed',{file,evidence});continue;}const c=candidates.get(p.id)!;manifest[p.id]={...credit,match:c.match,url};outcome(p,'imported',{photo:manifest[p.id],identityEvidence:c.identityEvidence,licenseEvidence:evidence});assignments++;}
   }catch(error){for(const p of group)outcome(p,String(error).includes('IMAGE_SOURCE_BACKOFF')?'download-deferred':'download-error',{file,error:String(error),identityEvidence:candidates.get(p.id)?.identityEvidence,evidence,retryAfter:new Date(imageBlockedUntil).toISOString()});}
  }
  processed+=files.length;await persist();console.log(JSON.stringify({phase:'import',files:processed,assignments}));
 }
 candidates.clear();
}
await importCandidates();
const unknown:string[]=[];for(const title of byTitle.keys()){const page=pages.get(canonical(title));if(page&&(page.missing||articleFile(page,title)||page.images))consider(title,'Existing retained article discovery response');else unknown.push(title);}
await importCandidates();
let articles=0;
// Keep requests below MediaWiki's URL limit even for long place names.
const groups:string[][]=[];for(const title of unknown){const last=groups.at(-1);if(!last||last.length>=50||encodeURIComponent([...last,title].join('|')).length>5000)groups.push([title]);else last.push(title);}
for(const titles of groups){
 const {data,evidence}=await request<{query?:{pages:Article[];normalized?:{from:string;to:string}[];redirects?:{from:string;to:string}[]}}>('en.wikipedia.org',{action:'query',titles:titles.join('|'),redirects:'1',prop:'pageimages|coordinates|images',piprop:'name',pilicense:'free',colimit:'max',imlimit:'max'});
 for(const p of data.query?.pages||[])pages.set(p.title,p);for(const a of [...(data.query?.normalized||[]),...(data.query?.redirects||[])])aliases.set(a.from,a.to);
 for(const title of titles)consider(title,evidence);articles+=titles.length;
 if(candidates.size>=30)await importCandidates();
 await persist();console.log(JSON.stringify({phase:'articles',checked:articles,total:unknown.length,assignments}));
}
await importCandidates();await persist();console.log(JSON.stringify({complete:true,assignments,inventory:root+'/inventory.json',progress:root+'/progress.json'}));
