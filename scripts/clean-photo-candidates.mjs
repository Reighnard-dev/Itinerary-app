import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import select from './select-image-search-results.mjs';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const originals=(await import('../dist-server/shared/catalog.js')).places;
const places=new Map([...originals,...load('shared/expanded-places.json')].map(p=>[p.id,p]));
const rejected=existsSync('data/photo-review/rejected-candidates.json')?load('data/photo-review/rejected-candidates.json'):{};
// Specific mismatches found during contact-sheet review, retained for audit.
const badTitles=new Set(Object.keys(load('shared/photo-exclusions.json')));
for(const file of ['shared/venue-photo-candidates.json','shared/web-photo-candidates.json','shared/place-images.json']){
 const manifest=load(file);let removed=0;
 for(const [id,photo] of Object.entries(manifest)){
  const p=places.get(id);if(!p)continue;let reason='';
  if(badTitles.has(photo.title))reason='Visual review: portrait, artwork, or archival view rather than a contemporary location photograph';
  if(file.includes('venue-photo')){
   const label=photo.title+' '+photo.url;
   if(!/\b(interior|exterior|facade|façade|entrance|terrace|dining room|dining area|courtyard|building|architecture|restaurant front|our space)\b/i.test(label))reason='Venue source lacks a specific photographic view of the location';
   if(/\b(logo|menu|dish|dishes|food|poster|mobile app|jacket|tuxedo|parker|simmons|parking|soulvaki)\b/i.test(photo.title))reason='Visual review: promotional, food-only, product, portrait, or graphic image';
  }
  if(file.includes('web-photo')){
   const raw=`data/sources/image-search/${id}.json`;
   if(existsSync(raw)&&!select(load(raw).result,p).some(c=>c.sourceUrl===photo.sourceUrl&&c.title===photo.title))reason='Replaced by stricter named-place and photographic-view selection';
  }
  if(reason){rejected[id]={place:p.name,photo,reason};delete manifest[id];removed++;}
 }
 writeFileSync(file,JSON.stringify(manifest));console.log(JSON.stringify({file,removed,remaining:Object.keys(manifest).length}));
}
mkdirSync('data/photo-review',{recursive:true});writeFileSync('data/photo-review/rejected-candidates.json',JSON.stringify(rejected));
