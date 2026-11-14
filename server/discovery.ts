import {discoverGuide,type GuideResult} from './travel-guide.js';
import {discoverMapPlaces} from './map-places.js';
import {cityDistance} from './world.js';

export async function discoverPlaces(country:string,city:string,guide=discoverGuide,map=discoverMapPlaces):Promise<GuideResult>{
 let guideResult:GuideResult|undefined,mapResult:GuideResult|undefined;const failures:string[]=[];
 try{guideResult=await guide(country,city);}catch{failures.push('guide');}
 const categories=new Set(guideResult?.places.map(p=>p.category));
 if(!guideResult?.places.length||!(['Restaurants','Parks & gardens','Activities'] as const).every(c=>categories.has(c))){
  try{mapResult=await map(country,city);}catch{failures.push('map');}
 }
 if(!guideResult&&!mapResult)throw new Error('The travel sources are temporarily unavailable.');
 const places=[...(guideResult?.places||[])];
 for(const p of mapResult?.places||[]){const name=p.name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');if(!places.some(old=>old.name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')===name&&cityDistance(old,p)<1))places.push(p);}
 return {places,sourcePages:[...new Set([...(guideResult?.sourcePages||[]),...(mapResult?.sourcePages||[])])],fetchedAt:new Date().toISOString(),...(failures.length?{notice:'Some travel sources are temporarily unavailable. Available listings are shown; try again later for more places.'}:{})};
}
