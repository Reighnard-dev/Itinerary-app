import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import world from '../shared/world-cities.json' with {type:'json'};
import type {Place} from '../shared/types.js';
import {wikiRequest} from '../server/photo-search.js';
import {parseGuidePage,annotateGuideLocality} from '../server/travel-guide.js';
import {cityDistance} from '../server/world.js';
const pending:{countryCode:string;title:string;revision:number;fields:Record<string,string>}[]=JSON.parse(readFileSync('data/sources/world-expansion/missing-guide-coordinates.json','utf8'));
const dir='data/sources/world-expansion/coordinates';mkdirSync(dir,{recursive:true});
type Entity={claims?:Record<string,{mainsnak:{datavalue?:{value:unknown}}}[]>};
const entities=new Map<string,Entity>();
for(const folder of ['data/sources/world-expansion/photos',dir])if(existsSync(folder))for(const file of readdirSync(folder)){
 if(!file.endsWith('.json')||file==='candidates.json')continue;
 const data=JSON.parse(readFileSync(`${folder}/${file}`,'utf8'));for(const [id,entity] of Object.entries(data.entities||{}))entities.set(id,entity as Entity);
}
const ids=[...new Set(pending.map(p=>p.fields.wikidata))].filter(id=>!entities.has(id));
for(let i=0;i<ids.length;i+=45){
 const batch=ids.slice(i,i+45);
 try{const data=await wikiRequest<{entities:Record<string,Entity>}>('www.wikidata.org',{action:'wbgetentities',ids:batch.join('|'),props:'claims'});for(const [id,entity] of Object.entries(data.entities))entities.set(id,entity);writeFileSync(`${dir}/${batch[0]}.json`,JSON.stringify(data));if(i%450===0)console.log(`Coordinate identities ${Math.min(i+45,ids.length)}/${ids.length}`);}catch(error){console.log(`Coordinate source: ${(error as Error).message}`);}
}
const all:Place[]=JSON.parse(readFileSync('shared/researched-places.json','utf8'));
const key=(p:Pick<Place,'country'|'city'|'name'>)=>`${p.country}:${p.city}:${p.name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')}`;
const known=new Set([...all,...JSON.parse(readFileSync('shared/expanded-places.json','utf8'))].map(key));
const escape=(s='')=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');let added=0;
for(const entry of pending){
 const f=entry.fields,entity=entities.get(f.wikidata),point=entity?.claims?.P625?.[0]?.mainsnak.datavalue?.value as {latitude:number;longitude:number}|undefined;
 if(!point)continue;const country=world.countries.find(c=>c.code===entry.countryCode)!;let best:typeof country.cities[number]|undefined,distance=30;
 for(const city of country.cities){if(Math.abs(city.lat-point.latitude)>.28)continue;const km=cityDistance(city,{lat:point.latitude,lng:point.longitude});if(km<distance){best=city;distance=km;}}
 if(!best||known.has(key({country:country.country,city:best.name,name:f.name})))continue;
 const section=({see:'See',do:'Do',eat:'Eat',drink:'Drink',buy:'Buy'} as Record<string,string>)[f.type];if(!section)continue;
 const text=`<h2>${section}</h2><div class="vcard"><a data-lat="${point.latitude}" data-lon="${point.longitude}"></a><span class="listing-name" id="${escape(f.name.replaceAll(' ','_'))}"><a class="external" href="${escape(f.url)}">${escape(f.name)}</a></span>${['content','address','directions','hours','phone'].map(key=>`<span class="listing-${key}">${escape(f[key])}</span>`).join('')}</div>`;
 const place=parseGuidePage({title:entry.title,revid:entry.revision,text},country.country,best.name)[0];if(!place)continue;
 place.photoIdentity={wikidataId:f.wikidata,...(f.wikipedia?{wikipediaTitle:f.wikipedia.replace(/^en:/,'')}:{}),...(f.image?{commonsFile:f.image.replace(/^(File|Image):/i,'')}: {})};
 all.push(place);known.add(key(place));added++;
}
for(const place of all)annotateGuideLocality(place);
writeFileSync('shared/researched-places.json',JSON.stringify(all));console.log(JSON.stringify({pending:pending.length,entities:entities.size,added,total:all.length}));
