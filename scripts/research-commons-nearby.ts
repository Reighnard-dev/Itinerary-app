import {writeFileSync,mkdirSync} from 'node:fs';
import {wikiRequest,commonsPhoto,plain,type CommonsImage} from '../server/photo-search.js';
const [lat,lng,radius='1000',name='nearby']=process.argv.slice(2);
if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))throw new Error('Latitude and longitude required');
const result=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',generator:'geosearch',ggscoord:lat+'|'+lng,ggsradius:radius,ggsnamespace:'6',ggslimit:'50',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'800'});
mkdirSync('research/rights/photo-discovery',{recursive:true});const evidence='research/rights/photo-discovery/nearby-'+name.replace(/[^a-z0-9-]/gi,'-')+'.json';writeFileSync(evidence,JSON.stringify({retrievedAt:new Date().toISOString(),lat,lng,radius,...result},null,2)+'\n');
console.log(JSON.stringify({evidence,photos:result.query?.pages.filter(p=>commonsPhoto(p,'Nearby research candidate')).map(p=>({title:p.title,description:plain(p.imageinfo?.[0].extmetadata?.ImageDescription?.value||'').slice(0,300),gps:[p.imageinfo?.[0].extmetadata?.GPSLatitude?.value,p.imageinfo?.[0].extmetadata?.GPSLongitude?.value]}))}));
