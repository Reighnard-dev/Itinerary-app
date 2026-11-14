import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {wikiRequest,commonsPhoto,type CommonsImage} from '../server/photo-search.js';
const places=JSON.parse(readFileSync('shared/sapa-places.json','utf8'));
for(const p of places){if(p.photo)continue;
 const term=p.name.replace(' Mountain','').replace(' Village','').replace('Sa Pa','Sapa');
 try{const result=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',generator:'search',gsrsearch:`${term} ${/fansipan|sapa/i.test(term)?'':'Sapa'}`,gsrnamespace:'6',gsrlimit:'6',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500'});
 const candidates=result.query?.pages.map(x=>commonsPhoto(x,'Named location search — source match reviewed')).filter(Boolean)||[];
 writeFileSync(`data/sapa/photos-${p.id}.json`,JSON.stringify(candidates,null,2));console.log(p.name,candidates.map(x=>x?.title));
 }catch(e){console.log(p.name,(e as Error).message);}
}
