import {createReadStream,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import world from '../shared/world-cities.json' with {type:'json'};
import codes from '../shared/expansion-countries.json' with {type:'json'};
import type {Place} from '../shared/types.js';
import {cityDistance} from '../server/world.js';
import {safeWebsite,annotateGuideLocality} from '../server/travel-guide.js';

// Parse template parameters only at the outer brace/link depth. Pipes in links or
// nested templates must not turn into new listing fields.
function fields(template:string){
 const parts:string[]=[];let start=0,depth=0,links=0;
 for(let i=0;i<template.length;i++){
  const pair=template.slice(i,i+2);
  if(pair==='{{'){depth++;i++;}else if(pair==='}}'){depth--;i++;}else if(pair==='[['){links++;i++;}else if(pair===']]'){links--;i++;}
  else if(template[i]==='|'&&depth===0&&links===0){parts.push(template.slice(start,i));start=i+1;}
 }
 parts.push(template.slice(start));const values:Record<string,string>={type:parts.shift()!.trim().toLowerCase()};
 for(const part of parts){const at=part.indexOf('=');if(at>=0)values[part.slice(0,at).trim().toLowerCase()]=part.slice(at+1).trim();}
 return values;
}
function templates(text:string){
 const result:Record<string,string>[]=[];const stack:{start:number;section:string}[]=[];let section='';
 for(let i=0;i<text.length-1;i++){
  if(i===0||text[i-1]==='\n'){const heading=text.slice(i,i+160).match(/^==\s*([^=\n]+?)\s*==(?!=)/);if(heading)section=heading[1].toLowerCase().trim();}
  const pair=text.slice(i,i+2);
  if(pair==='{{'){stack.push({start:i,section});i++;}
  else if(pair==='}}'){const entry=stack.pop();if(entry!==undefined){const body=text.slice(entry.start+2,i);if(/^(see|do|eat|drink|buy|shopping|activities)\b/.test(entry.section)&&/^\s*(see|do|eat|drink|buy|listing)\s*\|/i.test(body))result.push(fields(body));}i++;}
 }
 return result;
}
function clean(text=''){
 text=text.replace(/<!--[^]*?-->/g,'').replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g,'$1').replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g,'$1').replace(/\[https?:\/\/[^\]]+\]/g,'').replace(/'{2,}/g,'');
 for(let i=0;i<5;i++)text=text.replace(/\{\{[^{}]*\}\}/g,'');
 return load(`<span>${text}</span>`).text().replace(/\s+/g,' ').trim();
}
const normal=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('_',' ').replace(/\s+/g,' ').trim();
// Article identities retain accents: Malé and its redirect Male are distinct
// pages. Folding accents here can replace a full guide with an empty redirect.
const docKey=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\s+/g,' ').trim();
type Doc={title:string;parent:string;revision:string;timestamp:string;redirect:string;listings:Record<string,string>[]};
const docs=new Map<string,Doc>();let buffer='',pages=0;
for await(const chunk of createReadStream('data/sources/world-expansion/enwikivoyage.xml',{encoding:'utf8'})){
 buffer+=chunk;let end:number;
 while((end=buffer.indexOf('</page>'))>=0){
  const page=buffer.slice(0,end+7);buffer=buffer.slice(end+7);
  if(!/<ns>0<\/ns>/.test(page))continue;
  const xml=load(page,{xmlMode:true}),title=xml('title').first().text(),text=xml('text').first().text();
  const parent=text.match(/\{\{\s*(?:ispartof|is part of|partof)\s*\|\s*([^|}\n]+)/i)?.[1]?.trim()||'';
  const redirect=xml('redirect').attr('title')||text.match(/^\s*#redirect\s*\[\[([^\]]+)/i)?.[1]||'';
  docs.set(docKey(title),{title,parent,revision:xml('revision > id').first().text(),timestamp:xml('timestamp').first().text(),redirect,listings:templates(text.replace(/<!--[^]*?-->/g,''))});pages++;
 }
}
console.log(`Read ${pages} guide pages.`);
const countryTitles=new Map(world.countries.map(c=>[normal(c.country),c]));
countryTitles.delete(normal('Georgia')); // The unqualified guide is a US state/disambiguation.
const aliases:Record<string,string>={'Cape Verde':'CV',"Côte d’Ivoire":'CI',"Côte d'Ivoire":'CI','Ivory Coast':'CI','Bonaire':'BQ','Saba':'BQ','Sint Eustatius':'BQ','Cocos (Keeling) Islands':'CC','Curaçao':'CW','Macau':'MO','Swaziland':'SZ','East Timor':'TL','United States of America':'US','French Southern and Antarctic Lands':'TF','Democratic Republic of Congo':'CD','Congo-Kinshasa':'CD','The Gambia':'GM','Faeroe Islands':'FO','Northern Cyprus':'CY','England':'GB','Scotland':'GB','Wales':'GB','Northern Ireland':'GB'};
for(const [title,code] of Object.entries(aliases))countryTitles.set(normal(title),world.countries.find(c=>c.code===code)!);
countryTitles.set(normal('Georgia (country)'),world.countries.find(c=>c.code==='GE')!);
function countryOf(title:string,seen=new Set<string>()):typeof world.countries[number]|undefined{
 const key=docKey(title);if(seen.has(key))return;seen.add(key);
 const direct=countryTitles.get(normal(title));if(direct)return direct;
 const doc=docs.get(key);if(!doc)return;
 return countryOf(doc.redirect||doc.parent,seen);
}
const selected=new Set(codes),all:Place[]=[],unresolved:string[]=[];
const missingCoordinates:{countryCode:string;title:string;revision:number;fields:Record<string,string>}[]=[];
const old:Place[]=JSON.parse(readFileSync('shared/expanded-places.json','utf8'));
const known=new Set(old.map(p=>`${p.country}:${p.city}:${normal(p.name)}`));
let skippedCoordinates=0,skippedDistance=0;
for(const doc of docs.values()){
 if(!doc.listings.length)continue;const country=countryOf(doc.title);
 if(!country){unresolved.push(doc.title);continue;}if(!selected.has(country.code))continue;
 for(const f of doc.listings){
  const type=f.type==='listing'?(f.typeof||f['listing-type']||'see'):f.type;
  // Generic listing templates express their category with |type=, overriding
  // the template name in fields(). Exclude accommodation and transport.
  const categories:Record<string,Place['category']>={see:'Culture',do:'Activities',eat:'Restaurants',drink:'Food & drink',buy:'Shopping'};
  let category=categories[type];if(!category)continue;
  const name=clean(f.name);const lat=Number(f.lat),lng=Number(f.long||f.lon);
  if(/\b(embassy|consulate)\b/i.test(name)||/^ministry of defen[cs]e\b/i.test(name))continue;
  if(/\b(permanently closed|closed permanently|no longer exists|defunct)\b/i.test(f.name||'')||/\{\{\s*closed\s*[|}]/i.test(f.content||''))continue;
  if(!name||!f.lat||!(f.long||f.lon)||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||(lat===0&&lng===0)){skippedCoordinates++;if(name&&/^Q\d+$/.test(f.wikidata||''))missingCoordinates.push({countryCode:country.code,title:doc.title,revision:Number(doc.revision),fields:Object.fromEntries(Object.entries({...f,type}).map(([key,value])=>[key,['name','content','address','directions','hours','phone'].includes(key)?clean(value):value]))});continue;}
  let city:typeof country.cities[number]|undefined,distance=30;
  // Prefer the exact guide's city when it is geographically consistent. A
  // country/region guide is assigned only to a nearby city in that country.
  const base=normal(doc.title.split('/')[0]);
  const direct=country.cities.find(c=>normal(c.name.replace(/ \([^)]*\)( · \d+)?$/,''))===base||normal(c.nativeName)===base);
  if(direct&&cityDistance(direct,{lat,lng})<30)city=direct;
  else for(const candidate of country.cities){if(Math.abs(candidate.lat-lat)>.28)continue;const km=cityDistance(candidate,{lat,lng});if(km<distance){city=candidate;distance=km;}}
  if(!city){skippedDistance++;continue;}
  const key=`${country.country}:${city.name}:${normal(name)}`;if(known.has(key))continue;known.add(key);
  if(!['Restaurants','Food & drink','Shopping'].includes(category)){
   if(/\b(park|garden|gardens|botanical|botanic)\b/i.test(name))category='Parks & gardens';
   else if(/\b(beach|pantai)\b/i.test(name))category='Beaches';
   else if(/\b(waterfall|forest|nature reserve|lake|mountain|valley)\b/i.test(name)&&category==='Culture')category='Nature';
  }
  const illustration=category==='Restaurants'||category==='Food & drink'?'dining':category==='Parks & gardens'||category==='Nature'?'park':category==='Activities'?'activities':category==='Beaches'?'beach':category==='Shopping'?'market':'culture';
  const photoIdentity={...(/^Q\d+$/.test(f.wikidata||'')?{wikidataId:f.wikidata}:{}),...(f.wikipedia?{wikipediaTitle:f.wikipedia.replace(/^en:/,'')}:{}),...(f.image?{commonsFile:f.image.replace(/^(File|Image):/i,'')}: {})};
  const place:Place={id:`guide-${country.code.toLowerCase()}-${createHash('sha256').update(`${city.id}:${doc.title}:${name}:${lat}:${lng}`).digest('hex').slice(0,20)}`,name:name.slice(0,160),country:country.country,city:city.name,category,kind:'local',lat,lng,rating:null,
   description:(clean(f.content)||`${name} appears in the ${doc.title} travel guide. Open the source for visitor details.`).slice(0,950),image:`/illustrations/${illustration}.svg`,duration:category==='Activities'?'2–3 hours':'1–2 hours',price:'Check current prices',bestTime:'Check the venue’s hours',
   transit:clean(f.directions).slice(0,600)||'Open transit directions to check available routes and current service.',driving:'Open driving directions and confirm parking and visitor access with the venue.',source:{name:'Wikivoyage contributors',url:`https://en.wikivoyage.org/w/index.php?title=${encodeURIComponent(doc.title)}&oldid=${doc.revision}#${encodeURIComponent(name.replaceAll(' ','_'))}`,retrievedAt:new Date().toISOString(),license:'CC BY-SA 4.0'},
   ...(safeWebsite(f.url)?{website:safeWebsite(f.url)}:{}),...(f.address?{address:clean(f.address).slice(0,300)}:{}),...(f.hours?{hours:clean(f.hours).slice(0,300)}:{}),...(f.phone?{phone:clean(f.phone).slice(0,100)}:{}),...(f.lastedit?{listingUpdated:f.lastedit.slice(0,80)}:{}),...(Object.keys(photoIdentity).length?{photoIdentity}:{})};
  all.push(annotateGuideLocality(place));
 }
}
writeFileSync('shared/researched-places.json',JSON.stringify(all));
writeFileSync('data/sources/world-expansion/missing-guide-coordinates.json',JSON.stringify(missingCoordinates));
writeFileSync('data/sources/world-expansion/guide-import.json',JSON.stringify({pages,places:all.length,countries:new Set(all.map(p=>p.country)).size,cities:new Set(all.map(p=>`${p.country}:${p.city}`)).size,skippedCoordinates,skippedDistance,unresolved},null,2));
console.log(JSON.stringify({places:all.length,countries:new Set(all.map(p=>p.country)).size,cities:new Set(all.map(p=>`${p.country}:${p.city}`)).size,skippedCoordinates,skippedDistance,unresolved:unresolved.length}));
