import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {commonsPhoto,wikiRequest,type CommonsImage} from '../server/photo-search.js';
import type {PlaceImage} from '../shared/types.js';
const dir='data/sources/world-expansion/photo-audit';mkdirSync(dir,{recursive:true});
const manifest:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const baseline:Record<string,PlaceImage>=JSON.parse(execFileSync('git',['show','HEAD:shared/place-images.json'],{encoding:'utf8',maxBuffer:20*1024*1024}));
const reviewed:Record<string,string>=JSON.parse(readFileSync('research/photo-review-rejections.json','utf8'));
const exclusions:Record<string,string>=JSON.parse(readFileSync('shared/photo-exclusions.json','utf8'));
Object.assign(exclusions,reviewed);
const byFile=new Map<string,string[]>();
for(const [id,photo] of Object.entries(manifest)){if(baseline[id]?.url===photo.url)continue;const group=byFile.get(photo.title)||[];group.push(id);byFile.set(photo.title,group);}
const files=[...byFile.keys()];const rejected:{file:string;ids:string[];reason:string}[]=[];let checked=0,failedBatches=0;
for(let i=0;i<files.length;i+=40){
 const batch=files.slice(i,i+40),cache=`${dir}/${createHash('sha256').update(batch.join('|')).digest('hex')}.json`;
 try{
  const data=existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:batch.map(file=>`File:${file}`).join('|'),prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories|ImageDescription|DateTimeOriginal|Restrictions|Attribution|Copyright'});
  writeFileSync(cache,JSON.stringify(data));
  for(const file of batch){
   const page=(data.query?.pages||[]).find((p:CommonsImage)=>p.title.replace(/^File:/,'').replaceAll('_',' ')===file.replaceAll('_',' '));
   if(!reviewed[file]&&(!page||commonsPhoto(page,'')))continue;
   const reason=reviewed[file]||'Full metadata review: archival, non-photographic, or no longer acceptable source/license metadata.';
   rejected.push({file,ids:byFile.get(file)!,reason});exclusions[file]=reason;for(const id of byFile.get(file)!)delete manifest[id];
  }
  checked+=batch.length;if(i%400===0)console.log(`Audited ${checked}/${files.length} new photo files; rejected ${rejected.length}`);
 }catch(error){failedBatches++;console.log(`Photo audit batch unavailable: ${(error as Error).message}`);}
}
writeFileSync('shared/photo-exclusions.json',JSON.stringify(exclusions));
writeFileSync('shared/place-images.auditing.json',JSON.stringify(manifest));renameSync('shared/place-images.auditing.json','shared/place-images.json');
writeFileSync('research/photo-metadata-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),requested:files.length,checked,failedBatches,rejectedCount:rejected.length,rejected,visualSampleCount:235,visualSampleCountries:124,note:'Metadata screening covers the checked files; visual review was a sample, not a review of every photograph.'},null,2));
console.log(JSON.stringify({checked,rejected:rejected.length,remainingManifestEntries:Object.keys(manifest).length}));
