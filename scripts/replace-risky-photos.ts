import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {places} from '../server/catalog.js';
import {findExactPhoto} from '../server/photo-search.js';
import {hasOpenPhotoLicense} from '../shared/photo-rights.js';
import {publicImage} from '../server/public-image-fetch.js';

const manifest=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const targets=places.filter(p=>p.photo&&!hasOpenPhotoLicense(p.photo));
// Checkpoint every place so an interrupted or blocked source can be resumed.
const file='research/rights/replacement-progress.json';
const results:Record<string,unknown>=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
mkdirSync('public/images/places',{recursive:true});
for(const p of targets){
 if(results[p.id]&&(results[p.id] as {status:string}).status!=='source-blocked')continue;
 try{
  const photo=await findExactPhoto(p,p.photoIdentity);
  if(!photo){results[p.id]={name:p.name,country:p.country,city:p.city,status:'no-exact-open-photo-found'};}
  else{
   const bytes=await publicImage(photo.remoteUrl);
   const image=createHash('sha256').update(photo.remoteUrl).digest('hex').slice(0,24)+'.jpg';
   writeFileSync('public/images/places/'+image,bytes);
   const {remoteUrl,...credit}=photo;manifest[p.id]={...credit,url:'/images/places/'+image};
   writeFileSync('shared/place-images.json',JSON.stringify(manifest,null,2)+'\n');
   results[p.id]={name:p.name,country:p.country,city:p.city,status:'replaced',photo:manifest[p.id]};
  }
  writeFileSync(file,JSON.stringify(results,null,2));console.log(`${p.name}: ${(results[p.id] as {status:string}).status}`);
 }catch(error){results[p.id]={status:'source-blocked',error:String(error)};writeFileSync(file,JSON.stringify(results,null,2));throw error;}
}
