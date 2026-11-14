import {createHash} from 'node:crypto';
import type {Place} from '../shared/types.js';
import {geoCity,cityDistance,countryCode} from './world.js';
import {safeWebsite} from './travel-guide.js';

export interface MapElement {type:'node'|'way'|'relation';id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>}
export interface MapResponse {elements:MapElement[];remark?:string;osm3s?:{timestamp_osm_base?:string}}
export const mapLicense='https://opendatacommons.org/licenses/odbl/1-0/';
export function mapCategory(t:Record<string,string>):Place['category']|undefined{
 if(t.amenity==='restaurant')return 'Restaurants';
 if(['cafe','bar','pub','food_court'].includes(t.amenity))return 'Food & drink';
 if(['park','garden'].includes(t.leisure))return 'Parks & gardens';
 if(['water_park','sports_centre','swimming_pool','miniature_golf'].includes(t.leisure)||['theme_park','zoo','aquarium'].includes(t.tourism))return 'Activities';
 if(t.natural==='beach'||t.leisure==='beach_resort')return 'Beaches';
 if(['peak','waterfall','cave_entrance'].includes(t.natural)||t.leisure==='nature_reserve')return 'Nature';
 if(['attraction','museum','gallery','viewpoint'].includes(t.tourism)||['castle','monument','memorial','ruins','archaeological_site','fort'].includes(t.historic))return 'Culture';
 return undefined;
}
export function mapPlace(element:MapElement,country:string,city:string,retrievedAt=new Date().toISOString()):Place|null{
 const t=element.tags||{},name=t['name:en']||t.name,category=mapCategory(t),pin=element.center||{lat:element.lat,lon:element.lon};
 const center=geoCity(country,city);
 if(!center||!name||!category||t.access==='private'||t.access==='no'||t.disused==='yes'||t.abandoned==='yes'||!Number.isFinite(pin.lat)||!Number.isFinite(pin.lon)||Math.abs(pin.lat!)>90||Math.abs(pin.lon!)>180)return null;
 const lat=pin.lat!,lng=pin.lon!,distance=cityDistance(center,{lat,lng});if(distance>30)return null;
 const kind=(t.tourism||t.historic||t.leisure||t.amenity||t.natural||'place').replaceAll('_',' ');
 const address=t['addr:full']||[t['addr:housenumber'],t['addr:street'],t['addr:city'],t['addr:postcode']].filter(Boolean).join(' ');
 const wikipedia=t.wikipedia?.startsWith('en:')?t.wikipedia.slice(3):undefined;
 const photoIdentity={...(/^Q\d+$/.test(t.wikidata||'')?{wikidataId:t.wikidata}:{}),...(wikipedia?{wikipediaTitle:wikipedia}:{}),...(t.wikimedia_commons?.startsWith('File:')?{commonsFile:t.wikimedia_commons.slice(5)}:{})};
 const illustration=category==='Restaurants'||category==='Food & drink'?'dining':category==='Parks & gardens'||category==='Nature'?'park':category==='Activities'?'activities':category==='Beaches'?'beach':'culture';
 return {id:`osm-${element.type}-${element.id}-${createHash('sha256').update(`${country}:${city}`).digest('hex').slice(0,10)}`,name:name.slice(0,160),country,city,category,kind:'local',lat,lng,rating:null,
 description:`${name} is mapped as a ${kind} ${distance<2?'in':`about ${Math.round(distance)} km from the center of`} ${city}.${t.cuisine?` Cuisine: ${t.cuisine.replaceAll(';',', ').replaceAll('_',' ')}.`:''}${t.description?` ${t.description}`:''} Check the source and venue for visitor access and current details.`.slice(0,950),
 image:`/illustrations/${illustration}.svg`,duration:category==='Activities'?'2–3 hours':'1–2 hours',price:t.fee==='no'?'Mapped as free; confirm access':'Check current prices',bestTime:'Check the venue’s hours',
 transit:'Open public transport directions from your starting point to check current routes and service.',driving:'Use driving directions and confirm parking and visitor access with the venue.',
 source:{name:'OpenStreetMap contributors',url:`https://www.openstreetmap.org/${element.type}/${element.id}`,retrievedAt,license:'ODbL 1.0'},
 ...(address?{address:address.slice(0,300)}:{}),...(t.opening_hours?{hours:t.opening_hours.slice(0,300)}:{}),...(t.phone||t['contact:phone']?{phone:(t.phone||t['contact:phone']).slice(0,100)}:{}),
 ...(safeWebsite(t.website||t['contact:website'])?{website:safeWebsite(t.website||t['contact:website'])}:{}),...(Object.keys(photoIdentity).length?{photoIdentity}:{})};
}
export function mapQuery(area:string,timeout=90){
 const clauses=['[tourism~"^(attraction|museum|gallery|viewpoint|theme_park|zoo|aquarium)$"]','[amenity~"^(restaurant|cafe|bar|pub|food_court)$"]','[leisure~"^(park|garden|water_park|sports_centre|nature_reserve)$"]','[historic~"^(castle|monument|memorial|ruins|archaeological_site|fort)$"]','[natural~"^(beach|peak|waterfall|cave_entrance)$"]'];
 return `[out:json][timeout:${timeout}];(${clauses.map(clause=>`nwr${area}${clause}[name];`).join('')});out center tags;`;
}
export async function fetchMapQuery(query:string,timeout=110000):Promise<MapResponse>{
 const endpoint=process.env.OVERPASS_URL||'https://overpass.private.coffee/api/interpreter';
 const response=await fetch(`${endpoint}?data=${encodeURIComponent(query)}`,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed travel catalog; https://en.wikivoyage.org/wiki/Wikivoyage:Listings)'},signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw new Error(`Map source returned ${response.status}.`);
 const result=await response.json() as MapResponse;
 if(result.remark||!Array.isArray(result.elements))throw new Error(result.remark||'Incomplete map response.');
 return result;
}
export async function discoverMapPlaces(country:string,city:string){
 const center=geoCity(country,city);if(!center)throw new Error('Choose an indexed city.');
 const code=countryCode(country);
 const query=mapQuery(`(around:6000,${center.lat},${center.lng})(area.a)`,10).replace(';(',`;area["ISO3166-1"="${code}"][admin_level=2]->.a;(`);
 const data=await fetchMapQuery(query,12000);
 const places=data.elements.map(element=>mapPlace(element,country,city)).filter((p):p is Place=>Boolean(p));
 return {places:balancePlaces(places,120),sourcePages:['https://www.openstreetmap.org/copyright'],fetchedAt:new Date().toISOString()};
}
export function balancePlaces(places:Place[],limit=80){
 const buckets=new Map<string,Place[]>(),seen=new Set<string>();
 places.sort((a,b)=>Number(Boolean(b.photoIdentity))-Number(Boolean(a.photoIdentity))||a.name.localeCompare(b.name));
 for(const p of places){const key=p.name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');if(seen.has(key))continue;seen.add(key);const bucket=buckets.get(p.category)||[];bucket.push(p);buckets.set(p.category,bucket);}
 const output:Place[]=[];for(let i=0;output.length<limit;i++){let added=false;for(const bucket of buckets.values())if(bucket[i]&&output.length<limit){output.push(bucket[i]);added=true;}if(!added)break;}
 return output;
}
