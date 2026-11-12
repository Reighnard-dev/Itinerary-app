import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {wikiRequest,nonPhotographicMetadata,type CommonsImage} from '../server/photo-search.js';
import type {PlaceImage} from '../shared/types.js';
const files=['shared/place-images.json','shared/entity-photo-candidates.json'];
const manifests=files.map(f=>JSON.parse(readFileSync(f,'utf8')) as Record<string,PlaceImage>);
// A location photo can include a flag, or a museum's mixed exhibit category.
// Restore those reviewed photographic scenes after refining the subject filter.
if(existsSync('data/photo-review/non-photographic-wikimedia.json')){const prior=JSON.parse(readFileSync('data/photo-review/non-photographic-wikimedia.json','utf8'));for(const [id,entry] of Object.entries(prior) as [string,{photo:PlaceImage;reason:string}][])if(!nonPhotographicMetadata({Categories:{value:entry.reason}}))manifests[1][id]=entry.photo;}
const titles=[...new Set(manifests.flatMap(m=>Object.values(m).map(p=>'File:'+p.title)))];
mkdirSync('data/sources/photos/subject-audit',{recursive:true});
const rejected=new Map<string,string>();
for(let i=0;i<titles.length;i+=40){const batch=titles.slice(i,i+40),cache=`data/sources/photos/subject-audit/${createHash('sha256').update(JSON.stringify(batch)).digest('hex')}.json`;
 try{const data=existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:batch.join('|'),prop:'imageinfo',iiprop:'extmetadata',iiextmetadatafilter:'Categories|ImageDescription'});if(!existsSync(cache))writeFileSync(cache,JSON.stringify(data));
  for(const page of data.query?.pages||[])if(nonPhotographicMetadata(page.imageinfo?.[0]?.extmetadata||{}))rejected.set(page.title.replace(/^File:/,''),page.imageinfo?.[0]?.extmetadata?.Categories?.value||'Non-photographic subject');
 }catch(error){console.log(String(error));}
 if(i%200===0)console.log(`Audited ${Math.min(i+40,titles.length)}/${titles.length} Wikimedia subjects; ${rejected.size} non-location subjects excluded`);
}
const review:Record<string,unknown>={};
for(let i=0;i<files.length;i++){for(const [id,p] of Object.entries(manifests[i]))if(rejected.has(p.title)){review[id]={photo:p,reason:rejected.get(p.title)};delete manifests[i][id];}writeFileSync(files[i],JSON.stringify(manifests[i]));}
writeFileSync('data/photo-review/non-photographic-wikimedia.json',JSON.stringify(review));console.log(JSON.stringify({checked:titles.length,removed:Object.keys(review).length}));
