import {load} from 'cheerio';
import type {Place,PlaceImage} from '../shared/types.js';
import {cityDistance} from './world.js';
import excludedPhotoFiles from '../shared/photo-exclusions.json' with {type:'json'};
export type PhotoIdentity=NonNullable<Place['photoIdentity']>;
export interface WikipediaPage {title:string;pageimage?:string;coordinates?:{lat:number;lon:number}[];missing?:boolean;index?:number}
export interface CommonsImage {title:string;imageinfo?:{url:string;thumburl?:string;descriptionurl:string;mime:string;width:number;height:number;extmetadata?:Record<string,{value:string}>}[]}
export const normalName=(name:string)=>name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const excludedFiles=new Set(Object.keys(excludedPhotoFiles).map(normalName));
export const plain=(html:string)=>load(`<span>${html}</span>`).text().replace(/\s+/g,' ').trim();
export function nonPhotographicMetadata(meta:Record<string,{value:string}>){
 const categories=plain(meta.Categories?.value||'').replaceAll('_',' ');
 return categories.split('|').some(c=>/^(paintings|drawings|portraits|maps (?:of|showing)|logos|posters|lithographs|engravings|watercolou?rs|advertisements|floor plans)\b/i.test(c.trim()));
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
 const meta=info.extmetadata||{};if(nonPhotographicMetadata(meta))return null;const license=plain(meta.LicenseShortName?.value||''),licenseUrl=meta.LicenseUrl?.value||'';
 if(!/^(CC0|Public domain|CC BY(?:-SA)?(?: [1-4]\.0)?)/i.test(license))return null;
 if(/non-free|fair use|copyrighted/i.test(meta.UsageTerms?.value||''))return null;
 try{if(!sourceHosts.has(new URL(info.descriptionurl).hostname))return null;const imageUrl=new URL(info.thumburl||info.url);if(!['upload.wikimedia.org','thumb.wikimedia.org'].includes(imageUrl.hostname))return null;}catch{return null;}
 return {title:page.title.replace(/^File:/,''),sourceUrl:info.descriptionurl,author:plain(meta.Artist?.value||meta.Credit?.value||'Wikimedia Commons contributors').slice(0,300),license,licenseUrl:licenseUrl.startsWith('http')?licenseUrl:'https://commons.wikimedia.org/wiki/Commons:Licensing',match,remoteUrl:info.thumburl||info.url};
}
let lastRequest=0;
export async function wikiRequest<T>(host:'en.wikipedia.org'|'www.wikidata.org'|'commons.wikimedia.org',params:Record<string,string>):Promise<T>{
 const url=new URL(`https://${host}/w/api.php`);url.search=new URLSearchParams({...params,format:'json',formatversion:'2',maxlag:'5'}).toString();
 for(let attempt=0;attempt<4;attempt++){
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,1200-(Date.now()-lastRequest))));lastRequest=Date.now();
  const response=await fetch(url,{headers:{'User-Agent':`RoamItinerary/1.0 (${process.env.PHOTO_SOURCE_CONTACT||'http://localhost:3001'}; attributed destination photographs)`,'Accept':'application/json'},signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({error:{info:`Photo source returned ${response.status}`}}));
  if(response.status===429||response.status===503||data.error?.code==='maxlag'){
   const retryAfter=Number(response.headers.get('retry-after'))||5*2**attempt;
   if(attempt===3)throw new Error('The photo source is busy. Import paused; cached work is retained.');
   await new Promise(resolve=>setTimeout(resolve,Math.min(60000,Math.max(5000,retryAfter*1000))));continue;
  }
  if(!response.ok||data.error)throw new Error(data.error?.info||`Photo source returned ${response.status}`);return data as T;
 }
 throw new Error('The photo source is temporarily unavailable.');
}
export async function findExactPhoto(place:Place,identity:PhotoIdentity={}):Promise<(Omit<PlaceImage,'url'>&{remoteUrl:string})|null>{
 const title=identity.wikipediaTitle||place.name;
 const result=await wikiRequest<{query?:{pages:WikipediaPage[]}}>('en.wikipedia.org',{action:'query',titles:title,redirects:'1',prop:'pageimages|coordinates',piprop:'name',pilicense:'free',colimit:'max'});
 const page=result.query?.pages.find(p=>p.pageimage&&!p.missing&&(identity.wikipediaTitle?(!p.coordinates||isNearby(place,p.coordinates,8)):isNearby(place,p.coordinates)));
 if(!page?.pageimage)return null;
 const images=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:`File:${page.pageimage}`,prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'640',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories'});
 return images.query?.pages.map(p=>commonsPhoto(p,identity.wikipediaTitle?'Linked Wikipedia article':'Exact article with nearby coordinates')).find(Boolean)||null;
}
