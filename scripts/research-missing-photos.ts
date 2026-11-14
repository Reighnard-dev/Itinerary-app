import {mkdirSync,writeFileSync} from 'node:fs';
import {places} from '../server/catalog.js';
import {wikiRequest,commonsPhoto,plain,type CommonsImage} from '../server/photo-search.js';
// Discovery only: search results require a reviewed selection before import.
const queries=process.argv.slice(2);
mkdirSync('research/rights/photo-discovery',{recursive:true});
for(const query of queries){
 const data=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'800'});
 const file='research/rights/photo-discovery/'+query.normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.json';
 writeFileSync(file,JSON.stringify({retrievedAt:new Date().toISOString(),searchTerms:query,...data},null,2)+'\n');
 console.log(JSON.stringify({query,file,candidates:(data.query?.pages||[]).filter(p=>commonsPhoto(p,'Review candidate')).map(p=>({title:p.title,description:plain(p.imageinfo?.[0].extmetadata?.ImageDescription?.value||'').slice(0,350),url:p.imageinfo?.[0].thumburl,coordinates:Object.fromEntries(Object.entries(p.imageinfo?.[0].extmetadata||{}).filter(([k])=>k.startsWith('GPS')))}))}));
}
if(!queries.length)console.log(JSON.stringify({missing:places.filter(p=>!p.photo).length,priority:places.filter(p=>!p.photo&&(p.id.startsWith('sapa-')||!p.id.includes('-'))).map(p=>({id:p.id,name:p.name,city:p.city}))}));
