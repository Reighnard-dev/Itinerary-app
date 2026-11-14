import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import type {Place} from '../shared/types.js';
import {cityDistance,geoCity,countryCode} from './world.js';
import {identityFromListing} from './photo-search.js';

export interface GuidePage {title:string;revid:number;text:string}
export interface GuideResult {places:Place[];sourcePages:string[];fetchedAt:string;notice?:string}
const clean=(v:string)=>v.replace(/\s+/g,' ').trim();
const clip=(v:string,n:number)=>v.length>n?`${v.slice(0,n-1).trim()}…`:v;
export function annotateGuideLocality(place:Place){
 const center=geoCity(place.country,place.city);if(!center||!place.source||place.source.name!=='Wikivoyage contributors')return place;
 const source=new URL(place.source.url),title=(source.searchParams.get('title')||decodeURIComponent(source.pathname.replace(/^\/wiki\//,''))).replaceAll('_',' ').split('/')[0];
 const normalize=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ \([^)]*\)( · \d+)?$/,'').trim();
 const distance=cityDistance(center,place),sameCity=[place.city,center.nativeName].some(city=>normalize(city)===normalize(title));
 if(distance<=2||(sameCity&&distance<=20)||place.description.startsWith('Listed in the '))return place;
 place.description=clip(`Listed in the ${title} guide, about ${Math.round(distance)} km from the center of ${place.city}. ${place.description}`,950);return place;
}
export function safeWebsite(value:string|undefined){if(!value)return undefined;try{const u=new URL(value.startsWith('//')?`https:${value}`:value);return ['https:','http:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}}
const iconic=/^(Gardens by the Bay|Merlion|Marina Bay Sands|Singapore Botanic Gardens|Tower of London|British Museum|Big Ben|Buckingham Palace|Westminster Abbey|Tower Bridge|Sydney Opera House|Sydney Harbour Bridge|Colosseum|Eiffel Tower|Louvre|Statue of Liberty|Central Park|Metropolitan Museum of Art|Sagrada Fam[ií]lia|Park G[uü]ell|Prado Museum|Alhambra|Acropolis|Parthenon|Hagia Sophia|Blue Mosque|Topkap[iı] Palace|Burj Khalifa|Petronas|Taj Mahal|Amber Fort|Hawa Mahal|Great Pyramid|Pyramids of Giza|Christ the Redeemer|Table Mountain|Robben Island|Golden Gate Bridge|Fisherman.s Wharf|CN Tower|Notre.Dame|Gyeongbokgung|N Seoul Tower|Haeundae Beach|Gamcheon|Osaka Castle|Dotonbori|T[oō]dai.ji|Ubud Monkey Forest|Hoan Kiem|Wat Phra That Doi Suthep|Temple of Literature|Rijksmuseum|Van Gogh Museum|Anne Frank House|Bel[eé]m Tower|Jer[oó]nimos|Sch[oö]nbrunn|St. Stephen.s Cathedral|Charles Bridge|Prague Castle|Brandenburg Gate|Reichstag|Nyhavn|Tivoli Gardens|Vigeland|Vasa Museum|Skansen|Hallgr[ií]mskirkja)/i;
const categories={eat:'Restaurants',drink:'Food & drink',buy:'Shopping',do:'Activities',see:'Culture'} as const;
export function parseGuidePage(page:GuidePage,country:string,city:string):Place[]{
 const $=load(page.text);const output:Place[]=[];let section='';const center=geoCity(country,city);if(!center)return [];
 $('h2,.vcard').each((_index,node)=>{
  const el=$(node);if(el.is('h2')){section=clean(el.text()).toLowerCase().replace(/\[edit\]/g,'').trim();return;}
  const base=Object.entries(categories).find(([key])=>section===key||section.startsWith(`${key} `))?.[1];if(!base)return;
  const name=clean(el.find('.listing-name').first().text());const pin=el.find('[data-lat][data-lon]').first();const lat=Number(pin.attr('data-lat')??el.find('.latitude').text()),lng=Number(pin.attr('data-lon')??el.find('.longitude').text());
  if(!name||!pin.length||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||(lat===0&&lng===0)||cityDistance(center,{lat,lng})>120)return;
  const raw=clean(el.find('.listing-content').text());let category:Place['category']=base;
  if(/\b(park|garden|gardens|botanical|botanic)\b/i.test(name)&&!['Restaurants','Food & drink','Shopping'].includes(base))category='Parks & gardens';
  else if(/\b(beach|bãi biển|pantai)\b/i.test(name)&&base!=='Restaurants')category='Beaches';
  else if(/\b(waterfall|forest|nature reserve|lake|mountain|valley)\b/i.test(name)&&base==='Culture')category='Nature';
  else if(/\b(market|food centre|hawker|food court)\b/i.test(name)&&base==='Restaurants')category='Food & drink';
  const anchor=el.find('.listing-name').first().attr('id')||name.replaceAll(' ','_');
  const sourceUrl=`https://en.wikivoyage.org/w/index.php?title=${encodeURIComponent(page.title)}${page.revid?`&oldid=${page.revid}`:''}#${encodeURIComponent(anchor)}`;
  const id=`guide-${countryCode(country).toLowerCase()}-${createHash('sha256').update(`${city}:${page.title}:${anchor}`).digest('hex').slice(0,20)}`;
  const duration=category==='Restaurants'||category==='Food & drink'?'1–2 hours':category==='Activities'?'2–3 hours':'1–2 hours';
  const image=category==='Restaurants'||category==='Food & drink'?'/illustrations/dining.svg':category==='Parks & gardens'||category==='Nature'?'/illustrations/park.svg':category==='Beaches'?'/illustrations/beach.svg':category==='Shopping'?'/illustrations/market.svg':category==='Activities'?'/illustrations/activities.svg':'/illustrations/culture.svg';
  const address=clean(el.find('.listing-address').text());const directions=clean(el.find('.listing-directions').text());const phone=clean(el.find('.listing-phone').text());
  output.push({id,name:clip(name,160),country,city,lat,lng,category,kind:iconic.test(name)?'iconic':'local',rating:null,description:clip(raw||`${name} is a ${category.toLowerCase()} listing in the ${page.title.replaceAll('/',' / ')} travel guide. Open the source for details.`,700),image,duration,price:'Check current prices',bestTime:'Check the venue’s hours',transit:clip(directions?`Guide directions: ${directions}. Check Maps for current routes and service.`:'Open public transport directions from your starting point to compare available routes and current service.',600),driving:'Use driving directions from your starting point. Check parking, access restrictions, and the venue’s arrival instructions before setting off.',source:{name:'Wikivoyage contributors',url:sourceUrl,retrievedAt:new Date().toISOString(),license:'CC BY-SA 4.0'},website:safeWebsite(el.find('.listing-name a.external').first().attr('href')),address:clip(address,300)||undefined,hours:clip(clean(el.find('.listing-hours').text()),300)||undefined,phone:clip(phone,100)||undefined,listingUpdated:el.find('.listing-lastedit time').attr('datetime'),photoIdentity:identityFromListing(el.html()||'')});
 });
 return output.map(annotateGuideLocality);
}
export function districtPages(page:GuidePage):string[]{const $=load(page.text);const prefix=`${page.title}/`;const pages=new Set<string>();$('a[href^="/wiki/"]').each((_i,el)=>{let title='';try{title=decodeURIComponent(($(el).attr('href')||'').slice(6)).replaceAll('_',' ').split('#')[0];}catch{return;}if(title.startsWith(prefix)&&!title.includes(':')&&title.length<180)pages.add(title);});return [...pages];}
export async function fetchGuidePage(title:string):Promise<GuidePage|null>{
 const url=new URL('https://en.wikivoyage.org/w/api.php');url.search=new URLSearchParams({action:'parse',page:title,prop:'text|revid',format:'json',formatversion:'2',redirects:'1',maxlag:'5'}).toString();
 const response=await fetch(url,{headers:{'User-Agent':'RoamItinerary/1.0 (https://en.wikivoyage.org/wiki/Wikivoyage:Listings; travel planning catalog)','Accept':'application/json'},signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw new Error(`Travel guide returned ${response.status}.`);
 const result=await response.json() as {parse?:GuidePage;error?:{code:string}};
 if(result.error){if(['missingtitle','invalidtitle'].includes(result.error.code))return null;throw new Error('The travel guide is busy. Try again shortly.');}
 return result.parse||null;
}
export async function discoverGuide(country:string,city:string,loader=fetchGuidePage,maxDistricts=3):Promise<GuideResult>{
 const center=geoCity(country,city);if(!center)throw new Error('Choose a city from the location suggestions.');
 const title=city.replace(/ \([^)]*\)( · \d+)?$/,'');let main=await loader(city==='Cebu'?'Cebu City':title);
 if(!main)return {places:[],sourcePages:[],fetchedAt:new Date().toISOString()};
 let collected=parseGuidePage(main,country,city);const sourcePages=[`https://en.wikivoyage.org/wiki/${encodeURIComponent(main.title.replaceAll(' ','_'))}`];
 // District guides carry the dining and activity listings for large cities.
 const featured:Record<string,string[]>={'New York City':['Manhattan/Midtown','Manhattan/Central Park','Manhattan/Financial District','Manhattan/Lower East Side'],Bali:['Ubud','South Bali','East Bali'],Phuket:['Phuket Town','Patong','Karon']};
 await Promise.all((featured[city]||districtPages(main)).slice(0,maxDistricts).map(async district=>{
  try{const sub=await loader(district);if(sub){collected.push(...parseGuidePage(sub,country,city));sourcePages.push(`https://en.wikivoyage.org/wiki/${encodeURIComponent(sub.title.replaceAll(' ','_'))}`);}}catch{/* Keep usable results when one district is temporarily unavailable. */}
 }));
 if(!collected.length&&main.title!==`${title} (${country})`){const alternate=await loader(`${title} (${country})`);if(alternate)collected=parseGuidePage(alternate,country,city);}
 const unique=new Map<string,Place>();for(const p of collected){const k=p.name.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu,'');if(!unique.has(k))unique.set(k,p);}
 // Interleave categories so restaurant-heavy guides do not bury parks and activities.
 const buckets=new Map<string,Place[]>();for(const p of unique.values()){const bucket=buckets.get(p.category)||[];bucket.push(p);buckets.set(p.category,bucket);}
 const ordered:Place[]=[];for(let i=0;i<60;i++)for(const bucket of buckets.values())if(bucket[i])ordered.push(bucket[i]);
 return {places:ordered.slice(0,240),sourcePages,fetchedAt:new Date().toISOString()};
}
