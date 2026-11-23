import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import type {Place,PlaceImage} from '../shared/types.js';
import {hasOpenPhotoLicense,reusablePhoto} from '../shared/photo-rights.js';
import {findExactPhoto,isExcludedPhotoTitle} from './photo-search.js';

export function photoService(db:DatabaseSync,dataDir:string,places:Place[],findPhoto= findExactPhoto,fetchImage:typeof fetch=fetch){
 const known=new Map(places.map(p=>[p.id,p]));const pending=new Map<string,Promise<PlaceImage|null>>();let queue=Promise.resolve();
 const dir=path.resolve(dataDir,'photos');mkdirSync(dir,{recursive:true});
 db.exec('CREATE TABLE IF NOT EXISTS photo_cache(place_id TEXT PRIMARY KEY,data TEXT NOT NULL,checked_at INTEGER NOT NULL)');
 const allowedFiles=new Set<string>();
 const downloadEvidence=new Map<string,{sha256:string;photo:PlaceImage}>();
 for(const row of db.prepare('SELECT data FROM photo_cache').all()){try{const photo=reusablePhoto(JSON.parse(String(row.data)));if(photo?.url.startsWith('/api/photos/')){const file=path.join(dir,path.basename(photo.url)),sidecar=file+'.rights.json';if(existsSync(file)&&existsSync(sidecar)){const evidence=JSON.parse(readFileSync(sidecar,'utf8'));if(reusablePhoto(evidence.photo)&&evidence.photo.url===photo.url&&evidence.sha256===createHash('sha256').update(readFileSync(file)).digest('hex')){allowedFiles.add(path.basename(file));downloadEvidence.set(path.basename(file),evidence);}}}}catch{/* Ignore malformed legacy cache rows. */}}
 async function resolve(id:string):Promise<PlaceImage|null>{
  const seeded=known.get(id);if(reusablePhoto(seeded?.photo)&&!isExcludedPhotoTitle(seeded!.photo!.title))return seeded!.photo!;
  if(process.env.NETLIFY)return null;
  const old=db.prepare('SELECT data,checked_at FROM photo_cache WHERE place_id=?').get(id) as {data:string;checked_at:number}|undefined;
  if(old&&Date.now()-old.checked_at<30*86400000){const photo=JSON.parse(old.data) as PlaceImage|null,canonical=photo?downloadEvidence.get(path.basename(photo.url))?.photo:null;if(!photo)return null;if(canonical&&!isExcludedPhotoTitle(canonical.title))return canonical;}
  if(pending.has(id))return pending.get(id)!;
  const stored=seeded?undefined:db.prepare("SELECT entry.value AS data FROM place_cache,json_each(place_cache.data,'$.places') AS entry WHERE json_extract(entry.value,'$.id')=? LIMIT 1").get(id) as {data:string}|undefined;
  if(!seeded&&!stored)return null;const place=seeded||JSON.parse(stored!.data) as Place;
  const request=queue.then(async()=>{
   try{const info=await findPhoto(place,place.photoIdentity);let photo:PlaceImage|null=null;
    if(info&&hasOpenPhotoLicense(info)){const file=createHash('sha256').update(info.remoteUrl).digest('hex').slice(0,24)+'.jpg';const response=await fetchImage(info.remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (local travel planner)'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('The image source is temporarily unavailable.');if(response.headers.get('content-type')?.startsWith('image/')){const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>1500&&bytes.length<3000000){writeFileSync(path.join(dir,file),bytes);const {remoteUrl,...credit}=info;photo={...credit,url:`/api/photos/${file}`};writeFileSync(path.join(dir,file)+'.rights.json',JSON.stringify({retrievedAt:new Date().toISOString(),photo,sha256:createHash('sha256').update(bytes).digest('hex')}));allowedFiles.add(file);downloadEvidence.set(file,{sha256:createHash('sha256').update(bytes).digest('hex'),photo});}}}
    db.prepare('INSERT INTO photo_cache VALUES(?,?,?) ON CONFLICT(place_id) DO UPDATE SET data=excluded.data,checked_at=excluded.checked_at').run(id,JSON.stringify(photo),Date.now());return photo;
   }catch(error){const oldPhoto=old?reusablePhoto(JSON.parse(old.data)):null,photo=oldPhoto?downloadEvidence.get(path.basename(oldPhoto.url))?.photo:null;if(photo&&!isExcludedPhotoTitle(photo.title))return photo;throw error;}finally{pending.delete(id);}
  });queue=request.then(()=>undefined,()=>undefined);pending.set(id,request);return request;
 }
 return {resolve,dir,canServe:(filename:string)=>{const evidence=downloadEvidence.get(filename),file=path.join(dir,filename);return Boolean(allowedFiles.has(filename)&&evidence&&existsSync(file)&&evidence.sha256===createHash('sha256').update(readFileSync(file)).digest('hex'));}};
}
