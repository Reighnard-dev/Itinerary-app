import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {commonsPhoto} from '../server/photo-search.js';
const root='research/rights/full-photo-recovery',read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const latest=new Map<string,any>();for(const line of readFileSync(root+'/outcomes.jsonl','utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);latest.set(row.id,row);}
const manifest=read('shared/place-images.json'),verified=read('research/rights/verified-photo-sources.json'),ledger=read('research/rights/asset-evidence.json');let restored=0;
for(const row of latest.values()){
 if(row.status!=='imported'||manifest[row.id])continue;
 const photo=row.photo;if(!/^\/images\/places\/[a-f0-9]{24}\.jpg$/.test(photo.url)||!existsSync('public'+photo.url))throw new Error('Checkpoint photo missing: '+row.id);
 const result=read(row.licenseEvidence).data,page=result.query?.pages.find((p:any)=>p.title==='File:'+photo.title),checked=page&&commonsPhoto(page,photo.match);
 if(!checked||!['title','author','sourceUrl','license','licenseUrl','notices'].every(k=>JSON.stringify(photo[k])===JSON.stringify((checked as any)[k])))throw new Error('Checkpoint source differs: '+row.id);
 const bytes=readFileSync('public'+photo.url),sha256=createHash('sha256').update(bytes).digest('hex');if(!photo.url.endsWith('/'+sha256.slice(0,24)+'.jpg')&&!(ledger[photo.url]?.sha256===sha256&&ledger[photo.url]?.sourceUrl===photo.sourceUrl))throw new Error('Checkpoint bytes changed: '+row.id);
 const {remoteUrl,...credit}=checked;
 if(verified[photo.sourceUrl]?.photo&&!['title','author','license','licenseUrl','notices'].every(k=>JSON.stringify(verified[photo.sourceUrl].photo[k])===JSON.stringify((credit as any)[k])))throw new Error('Existing source attribution differs');
 verified[photo.sourceUrl]={photo:credit,evidence:row.licenseEvidence};ledger[photo.url]={sha256,sourceUrl:photo.sourceUrl,evidence:row.licenseEvidence,downloadUrl:remoteUrl,basis:'Recovered an interrupted batch from its original post-download journal; source metadata and cryptographic filename checked against the original bytes'};manifest[row.id]=photo;restored++;
}
writeFileSync('research/rights/verified-photo-sources.json',JSON.stringify(verified,null,2)+'\n');writeFileSync('research/rights/asset-evidence.json',JSON.stringify(ledger,null,2)+'\n');writeFileSync('shared/place-images.json',JSON.stringify(manifest));console.log(JSON.stringify({restored}));
