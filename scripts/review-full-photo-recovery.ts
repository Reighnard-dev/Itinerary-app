import {readFileSync,writeFileSync,appendFileSync,renameSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {placeById} from '../server/catalog.js';
import {recoveryRejection} from '../server/photo-recovery-policy.js';
import {commonsPhoto} from '../server/photo-search.js';
const root='research/rights/full-photo-recovery',journal=root+'/outcomes.jsonl';
const rows=new Map<string,any>(),downloaded=new Set<string>();for(const line of readFileSync(journal,'utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);rows.set(row.id,row);if(row.photo?.url&&row.licenseEvidence?.startsWith(root+'/'))downloaded.add(row.photo.url);}
const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
const manifest=read('shared/place-images.json'),ledger=read('research/rights/asset-evidence.json');
const decisions=existsSync(root+'/visual-decisions.json')?read(root+'/visual-decisions.json'):{};
const rejected:any[]=[];mkdirSync('data/photo-review/rejected-recovery',{recursive:true});
for(const row of rows.values()){
 if(row.status!=='imported')continue;const p=placeById.get(row.id);if(!p)throw new Error('Unknown place '+row.id);
 const data=read(row.licenseEvidence).data,page=data.query.pages.find((page:any)=>page.title==='File:'+row.photo.title);if(!page)throw new Error('Missing evidence page');
 const decision=decisions[row.id],manual=typeof decision==='string'?decision:decision?.sourceUrl===row.photo.sourceUrl?decision.reason:undefined;
 const reason=manual||(!commonsPhoto(page,row.photo.match)?'source-policy-rejected':recoveryRejection(p,page));if(!reason)continue;
 if(manifest[row.id]?.url===row.photo.url)delete manifest[row.id];
 const result={...row,status:'visual-review-rejected',reason};rejected.push(result);appendFileSync(journal,JSON.stringify(result)+'\n');
}
// Remove only this recovery's newly downloaded, now-unreferenced files from
// public delivery. Retain them privately for evidence and possible re-review.
const used=new Set(Object.values(manifest).map((p:any)=>p.url));
function references(value:any):void{if(!value||typeof value!=='object')return;if(typeof value.url==='string')used.add(value.url);for(const item of Object.values(value))references(item);}
for(const file of readdirSync('shared').filter(f=>/\.json(?:\.gz)?$/.test(f)&&f!=='place-images.json')){const bytes=readFileSync('shared/'+file);references(JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8')));}
const approved=read('research/rights/approved-assets.json');let privatelyRetained=0;
for(const [url,e] of Object.entries(ledger) as [string,any][])if(e.evidence?.startsWith(root+'/'))downloaded.add(url);
for(const url of downloaded){
 if(used.has(url)||approved[url]||!/^\/images\/places\/[a-f0-9]{24}\.jpg$/.test(url))continue;
 const from='public'+url;if(!existsSync(from))continue;
 const sha256=createHash('sha256').update(readFileSync(from)).digest('hex');
 if(!url.endsWith('/'+sha256.slice(0,24)+'.jpg'))throw new Error('Recovery asset changed; review required: '+url);
 let to='data/photo-review/rejected-recovery/'+url.split('/').at(-1);
 if(existsSync(to)){if(createHash('sha256').update(readFileSync(to)).digest('hex')!==sha256)throw new Error('Private review asset collision: '+url);to='data/photo-review/rejected-recovery/'+sha256+'-'+Date.now()+'.jpg';}
 renameSync(from,to);delete ledger[url];privatelyRetained++;
}
writeFileSync('shared/place-images.json',JSON.stringify(manifest));writeFileSync('research/rights/asset-evidence.json',JSON.stringify(ledger,null,2)+'\n');writeFileSync(root+'/quality-review.json',JSON.stringify({checked:[...rows.values()].filter(r=>r.status==='imported').length,privatelyRetained,rejected},null,2)+'\n');console.log(JSON.stringify({privatelyRetained,rejected:rejected.map(r=>({name:r.name,reason:r.reason}))}));
