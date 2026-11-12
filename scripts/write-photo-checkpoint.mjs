import {readFileSync,writeFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const originals=(await import('../dist-server/shared/catalog.js')).places,seen=new Set();
const places=[...originals,...load('shared/expanded-places.json')].filter(p=>{const key=`${p.country}:${p.city}:${p.name.toLowerCase()}`;if(seen.has(key))return false;seen.add(key);return true;});
const sources={wikimedia:load('shared/place-images.json'),identity:load('shared/entity-photo-candidates.json'),venue:load('shared/venue-photo-candidates.json'),web:load('shared/web-photo-candidates.json')},photos={...sources.web,...sources.venue,...sources.identity,...sources.wikimedia};
const old=load('data/photo-coverage.json'),unresolved=places.filter(p=>!photos[p.id]).map(p=>({id:p.id,name:p.name,country:p.country,city:p.city,category:p.category,address:p.address,lat:p.lat,lng:p.lng}));
const report={...old,generatedAt:new Date().toISOString(),places:places.length,photographed:places.length-unresolved.length,uniqueFiles:new Set(Object.values(photos).map(p=>p.url)).size,sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,Object.keys(v).length])),unresolved,status:'paused at user request'};
writeFileSync('data/photo-coverage.json',JSON.stringify(report));console.log(JSON.stringify({...report,unresolved:unresolved.length}));
