import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import world from '../shared/world-cities.json' with {type:'json'};
import codes from '../shared/expansion-countries.json' with {type:'json'};
import {cityDistance} from '../server/world.js';
import {mapPlace,mapQuery,fetchMapQuery,balancePlaces,type MapResponse} from '../server/map-places.js';
import type {Place} from '../shared/types.js';
mkdirSync('data/sources/world-expansion',{recursive:true});
const output='shared/map-places.json';
let all:Place[]=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):[];
const selected=process.argv.filter(arg=>/^[A-Z]{2}$/.test(arg));
const status:Record<string,unknown>=existsSync('data/sources/world-expansion/map-status.json')?JSON.parse(readFileSync('data/sources/world-expansion/map-status.json','utf8')):{};
for(const code of selected.length?selected:codes){
 const country=world.countries.find(c=>c.code===code)!;const cache=`data/sources/world-expansion/${code}.json`;
 try{
  let data:MapResponse;
  if(existsSync(cache))data=JSON.parse(readFileSync(cache,'utf8'));
  else{
   // One country-wide request replaces thousands of individual city searches.
   const query=mapQuery('(area.a)',180).replace(';(',`;area["ISO3166-1"="${code}"][admin_level=2]->.a;(`);
   data=await fetchMapQuery(query,210000);writeFileSync(cache,JSON.stringify(data));
  }
  if(data.remark)throw new Error(data.remark);
  const groups=new Map<string,Place[]>();let matched=0;
  for(const element of data.elements){
   const pin=element.center||{lat:element.lat,lon:element.lon};if(!Number.isFinite(pin.lat)||!Number.isFinite(pin.lon))continue;
   let best:typeof country.cities[number]|undefined,bestDistance=30;
   for(const city of country.cities){if(Math.abs(city.lat-pin.lat!)>0.28)continue;const distance=cityDistance(city,{lat:pin.lat!,lng:pin.lon!});if(distance<bestDistance){best=city;bestDistance=distance;}}
   if(!best)continue;const place=mapPlace(element,country.country,best.name);if(!place)continue;
   const group=groups.get(best.name)||[];group.push(place);groups.set(best.name,group);matched++;
  }
  const added=[...groups.values()].flatMap(group=>balancePlaces(group));
  all=[...all.filter(p=>p.country!==country.country),...added];writeFileSync(output,JSON.stringify(all));
  status[code]={country:country.country,elements:data.elements.length,matched,places:added.length,cities:groups.size,totalCities:country.cities.length,checkedAt:new Date().toISOString()};
  console.log(JSON.stringify(status[code]));
 }catch(error){status[code]={country:country.country,error:(error as Error).message,checkedAt:new Date().toISOString()};console.log(`${code}: ${(error as Error).message}`);}
 writeFileSync('data/sources/world-expansion/map-status.json',JSON.stringify(status,null,2));
 await new Promise(resolve=>setTimeout(resolve,1500));
}
