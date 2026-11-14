import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {publicImage} from '../server/public-image-fetch.js';
const places=JSON.parse(readFileSync('shared/sapa-places.json','utf8'));
// Keep the original-image field compatible with saved itinerary snapshots.
for(const selection of JSON.parse(readFileSync('research/sapa-photo-selections.json','utf8'))){const place=places.find((p:any)=>p.name===selection.name);if(!place)continue;try{const bytes=await publicImage(selection.image);const file='/images/places/'+createHash('sha256').update(selection.image).digest('hex').slice(0,24)+'.jpg';writeFileSync('public'+file,bytes);place.image=file;place.photo={url:file,title:place.name+' — named location photograph',sourceUrl:selection.source,author:selection.author,license:'Source website — rights retained',licenseUrl:selection.source,match:'Named location photograph on linked source page',provider:'web'};console.log(place.name,'OK');}catch(e){console.log(place.name,(e as Error).message);}writeFileSync('shared/sapa-places.json',JSON.stringify(places,null,2)+'\n');}
