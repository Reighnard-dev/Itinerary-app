import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import type {Place,PlaceImage} from '../shared/types.js';
import {findExactPhoto} from './photo-search.js';

export function photoService(db:DatabaseSync,dataDir:string,places:Place[]){
 const known=new Map(places.map(p=>[p.id,p]));const pending=new Map<string,Promise<PlaceImage|null>>();let queue=Promise.resolve();
 const dir=path.resolve(dataDir,'photos');mkdirSync(dir,{recursive:true});
 db.exec('CREATE TABLE IF NOT EXISTS photo_cache(place_id TEXT PRIMARY KEY,data TEXT NOT NULL,checked_at INTEGER NOT NULL)');
 async function resolve(id:string):Promise<PlaceImage|null>{
  const seeded=known.get(id);if(seeded)return seeded.photo||null;
  const old=db.prepare('SELECT data,checked_at FROM photo_cache WHERE place_id=?').get(id) as {data:string;checked_at:number}|undefined;
  if(old&&Date.now()-old.checked_at<30*86400000)return JSON.parse(old.data);
  if(pending.has(id))return pending.get(id)!;
  const stored=db.prepare("SELECT entry.value AS data FROM place_cache,json_each(place_cache.data,'$.places') AS entry WHERE json_extract(entry.value,'$.id')=? LIMIT 1").get(id) as {data:string}|undefined;
  if(!stored)return null;const place=JSON.parse(stored.data) as Place;
  const request=queue.then(async()=>{
   try{const info=await findExactPhoto(place,place.photoIdentity);let photo:PlaceImage|null=null;
    if(info){const file=createHash('sha256').update(info.remoteUrl).digest('hex').slice(0,24)+'.jpg';const response=await fetch(info.remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (local travel planner)'},signal:AbortSignal.timeout(12000)});if(response.ok&&response.headers.get('content-type')?.startsWith('image/')){const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>1500&&bytes.length<3000000){writeFileSync(path.join(dir,file),bytes);const {remoteUrl,...credit}=info;photo={...credit,url:`/api/photos/${file}`};}}}
    db.prepare('INSERT INTO photo_cache VALUES(?,?,?) ON CONFLICT(place_id) DO UPDATE SET data=excluded.data,checked_at=excluded.checked_at').run(id,JSON.stringify(photo),Date.now());return photo;
   }catch{return old?JSON.parse(old.data):null;}finally{pending.delete(id);}
  });queue=request.then(()=>undefined,()=>undefined);pending.set(id,request);return request;
 }
 return {resolve,dir};
}
