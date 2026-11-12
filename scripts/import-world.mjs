import {readFileSync,writeFileSync} from 'node:fs';
const rows=file=>readFileSync(`data/sources/${file}`,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>l.split('\t'));
const regions=new Map(rows('admin1CodesASCII.txt').map(r=>[r[0],r[1]]));
const countries=rows('countryInfo.txt').filter(r=>!['AN','CS'].includes(r[0])).map(r=>({country:r[4],code:r[0],capital:r[5],region:r[8],cities:[]}));
for(const country of countries)if(country.code==='NL')country.country='Netherlands';
const byCode=new Map(countries.map(c=>[c.code,c]));
for(const r of rows('cities15000.txt')){
 const country=byCode.get(r[8]);if(!country)continue;
 country.cities.push({id:r[0],name:r[2]||r[1],nativeName:r[1],lat:Number(r[4]),lng:Number(r[5]),region:regions.get(`${r[8]}.${r[10]}`)||r[10],population:Number(r[14]),capital:r[7]==='PPLC'});
}
// Retain original itinerary labels and add popular island/region destinations.
const aliases=[['JP','Kyoto',35.0116,135.7681],['JP','Nara',34.6851,135.8048],['CH','Zurich',47.3769,8.5417],['CH','Lucerne',47.0502,8.3093],['PH','Cebu',10.3157,123.8854],['ID','Bali',-8.5069,115.2625],['CH','Interlaken',46.6863,7.8632],['VN','Ho Chi Minh City',10.7769,106.7009],['US','New York City',40.7128,-74.006],['AE','Dubai',25.2048,55.2708],['IT','Venice',45.4408,12.3155],['TH','Phuket',7.8804,98.3923],['PH','El Nido',11.18,119.392],['PH','Coron',11.9986,120.2043],['PH','Boracay',11.9674,121.9248],['KR','Jeju',33.4996,126.5312]];
aliases.push(['NZ','Queenstown',-45.0312,168.6626]);
for(const [code,name,lat,lng] of aliases){const c=byCode.get(code);if(c&&!c.cities.some(v=>v.name===name))c.cities.push({id:`roam-${code}-${name}`,name,nativeName:name,lat,lng,region:'',population:0,capital:false});}
for(const c of countries){
 c.cities.sort((a,b)=>Number(b.capital)-Number(a.capital)||b.population-a.population);
 const duplicates=new Map();for(const city of c.cities)duplicates.set(city.name,(duplicates.get(city.name)||0)+1);
 const used=new Set();c.cities=c.cities.filter(city=>{if(duplicates.get(city.name)>1)city.name=`${city.name} (${city.region||city.id})`;if(used.has(city.name))city.name+=` · ${city.id}`;used.add(city.name);return true;});
}
countries.sort((a,b)=>a.country.localeCompare(b.country,'en'));
const result={source:'GeoNames',license:'CC BY 4.0',sourceUrl:'https://www.geonames.org/',retrievedAt:'2026-11-11',countries};
writeFileSync('shared/world-cities.json',JSON.stringify(result));
console.log(JSON.stringify({countries:countries.length,cities:countries.reduce((n,c)=>n+c.cities.length,0),empty:countries.filter(c=>!c.cities.length).map(c=>c.country)}));
