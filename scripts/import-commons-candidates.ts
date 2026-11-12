import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {publicImage} from '../server/public-image-fetch.js';
import type {PlaceImage} from '../shared/types.js';
const candidates=JSON.parse(readFileSync('shared/researched-photo-candidates.json','utf8')) as Record<string,Omit<PlaceImage,'url'>&{remoteUrl:string;score:number}>;
const photos:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));let added=0;
for(const [id,candidate] of Object.entries(candidates)){if(photos[id])continue;try{const file=createHash('sha256').update(candidate.remoteUrl).digest('hex').slice(0,24)+'.jpg';if(!existsSync(`public/images/places/${file}`)){await new Promise(r=>setTimeout(r,400));writeFileSync(`public/images/places/${file}`,await publicImage(candidate.remoteUrl));}const {score,remoteUrl,...credit}=candidate;photos[id]={...credit,url:`/images/places/${file}`};added++;}catch{}}
writeFileSync('shared/place-images.json',JSON.stringify(photos));console.log(JSON.stringify({added,total:Object.keys(photos).length}));
