import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {places} from '../server/catalog.js';
import {wikiRequest,commonsPhoto,isNearby,normalName,plain,creatorPublicDomainCandidate,isExcludedPhotoTitle,nonPhotographicMetadata,archivalPhotoMetadata,syntheticPhotoMetadata,type CommonsImage} from '../server/photo-search.js';
import {recoveryRejection} from '../server/photo-recovery-policy.js';
import type {Place} from '../shared/types.js';
const root='research/rights/full-photo-recovery';mkdirSync(root+'/category-requests',{recursive:true});
const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
const removed=new Set(read('research/rights/remediation.json').removedRecords.map((r:any)=>r.id));
const decisions=read(root+'/visual-decisions.json');
const targets=places.filter(p=>(!p.photo&&removed.has(p.id))||(decisions[p.id]&&(typeof decisions[p.id]==='string'||decisions[p.id].sourceUrl===p.photo?.sourceUrl)));
const categories=new Map<string,{place:Place;linked:boolean;evidence:string}[]>();
function add(category:string,place:Place,linked:boolean,evidence:string){const key=category.replace(/^Category:/,'');const group=categories.get(key)||[],old=group.find(r=>r.place.id===place.id);if(!old)group.push({place,linked,evidence});else if(linked){old.linked=true;old.evidence=evidence;}categories.set(key,group);}
const entities=new Map<string,{data:any;evidence:string}>();
for(const folder of ['data/sources/world-expansion/photos','data/sources/world-expansion/coordinates'])if(existsSync(folder))for(const f of readdirSync(folder).filter(f=>f.endsWith('.json'))){const evidence=folder+'/'+f,data=read(evidence);for(const [id,entity] of Object.entries(data.entities||{}))entities.set(id,{data:entity,evidence});}
for(const p of targets){const entity=p.photoIdentity?.wikidataId?entities.get(p.photoIdentity.wikidataId):undefined,claims=entity?.data.claims,category=claims?.P373?.[0]?.mainsnak?.datavalue?.value,point=claims?.P625?.[0]?.mainsnak?.datavalue?.value;
 if(typeof category==='string'&&point&&isNearby(p,[{lat:point.latitude,lon:point.longitude}],3))add(category,p,true,entity!.evidence);
 add(p.name,p,false,p.source?.url||p.id);add(p.name+' ('+p.city+')',p,false,p.source?.url||p.id);
}
async function cached<T>(params:Record<string,string>){const evidence=root+'/category-requests/'+createHash('sha256').update(JSON.stringify(params)).digest('hex')+'.json';if(existsSync(evidence))return {data:read(evidence).data as T,evidence};const data=await wikiRequest<T>('commons.wikimedia.org',params);writeFileSync(evidence,JSON.stringify({retrievedAt:new Date().toISOString(),params,data}));return {data,evidence};}
const existing=new Set<string>(),names=[...categories.keys()];
for(let offset=0;offset<names.length;offset+=30){const group=names.slice(offset,offset+30).filter(n=>!/[|\x00-\x1f]/.test(n)),{data}=await cached<{query?:{pages:{title:string;missing?:boolean;categoryinfo?:{files:number}}[];normalized?:{from:string;to:string}[]}} >({action:'query',titles:group.map(n=>'Category:'+n).join('|'),prop:'categoryinfo'});for(const alias of data.query?.normalized||[]){const source=categories.get(alias.from.replace(/^Category:/,''))||[];for(const row of source)add(alias.to,row.place,row.linked,row.evidence);}for(const page of data.query?.pages||[])if(page.categoryinfo?.files&&!page.missing)existing.add(page.title.replace(/^Category:/,''));}
const candidates:Record<string,any>={};let checked=0;
for(const name of existing){const assignments=categories.get(name)||[];if(!assignments.length)continue;
 const {data,evidence}=await cached<{query?:{pages:CommonsImage[]}}>({action:'query',generator:'categorymembers',gcmtitle:'Category:'+name,gcmtype:'file',gcmlimit:'40',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'800'});
 for(const {place:p,linked,evidence:identity} of assignments){
  const pname=normalName(p.name).replace(/^the /,''),city=normalName(p.city),subject=normalName(name).replace(/\s+\([^)]*\)$/,'');
  let best:{file:string;score:number}|undefined;
  for(const page of data.query?.pages||[]){if(decisions[p.id]?.sourceUrl===page.imageinfo?.[0].descriptionurl)continue;const photo=commonsPhoto(page,'Category research'),info=page.imageinfo?.[0],meta=info?.extmetadata||{};
   const needsReleaseCheck=!photo&&Boolean(info&&['image/jpeg','image/png','image/webp'].includes(info.mime)&&info.width>=200&&info.height>=130&&creatorPublicDomainCandidate(meta)&&!meta.LicenseUrl?.value&&!plain(meta.Restrictions?.value||'')&&!isExcludedPhotoTitle(page.title)&&!nonPhotographicMetadata(meta)&&!archivalPhotoMetadata(meta)&&!syntheticPhotoMetadata(meta,page.title));
   if((!photo&&!needsReleaseCheck)||recoveryRejection(p,page))continue;const title=normalName(page.title.replace(/^File:/,'')),description=normalName(plain(meta.ImageDescription?.value||'')),text=title+' '+description;
   const named=title.includes(pname)||title.includes(subject)||description.includes(pname);
   const gps=meta.GPSLatitude?.value&&meta.GPSLongitude?.value?[{lat:Number(meta.GPSLatitude.value),lon:Number(meta.GPSLongitude.value)}]:undefined;
   if(!named||(!linked&&!isNearby(p,gps,2)&&!text.includes(city)))continue;
   if(/\b(poster|mascot|closeup|close up|headshot|painting|portrait|shuttle bus)\b/.test(text))continue;
   if(/museum|palace/i.test(p.name)&&/\b(sculptures?|statues?|paintings?|exhibits?)\b/i.test(plain(meta.Categories?.value||'')+' '+page.title))continue;
   let score=(photo?100:0)+(title.includes(pname)?5:0)+(linked?3:0)+(isNearby(p,gps,2)?4:0)+(/exterior|entrance|facade|front|courtyard|overview|aerial|panorama/i.test(page.title)?4:0);
   if(info!.width>info!.height)score+=2;
   if(!best||score>best.score)best={file:page.title.replace(/^File:/,''),score};
  }
  if(best&&(!candidates[p.id]||best.score>candidates[p.id].score))candidates[p.id]={...best,match:'Named-site Commons category photograph with location/subject checks',identityEvidence:evidence,placeIdentityEvidence:identity,category:name};
 }
 checked++;writeFileSync(root+'/category-candidates.json',JSON.stringify(candidates));writeFileSync(root+'/category-progress.json',JSON.stringify({targets:targets.length,categories:existing.size,checked,candidates:Object.keys(candidates).length,complete:checked===existing.size}));console.log(JSON.stringify({checked,categories:existing.size,candidates:Object.keys(candidates).length}));
}
