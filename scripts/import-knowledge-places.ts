import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import world from '../shared/world-cities.json' with {type:'json'};
import {cityDistance} from '../server/world.js';
import {safeWebsite} from '../server/travel-guide.js';
import type {Place} from '../shared/types.js';
type Binding=Record<string,{value:string;'xml:lang'?:string}>;
const coverage=JSON.parse(readFileSync('research/expansion-coverage.json','utf8')) as {countriesDetail:{code:string;country:string;cities:{city:string;places:number}[]}[]};
const requestedCodes=new Set(process.argv.slice(2));
const missing=coverage.countriesDetail.filter(c=>!requestedCodes.size||requestedCodes.has(c.code)).flatMap(country=>country.cities.filter(city=>!city.places).map(city=>({country:country.country,code:country.code,...world.countries.find(c=>c.code===country.code)!.cities.find(c=>c.name===city.city)!}))).filter(c=>/^\d+$/.test(c.id)).sort((a,b)=>b.population-a.population);
const byGeo=new Map(missing.map(city=>[city.id,city]));
const dir='data/sources/world-expansion/knowledge-places';mkdirSync(dir,{recursive:true});
const endpoint='https://qlever.dev/api/wikidata';
const output='shared/knowledge-places.json';const old:Place[]=JSON.parse(readFileSync(output,'utf8'));
const found=new Map(old.map(place=>[place.id,{place,distance:cityDistance(world.countries.find(c=>c.country===place.country)!.cities.find(c=>c.name===place.city)!,place),language:0}]));
let failures=0,checked=0;
let blockedUntil=0;
const languages=['en','uk','ru','fr','pt','es','de','ar','fa','hi'];
for(let offset=0;offset<missing.length;offset+=20){
 const batch=missing.slice(offset,offset+20);
 const query=`PREFIX wdt: <http://www.wikidata.org/prop/direct/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX schema: <http://schema.org/>
 SELECT DISTINCT ?gn ?place ?placeLabel ?typeLabel ?coordinate ?image ?description ?website WHERE {
 VALUES ?gn { ${batch.map(c=>'"'+c.id+'"').join(' ')} }
 ?city wdt:P1566 ?gn. ?place wdt:P131+ ?city; wdt:P625 ?coordinate; wdt:P31 ?type.
 ?type rdfs:label ?typeLabel. FILTER(LANG(?typeLabel)="en")
 FILTER(REGEX(?typeLabel,"museum|park|garden|castle|fort|temple|pagoda|stupa|shrine|church|cathedral|mosque|synagogue|basilica|stadium|beach|reserve|waterfall|volcano|mountain|lake|viewpoint|observation tower|clock tower|bell tower|historic|palace|monument|memorial|mausoleum|archaeolog|zoo|aquarium|cave|library|art gallery|theatre|theater|public square|war cemetery|restaurant|cafe|café","i"))
 ?place rdfs:label ?placeLabel. FILTER(LANG(?placeLabel) IN (${languages.map(v=>'"'+v+'"').join(',')}))
 OPTIONAL {?place wdt:P18 ?image.} OPTIONAL {?place schema:description ?description. FILTER(LANG(?description)="en")} OPTIONAL {?place wdt:P856 ?website.}
 } LIMIT 2000`;
 const cache=`${dir}/${createHash('sha256').update(query).digest('hex')}.json`;
 let requested=false;
 try{
  let data:{results:{bindings:Binding[]}};
  if(existsSync(cache))data=JSON.parse(readFileSync(cache,'utf8'));
  else{requested=true;while(Date.now()<blockedUntil)await new Promise(resolve=>setTimeout(resolve,Math.min(30000,blockedUntil-Date.now())));const response=await fetch(`${endpoint}?${new URLSearchParams({query,format:'json'})}`,{headers:{'User-Agent':'RoamItinerary/1.0 (public geographic landmark research)','Accept':'application/sparql-results+json'},signal:AbortSignal.timeout(35000)});if(response.status===429||response.status===503){const header=response.headers.get('retry-after')||'',seconds=Number(header),delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Math.max(10000,Date.parse(header)-Date.now()||0);blockedUntil=Date.now()+delay;}if(!response.ok)throw new Error(`Knowledge source returned ${response.status}`);data=await response.json() as typeof data;if(!Array.isArray(data.results?.bindings))throw new Error('Incomplete knowledge-source result');writeFileSync(cache,JSON.stringify(data));}
  for(const row of data.results.bindings){
   const city=byGeo.get(row.gn.value),point=row.coordinate.value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i),qid=row.place.value.match(/\/(Q\d+)$/)?.[1];
   if(!city||!point||!qid)continue;const lng=Number(point[1]),lat=Number(point[2]);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)continue;
   const distance=cityDistance(city,{lat,lng});if(distance>20)continue;
   const language=languages.indexOf(row.placeLabel['xml:lang']||'en'),id=`wikidata-${qid}`,previous=found.get(id);
   if(previous&&(previous.distance<distance-0.01||(Math.abs(previous.distance-distance)<0.01&&previous.language<=language)))continue;
   const name=row.placeLabel.value.slice(0,160),type=row.typeLabel.value;
   if(/^Q\d+$/.test(name)||/comfort station|software library|park district|municipality|commune|administrative|denomination|parish|military unit|company|operator|archaeological culture/i.test(type))continue;
   let category:Place['category']='Culture';if(/restaurant/i.test(type))category='Restaurants';else if(/cafe|café/i.test(type))category='Food & drink';else if(/park|garden/i.test(type))category='Parks & gardens';else if(/beach/i.test(type))category='Beaches';else if(/waterfall|reserve|cave|volcano|mountain|lake/i.test(type))category='Nature';else if(/zoo|aquarium|stadium|theatre|theater/i.test(type))category='Activities';
   const illustration=category==='Restaurants'||category==='Food & drink'?'dining':category==='Parks & gardens'||category==='Nature'?'park':category==='Activities'?'activities':category==='Beaches'?'beach':'culture';
   const image=row.image?.value.split('/Special:FilePath/')[1],website=safeWebsite(row.website?.value);
   const place:Place={id,name,country:city.country,city:city.name,category,kind:'local',lat,lng,rating:null,description:`${name} is recorded as a ${type}${distance>2?`, about ${Math.round(distance)} km from the center of ${city.name}`:''}.${row.description?` ${row.description.value}.`:''} Confirm visitor access and current details with the venue.`.slice(0,950),image:`/illustrations/${illustration}.svg`,duration:'1–2 hours',price:'Confirm current visitor prices',bestTime:'Confirm visitor hours',transit:'Open current transit directions from your starting point.',driving:'Open driving directions and confirm parking and visitor access.',source:{name:'Wikidata contributors',url:`https://www.wikidata.org/wiki/${qid}`,retrievedAt:new Date().toISOString(),license:'CC0 1.0'},photoIdentity:{wikidataId:qid,...(image?{commonsFile:decodeURIComponent(image)}:{})},...(website?{website}:{})};
   found.set(id,{place,distance,language});
  }
  checked+=batch.length;failures=0;writeFileSync(output,JSON.stringify([...found.values()].map(value=>value.place)));
  if(checked%100===0||checked===missing.length)console.log(`Knowledge lookup ${checked}/${missing.length} cities; ${found.size} landmarks`);
 }catch(error){console.log((error as Error).message);if(++failures>=3){console.log('Source unavailable repeatedly; retained all completed batches.');break;}}
 if(requested)await new Promise(resolve=>setTimeout(resolve,2000));
}
writeFileSync('research/knowledge-provenance.json',JSON.stringify({retrievedAt:new Date().toISOString(),endpoint,source:'Wikidata',license:'CC0 1.0',citiesChecked:checked,requestedCities:missing.length,landmarks:found.size,matching:'Exact GeoNames city identifier (P1566), administrative containment (P131), geographic coordinates (P625) within 20 km, and explicit attraction/place type. English labels preferred with language fallback.',note:'The main public query endpoint returned a gateway error. The QLever mirror is listed by Wikidata as an alternative endpoint. Individual records link to Wikidata.'},null,2));
