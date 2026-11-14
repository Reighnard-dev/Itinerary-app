import type {Place} from '../shared/types.js';
import {geoCity,cityDistance,countryCode} from './world.js';
import {safeWebsite} from './travel-guide.js';
export interface OverturePlace {id:string;name:string;country:string;code:string;city:string;lat:number;lng:number;category:Place['category'];basic_category:string;confidence:number;locality?:string;address?:string;website?:string;phone?:string;sources:{dataset?:string;license?:string;record_id?:string}[]}
export function overturePlace(row:OverturePlace,retrievedAt=new Date().toISOString()):Place|null{
 const center=geoCity(row.country,row.city);
 if(!center||countryCode(row.country)!==row.code||!row.name?.trim()||!Number.isFinite(row.lat)||!Number.isFinite(row.lng)||Math.abs(row.lat)>90||Math.abs(row.lng)>180||row.confidence<0.85||!row.sources?.length||row.sources.some(source=>!['CDLA-Permissive-2.0','CC0-1.0','Apache-2.0'].includes(source.license||'')))return null;
 const distance=cityDistance(center,row);if(distance>20.1)return null;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(row.id))return null;
 if(row.category==='Parks & gardens'&&/\b(car ?park|parking|parkade|garage|parqueadero|business park|industrial park|technology park|tech park|office park|retail park)\b/i.test(row.name))return null;
 if(['Culture','Parks & gardens','Nature'].includes(row.category)&&/\b(apartments?|guest ?house|apartels?|funeral (?:home|services)|printing|prints|real estate|realty)\b/i.test(row.name))return null;
 const category=row.category,name=row.name.trim().slice(0,160),kind=row.basic_category.replaceAll('_',' ');
 const illustration=category==='Restaurants'||category==='Food & drink'?'dining':category==='Parks & gardens'||category==='Nature'?'park':category==='Activities'?'activities':category==='Beaches'?'beach':category==='Shopping'?'market':'culture';
 const website=safeWebsite(row.website);
 return {id:`overture-${row.id}`,name,country:row.country,city:row.city,lat:row.lat,lng:row.lng,category,kind:'local',rating:null,
 description:`${name} is listed as a ${kind}${distance<2?` near the center of ${row.city}`:` about ${Math.round(distance)} km from the center of ${row.city}`}.${row.locality?` Source locality: ${row.locality}.`:''} Check the source record${website?' and venue website':''} for current visitor information.`.slice(0,950),
 image:`/illustrations/${illustration}.svg`,duration:category==='Activities'?'2–3 hours':'1–2 hours',price:'Confirm prices with the venue',bestTime:'Check the venue’s hours',transit:'Open public transport directions from your starting point to check current routes and service.',driving:'Open driving directions and confirm parking and visitor access with the venue.',
 source:{name:'Overture Maps Foundation',url:`https://explore.overturemaps.org/?mode=inspect&feature=places.place.${row.id}#16/${row.lat.toFixed(5)}/${row.lng.toFixed(5)}`,retrievedAt,license:row.sources.some(s=>s.license==='Apache-2.0')?'CDLA 2.0 / Apache 2.0 / CC0':'CDLA Permissive 2.0'},
 ...(row.address?{address:row.address.slice(0,300)}:{}),...(website?{website}:{}),...(row.phone?{phone:row.phone.slice(0,100)}:{})};
}
