import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import type {PlaceImage} from '../shared/types.js';
import {publicImage} from '../server/public-image-fetch.js';
import {hasOpenPhotoLicense} from '../shared/photo-rights.js';
mkdirSync('data/web-photo-imported',{recursive:true});mkdirSync('public/images/places',{recursive:true});
const output:Record<string,PlaceImage>=existsSync('shared/web-photo-candidates.json')?JSON.parse(readFileSync('shared/web-photo-candidates.json','utf8')):{};
let batches=0,failed=0;
do{
 const files=readdirSync('data/web-photo-batches').filter(f=>f.endsWith('.json')&&!existsSync(`data/web-photo-imported/${f}`));
 for(const file of files){const records=JSON.parse(readFileSync(`data/web-photo-batches/${file}`,'utf8')) as {place:{id:string};candidates:(PlaceImage&{score:number})[]}[];let cursor=0;
  async function worker(){while(cursor<records.length){const record=records[cursor++];if(output[record.place.id])continue;let success=false;for(const candidate of record.candidates){if(!hasOpenPhotoLicense(candidate))continue;try{const filename=createHash('sha256').update(candidate.url).digest('hex').slice(0,24)+'.jpg';const local=`/images/places/${filename}`;if(!existsSync(`public${local}`))writeFileSync(`public${local}`,await publicImage(candidate.url));const {score,...metadata}=candidate;output[record.place.id]={...metadata,url:local};success=true;break;}catch{}}if(!success&&record.candidates.length)failed++;}}
  await Promise.all([worker(),worker(),worker()]);writeFileSync('shared/web-photo-candidates.json',JSON.stringify(output));writeFileSync(`data/web-photo-imported/${file}`,JSON.stringify({finishedAt:new Date().toISOString()}));batches++;console.log(`Imported ${file}: ${Object.keys(output).length} additional place photographs · ${failed} unavailable image sources`);
 }
 if(!process.argv.includes('--watch')||existsSync('data/web-photo-batches/DONE'))break;
 await new Promise(resolve=>setTimeout(resolve,3000));
}while(true);
console.log(JSON.stringify({photographs:Object.keys(output).length,batches,failed}));
