// Enrich retained notices from existing source snapshots; no new permissions,
// files, authors or license labels are inferred, and no bytes are re-approved.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {photoNotices,type CommonsImage} from '../server/photo-search.js';
import type {PlaceImage} from '../shared/types.js';
const file='research/rights/verified-photo-sources.json',verified=JSON.parse(readFileSync(file,'utf8'));
const pageBySource=new Map<string,CommonsImage>();
for(const f of readdirSync('research/rights/commons-evidence')){const d=JSON.parse(readFileSync('research/rights/commons-evidence/'+f,'utf8'));for(const page of d.query?.pages||[])if(page.imageinfo?.[0]?.descriptionurl)pageBySource.set(page.imageinfo[0].descriptionurl,page);}
const noticesBySource=new Map<string,string[]>();
for(const v of Object.values(verified) as {photo:PlaceImage|null}[]){if(!v.photo)continue;const page=pageBySource.get(v.photo.sourceUrl);if(!page)throw new Error(`Missing source snapshot ${v.photo.sourceUrl}`);v.photo.notices=photoNotices(page.imageinfo![0].extmetadata||{},v.photo.sourceUrl);noticesBySource.set(v.photo.sourceUrl,v.photo.notices);}
writeFileSync(file,JSON.stringify(verified,null,2)+'\n');
function update(p:any){if(p?.author&&p?.sourceUrl&&noticesBySource.has(p.sourceUrl))p.notices=noticesBySource.get(p.sourceUrl);}
for(const f of readdirSync('shared').filter(f=>/\.json(?:\.gz)?$/.test(f))){const bytes=readFileSync('shared/'+f),data=JSON.parse((f.endsWith('.gz')?gunzipSync(bytes):bytes).toString());let changed=false;
 if(Array.isArray(data)){for(const p of data)if(p?.photo){update(p.photo);changed=true;}}
 else if(data&&typeof data==='object'){for(const p of Object.values(data))if(p&&typeof p==='object'&&'author'in p){update(p);changed=true;}}
 if(f==='featured-photos.json'){for(const p of Object.values(data.places))update(p);for(const hero of data.heroes)update(hero.photo);changed=true;}
 if(changed){const json=JSON.stringify(data)+'\n';writeFileSync('shared/'+f,f.endsWith('.gz')?gzipSync(json):json);}
}
console.log(JSON.stringify({sourcesWithRetainedNoticeLinks:noticesBySource.size}));
