import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverGuide,fetchGuidePage,type GuidePage} from '../server/travel-guide.js';
import type {Place} from '../shared/types.js';
mkdirSync('data/sources/guides',{recursive:true});
const targets:Record<string,string[]>={
 Japan:['Kyoto','Tokyo','Osaka','Nara'],Indonesia:['Bali','Jakarta','Yogyakarta'],France:['Paris','Lyon','Nice'],Italy:['Rome','Venice','Florence'],Switzerland:['Interlaken','Zurich','Lucerne'],Thailand:['Bangkok','Chiang Mai','Phuket'],Philippines:['Cebu','Manila','El Nido','Baguio'],
 Singapore:['Singapore'],'South Korea':['Seoul','Busan'],Vietnam:['Hanoi','Ho Chi Minh City'],Malaysia:['Kuala Lumpur','George Town'],
 'United Kingdom':['London','Edinburgh'],Spain:['Barcelona','Madrid'],Portugal:['Lisbon','Porto'],Netherlands:['Amsterdam'],Germany:['Berlin','Munich'],Greece:['Athens'],Austria:['Vienna'],Czechia:['Prague'],
 'United States':['New York City','San Francisco'],Canada:['Toronto','Vancouver'],Mexico:['Mexico City'],Brazil:['Rio de Janeiro'],
 Australia:['Sydney','Melbourne'],'New Zealand':['Auckland','Queenstown'],'United Arab Emirates':['Dubai','Abu Dhabi'],India:['Delhi','Jaipur'],Turkey:['Istanbul'],Egypt:['Cairo'],Morocco:['Marrakesh'],'South Africa':['Cape Town'],
};
const all:Place[]=JSON.parse(readFileSync('shared/expanded-places.json','utf8'));
const refresh=process.argv.includes('--refresh');
const loader=async(title:string):Promise<GuidePage|null>=>{const file=`data/sources/guides/${createHash('sha256').update(title).digest('hex')}.json`;if(!refresh&&existsSync(file))return JSON.parse(readFileSync(file,'utf8'));const page=await fetchGuidePage(title);if(page)writeFileSync(file,JSON.stringify(page));return page;};
for(const [country,cities] of Object.entries(targets))for(const city of cities){
 if(!refresh&&all.some(p=>p.country===country&&p.city===city)){console.log(`Cached ${country} / ${city}`);continue;}
 try{const result=await discoverGuide(country,city,loader,3);if(result.places.length){for(let i=all.length-1;i>=0;i--)if(all[i].country===country&&all[i].city===city)all.splice(i,1);all.push(...result.places);writeFileSync('shared/expanded-places.json',JSON.stringify(all));}console.log(`${country} / ${city}: ${result.places.length} places`);}catch(error){console.log(`Skipped ${country} / ${city}: ${(error as Error).message}`);}
}
console.log(JSON.stringify({countries:new Set(all.map(p=>p.country)).size,cities:new Set(all.map(p=>p.country+':'+p.city)).size,places:all.length,categories:[...new Set(all.map(p=>p.category))]}));
