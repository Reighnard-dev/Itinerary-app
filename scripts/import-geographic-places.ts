import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import world from '../shared/world-cities.json' with {type:'json'};
import codes from '../shared/expansion-countries.json' with {type:'json'};
import {cityDistance} from '../server/world.js';
import type {Place} from '../shared/types.js';

const dir='data/sources/world-expansion/geonames';mkdirSync(dir,{recursive:true});
const featureGroups:Record<string,{category:Place['category'];kind:string}>= {};
for(const [category,definitions] of Object.entries({
 Culture:{MUS:'museum',HSTS:'historic site',CSTL:'castle',PAL:'palace',MNMT:'monument',RUIN:'ruins',ARCH:'archaeological site',MSTY:'monastery',TMPL:'temple',SYG:'synagogue',CH:'church',MSQE:'mosque',AMTH:'amphitheater',PYR:'pyramid'},
 'Parks & gardens':{PRK:'park',GDN:'garden',RESN:'nature reserve',RESW:'wildlife reserve',RESF:'forest reserve'},
 Activities:{AMUS:'amusement park',ZOO:'zoo',GOLF:'golf course',RECG:'recreation ground',SPA:'spa'},
 Restaurants:{REST:'restaurant'},Beaches:{BCH:'beach',BCHS:'beaches'},Nature:{FLLS:'waterfall',FLLSX:'section of waterfall',CAVE:'cave',CRTR:'crater',CNYN:'canyon',GYSR:'geyser'},
 }))for(const [code,kind] of Object.entries(definitions))featureGroups[code]={category:category as Place['category'],kind};
const output='shared/geographic-places.json';let all:Place[]=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):[];
const statusFile=`${dir}/status.json`,status:Record<string,unknown>=existsSync(statusFile)?JSON.parse(readFileSync(statusFile,'utf8')):{};
const requested=process.argv.filter(arg=>/^[A-Z]{2}$/.test(arg));const queue=requested.length?requested:codes;let cursor=0;
async function worker(){while(cursor<queue.length){
 const code=queue[cursor++],country=world.countries.find(c=>c.code===code)!;
 try{
  const archive=`${dir}/${code}.zip`;
  if(!existsSync(archive)){
   const response=await fetch(`https://download.geonames.org/export/dump/${code}.zip`,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed travel gazetteer import)'},signal:AbortSignal.timeout(120000)});
   if(!response.ok)throw new Error(`GeoNames returned ${response.status}`);
   writeFileSync(archive,Buffer.from(await response.arrayBuffer()));
  }
  const zip=spawn('7z',['x','-so',archive,`${code}.txt`],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let zipError='';zip.stderr.on('data',chunk=>{zipError+=chunk;});
  const completed=new Promise<void>((resolve,reject)=>{zip.on('error',reject);zip.on('exit',exit=>exit===0?resolve():reject(new Error(zipError||`7z returned ${exit}`)));});
  const groups=new Map<string,{place:Place;distance:number}[]>();let rows=0,eligible=0;
  for await(const line of createInterface({input:zip.stdout,crlfDelay:Infinity})){
   rows++;const r=line.split('\t'),feature=featureGroups[r[7]];if(!feature||r[8]!==code||/\b(colony|protectorate|mandate|occupied|occupation|annexed)\b/i.test(r[1]))continue;eligible++;
   const lat=Number(r[4]),lng=Number(r[5]);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
   let best:typeof country.cities[number]|undefined,distance=20;
   for(const city of country.cities){if(Math.abs(city.lat-lat)>.19)continue;const km=cityDistance(city,{lat,lng});if(km<distance){best=city;distance=km;}}
   if(!best)continue;const name=r[1].slice(0,160),category=feature.category;
   const illustration=category==='Restaurants'?'dining':category==='Parks & gardens'||category==='Nature'?'park':category==='Activities'?'activities':category==='Beaches'?'beach':'culture';
   const place:Place={id:`geo-${code.toLowerCase()}-${r[0]}`,name,country:country.country,city:best.name,category,kind:'local',lat,lng,rating:null,
    description:`${name} is a ${feature.kind} recorded in GeoNames, ${distance<2?`near the center of ${best.name}`:`about ${Math.round(distance)} km from the center of ${best.name}`}. This geographic listing does not confirm visitor access; check the source and local visitor information before planning a visit.`,
    image:`/illustrations/${illustration}.svg`,duration:'1–2 hours',price:'Confirm prices and visitor access',bestTime:'Confirm visitor hours locally',transit:'Open transit directions from your starting point to check current routes and service.',driving:'Confirm visitor access and parking before using driving directions.',
    source:{name:'GeoNames contributors',url:`https://www.geonames.org/${r[0]}/`,retrievedAt:new Date().toISOString(),license:'CC BY 4.0'},listingUpdated:r[18]};
   const group=groups.get(best.name)||[];group.push({place,distance});groups.set(best.name,group);
  }
  await completed;
  const added:Place[]=[];
  for(const group of groups.values()){
   group.sort((a,b)=>a.distance-b.distance);const counts=new Map<string,number>(),names=new Set<string>();
   for(const {place} of group){const key=place.name.normalize('NFKD').toLowerCase();const count=counts.get(place.category)||0;if(count>=12||names.has(key))continue;names.add(key);counts.set(place.category,count+1);added.push(place);}
  }
  all=[...all.filter(p=>p.country!==country.country),...added];
  status[code]={country:country.country,rows,eligible,places:added.length,cities:groups.size,totalCities:country.cities.length,checkedAt:new Date().toISOString()};console.log(JSON.stringify(status[code]));
 }catch(error){status[code]={country:country.country,error:(error as Error).message};console.log(`${code}: ${(error as Error).message}`);}
 writeFileSync(statusFile,JSON.stringify(status,null,2));
}}
await Promise.all([worker(),worker(),worker()]);
writeFileSync(output,JSON.stringify(all));
