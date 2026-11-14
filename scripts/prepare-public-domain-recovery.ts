import {readFileSync,writeFileSync} from 'node:fs';
import {places} from '../server/catalog.js';
import {normalName,plain,type CommonsImage} from '../server/photo-search.js';
const root='research/rights/full-photo-recovery',rows=new Map<string,any>();
for(const line of readFileSync(root+'/outcomes.jsonl','utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);rows.set(row.id,row);}
const knowledge=JSON.parse(readFileSync(root+'/knowledge-candidates.json','utf8')),candidates:Record<string,unknown>={};
for(const p of places){if(p.photo)continue;const row=rows.get(p.id);if(row?.status!=='source-not-reusable'||!row.evidence)continue;
 const data=JSON.parse(readFileSync(row.evidence,'utf8')).data,page=data.query?.pages?.find((page:CommonsImage)=>normalName(page.title.replace(/^File:/,''))===normalName(row.file)),meta=page?.imageinfo?.[0]?.extmetadata||{};
 if(meta.LicenseShortName?.value!=='Public domain'||meta.LicenseUrl?.value||meta.Copyrighted?.value!=='False'||!/^own work\b/i.test(plain(meta.Credit?.value||''))||!meta.Artist?.value||/unknown author|anonymous/i.test(plain(meta.Artist.value)))continue;
 candidates[p.id]={file:row.file,match:'Previously matched place; creator public-domain dedication checked against its source revision',identityEvidence:row.identityEvidence||knowledge[p.id]?.identityEvidence||p.source?.url||p.id};
}
writeFileSync(root+'/pd-candidates.json',JSON.stringify(candidates));console.log(JSON.stringify({candidates:Object.keys(candidates).length}));
