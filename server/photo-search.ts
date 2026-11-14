import {load} from 'cheerio';
import type {Place,PlaceImage} from '../shared/types.js';
import {hasOpenPhotoLicense} from '../shared/photo-rights.js';
import {cityDistance} from './world.js';
import excludedPhotoFiles from '../shared/photo-exclusions.json' with {type:'json'};
export type PhotoIdentity=NonNullable<Place['photoIdentity']>;
export interface WikipediaPage {title:string;pageimage?:string;coordinates?:{lat:number;lon:number}[];missing?:boolean;index?:number}
export interface CommonsImage {title:string;revisions?:{revid:number;slots?:{main?:{content?:string}}}[];imageinfo?:{url:string;thumburl?:string;descriptionurl:string;mime:string;width:number;height:number;extmetadata?:Record<string,{value:string}>}[]}
export const normalName=(name:string)=>name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const excludedFiles=new Set(Object.keys(excludedPhotoFiles).map(normalName));
export function isExcludedPhotoTitle(title:string){return excludedFiles.has(normalName(title.replace(/^File:/,'')));}
export const plain=(html:string)=>load(`<span>${html}</span>`).text().replace(/\s+/g,' ').trim();
export function photoNotices(meta:Record<string,{value:string}>,sourceUrl:string){
 const notices=['Attribution','Copyright','Credit','UsageTerms'].map(k=>{const value=meta[k]?.value||'',doc=load(value),links=new Set<string>();doc('a[href]').each((_i,a)=>{try{const url=new URL(doc(a).attr('href')!,sourceUrl);if(['http:','https:'].includes(url.protocol))links.add(url.href);}catch{/* Omit malformed links, retain their text. */}});return [plain(value),...links].filter(Boolean).join(' — ');}).filter(Boolean);
 const creator=load(meta.Artist?.value||''),links=new Set<string>();creator('a[href]').each((_i,a)=>{try{const url=new URL(creator(a).attr('href')!,sourceUrl);if(['http:','https:'].includes(url.protocol))links.add(url.href);}catch{/* The creator's text is retained separately. */}});if(links.size)notices.push('Creator links: '+[...links].join(' ; '));return notices;
}
export function nonPhotographicMetadata(meta:Record<string,{value:string}>){
 const categories=plain(meta.Categories?.value||'').replaceAll('_',' ');
 const description=plain(meta.ImageDescription?.value||'');
 return categories.split('|').some(c=>/\b(paintings|drawings|portraits|postcards|maps (?:of|showing)|locator maps|logos|coats of arms|posters|lithographs|engravings|watercolou?rs|advertisements|floor plans)\b/i.test(c.trim()))||/\b(engraving|lithograph|woodcut|print by|illustration by|painting by|drawn by)\b/i.test(description);
}
export function archivalPhotoMetadata(meta:Record<string,{value:string}>){
 const original=plain(meta.DateTimeOriginal?.value||'');const year=Number(original.match(/^\D*(\d{4})\b/)?.[1]);
 const description=plain(meta.ImageDescription?.value||'');
 return Boolean(year&&year<1990)||/\b(?:taken in|photographed in|photo from|photograph from|circa|dated)\s+(?:18\d{2}|19[0-8]\d)\b/i.test(description)||/[,;]\s*(?:18\d{2}|19[0-8]\d)\s*(?:[.)]|$)/i.test(description);
}
export function syntheticPhotoMetadata(meta:Record<string,{value:string}>,title=''){
 return /\b(?:AI[- ]generated|artificial intelligence|stable diffusion|midjourney|DALL[·. _-]?E|computer[- ]generated|3D render|artist'?s rendering|digital illustration|virtual reconstruction|photomontage)\b/i.test(plain(meta.ImageDescription?.value||'')+' '+plain(meta.Categories?.value||'')+' '+title);
}
export function creatorPublicDomainCandidate(meta:Record<string,{value:string}>){
 const creator=plain(meta.Artist?.value||'');
 return plain(meta.LicenseShortName?.value||'')==='Public domain'&&meta.Copyrighted?.value.toLowerCase()==='false'&&/^own work\b/i.test(plain(meta.Credit?.value||''))&&Boolean(creator)&&!/\bunknown\b|\bunidentified\b|\banonymous\b|wikimedia commons contributors/i.test(creator);
}
export function isNearby(place:Pick<Place,'lat'|'lng'>,coordinates:{lat:number;lon:number}[]|undefined,maxKm=3){return Boolean(coordinates?.some(c=>cityDistance(place,{lat:c.lat,lng:c.lon})<=maxKm));}
export function identityFromListing(html:string):PhotoIdentity{
 const doc=load(html);let wikidataId:string|undefined,wikipediaTitle:string|undefined;
 const q=doc('a[href*="wikidata.org/wiki/Q"]').first().attr('href')?.match(/\/wiki\/(Q\d+)/);if(q)wikidataId=q[1];
 const wiki=doc('.listing-sister-wikipedia a[href]').first().attr('href');if(wiki?.startsWith('https://en.wikipedia.org/wiki/')){try{wikipediaTitle=decodeURIComponent(wiki.split('/wiki/')[1]).replaceAll('_',' ');}catch{/* Ignore malformed source links. */}}
 return {...(wikidataId?{wikidataId}:{}),...(wikipediaTitle?{wikipediaTitle}:{})};
}
const sourceHosts=new Set(['commons.wikimedia.org','en.wikipedia.org']);
export function commonsPhoto(page:CommonsImage,match:string):Omit<PlaceImage,'url'>&{remoteUrl:string}|null{
 const info=page.imageinfo?.[0];if(!info||!['image/jpeg','image/png','image/webp'].includes(info.mime)||info.width<200||info.height<130)return null;
 if(excludedFiles.has(normalName(page.title.replace(/^File:/,''))))return null;
 if(/\b(logo|locator|map|flag|coat of arms|diagram|floorplan|icon|signature|portrait|headshot)\b/i.test(page.title))return null;
 const meta=info.extmetadata||{};if(nonPhotographicMetadata(meta)||archivalPhotoMetadata(meta)||syntheticPhotoMetadata(meta,page.title)||plain(meta.Restrictions?.value||''))return null;const license=plain(meta.LicenseShortName?.value||'');let licenseUrl=meta.LicenseUrl?.value||'';
 // A public-domain dedication is a release, not a CC license. Some Commons
 // self-releases omit LicenseUrl; bind these to the actual release declaration.
 const revision=page.revisions?.[0],wikitext=(revision?.slots?.main?.content||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(nowiki|pre|syntaxhighlight)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const pdSelf=Boolean(revision?.revid&&/\{\{\s*PD-self\s*(?:\||\}\})/i.test(wikitext));
 const declaredRelease=plain(meta.Permission?.value||''),release=declaredRelease||(pdSelf?'Creator PD-self dedication on the source file (source revision retained in the rights evidence)':'');
 if(/NoFoP(?:[-_\s]|\b)/i.test((meta.Permission?.value||'')+' '+(meta.Categories?.value||''))||/\{\{\s*(?:copyvio|delete|speedydelete|no permission since|no license since|NoFoP[^|}\n]*)\s*(?:\||\}\})/i.test(wikitext))return null;
 const explicitSelfRelease=creatorPublicDomainCandidate(meta)&&(pdSelf||/all rights released/i.test(release)||/\b(?:I|copyright holder)\b.*\brelease\b.*\bpublic domain\b/i.test(release));
 if(!licenseUrl&&explicitSelfRelease){const declaration=new URL(info.descriptionurl);declaration.hash='Licensing';licenseUrl=declaration.href;}
 if(!hasOpenPhotoLicense({title:page.title,sourceUrl:info.descriptionurl,author:plain(meta.Artist?.value||meta.Credit?.value||''),license,licenseUrl}))return null;
 if(/non-free|fair use|copyrighted/i.test(meta.UsageTerms?.value||''))return null;
 try{if(!sourceHosts.has(new URL(info.descriptionurl).hostname))return null;const imageUrl=new URL(info.thumburl||info.url);if(!['upload.wikimedia.org','thumb.wikimedia.org'].includes(imageUrl.hostname))return null;}catch{return null;}
 const author=plain(meta.Artist?.value||meta.Credit?.value||'');if(author.length>300)return null;
 return {title:page.title.replace(/^File:/,''),sourceUrl:info.descriptionurl,author,license,licenseUrl,match,notices:[...photoNotices(meta,info.descriptionurl),...(explicitSelfRelease&&!meta.LicenseUrl?.value?['Creator public-domain release: '+release]:[])],remoteUrl:info.thumburl||info.url};
}
let lastRequest=0,sourceBlockedUntil=0;
export async function wikiRequest<T>(host:'en.wikipedia.org'|'www.wikidata.org'|'commons.wikimedia.org',params:Record<string,string>,minimumIntervalMs=1200):Promise<T>{
 const url=new URL(`https://${host}/w/api.php`);url.search=new URLSearchParams({...params,format:'json',formatversion:'2',maxlag:'5'}).toString();
 for(let attempt=0;attempt<4;attempt++){
  while(Date.now()<sourceBlockedUntil)await new Promise(resolve=>setTimeout(resolve,Math.min(30000,sourceBlockedUntil-Date.now())));
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,Math.max(250,minimumIntervalMs)-(Date.now()-lastRequest))));lastRequest=Date.now();
  const response=await fetch(url,{headers:{'User-Agent':`RoamItinerary/1.0 (${process.env.PHOTO_SOURCE_CONTACT||'http://localhost:3001'}; attributed destination photographs)`,'Accept':'application/json'},signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({error:{info:`Photo source returned ${response.status}`}}));
  if(response.status===429||response.status===503||['maxlag','ratelimited'].includes(data.error?.code)){
   const header=response.headers.get('retry-after')||'',seconds=Number(header);
   const delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Math.max(5000*2**attempt,Date.parse(header)-Date.now()||0);
   sourceBlockedUntil=Math.max(sourceBlockedUntil,Date.now()+delay);
   if(attempt===3)throw new Error('The photo source is busy. Import paused; cached work is retained.');
   continue;
  }
  if(!response.ok||data.error)throw new Error(data.error?.info||`Photo source returned ${response.status}`);return data as T;
 }
 throw new Error('The photo source is temporarily unavailable.');
}
export async function findExactPhoto(place:Place,identity:PhotoIdentity={}):Promise<(Omit<PlaceImage,'url'>&{remoteUrl:string})|null>{
 let linkedFile=identity.commonsFile;
 if(!linkedFile&&identity.wikidataId){
  const result=await wikiRequest<{entities:Record<string,{claims?:Record<string,{mainsnak:{datavalue?:{value:unknown}}}[]>}>}>('www.wikidata.org',{action:'wbgetentities',ids:identity.wikidataId,props:'claims'});
  const entity=result.entities[identity.wikidataId],file=entity?.claims?.P18?.[0]?.mainsnak.datavalue?.value;
  const point=entity?.claims?.P625?.[0]?.mainsnak.datavalue?.value as {latitude:number;longitude:number}|undefined;
  if(typeof file==='string'&&(!point||isNearby(place,[{lat:point.latitude,lon:point.longitude}],3)))linkedFile=file;
 }
 if(linkedFile){
  const result=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:`File:${linkedFile}`,prop:'imageinfo|revisions',rvprop:'ids|timestamp|content',rvslots:'main',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories|ImageDescription|DateTimeOriginal|Restrictions|Attribution|Copyright|Copyrighted|Permission'});
  const photo=result.query?.pages.map(p=>commonsPhoto(p,'Exact image identity linked by the place source')).find(Boolean);if(photo)return photo;
 }
 const title=identity.wikipediaTitle||place.name;
 const result=await wikiRequest<{query?:{pages:WikipediaPage[]}}>('en.wikipedia.org',{action:'query',titles:title,redirects:'1',prop:'pageimages|coordinates',piprop:'name',pilicense:'free',colimit:'max'});
 const page=result.query?.pages.find(p=>p.pageimage&&!p.missing&&(identity.wikipediaTitle?(!p.coordinates||isNearby(place,p.coordinates,8)):isNearby(place,p.coordinates)));
 if(!page?.pageimage)return null;
 const images=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:`File:${page.pageimage}`,prop:'imageinfo|revisions',rvprop:'ids|timestamp|content',rvslots:'main',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories|ImageDescription|DateTimeOriginal|Restrictions|Attribution|Copyright|Copyrighted|Permission'});
 return images.query?.pages.map(p=>commonsPhoto(p,identity.wikipediaTitle?'Linked Wikipedia article':'Exact article with nearby coordinates')).find(Boolean)||null;
}
