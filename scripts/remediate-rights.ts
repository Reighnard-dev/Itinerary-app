import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,copyFileSync,renameSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {places as originals} from '../shared/catalog.js';
import {reusablePhoto} from '../shared/photo-rights.js';
import type {Place,PlaceImage} from '../shared/types.js';
const root=path.resolve('.'),quarantine=path.resolve('data/rights-quarantine');mkdirSync(quarantine,{recursive:true});
if(existsSync('research/rights/remediation.json'))throw new Error('Initial remediation already ran; use the incremental import/review workflow instead.');
if(!existsSync('research/rights/photo-verification-summary.json'))throw new Error('Complete source verification before remediating.');
const verified:Record<string,{photo:Omit<PlaceImage,'url'>|null;evidence:string;reason?:string}>=JSON.parse(readFileSync('research/rights/verified-photo-sources.json','utf8'));
const report={generatedAt:new Date().toISOString(),removedRecords:[] as {file:string;id:string;sourceUrl:string;reason:string}[],movedAssets:[] as {file:string;sha256:string}[],reusedExactPhotos:[] as string[]};
function backup(file:string){const target=path.join(quarantine,file);if(!existsSync(target)){mkdirSync(path.dirname(target),{recursive:true});copyFileSync(file,target);}}
function safeMove(file:string){const absolute=path.resolve(file),target=path.resolve(quarantine,file);if(!absolute.startsWith(root+path.sep)||!target.startsWith(quarantine+path.sep))throw new Error('Quarantine path outside workspace');mkdirSync(path.dirname(target),{recursive:true});const sha256=createHash('sha256').update(readFileSync(file)).digest('hex');if(existsSync(target))throw new Error(`Quarantine target already exists: ${target}`);renameSync(absolute,target);report.movedAssets.push({file,sha256});}
function clear(photo:PlaceImage|undefined,file:string,id:string){
 if(!photo)return undefined;const result=verified[photo.sourceUrl];const next=result?.photo?{...result.photo,url:photo.url}:undefined;
 if(next&&reusablePhoto(next)&&existsSync('public'+next.url))return next;
 report.removedRecords.push({file,id,sourceUrl:photo.sourceUrl,reason:result?.reason||'No verified commercial reuse evidence'});return undefined;
}
const manifestNames=['web-photo-candidates.json','venue-photo-candidates.json','entity-photo-candidates.json','place-images.json'];
const photos:Record<string,PlaceImage>={};
const retainedManifestPhotos:PlaceImage[]=[];
for(const name of manifestNames){const file='shared/'+name;backup(file);const data=JSON.parse(readFileSync(file,'utf8')),clean:Record<string,PlaceImage>={};for(const [id,p] of Object.entries(data)){const photo=clear(p as PlaceImage,file,id);if(photo){clean[id]=photo;photos[id]=photo;retainedManifestPhotos.push(photo);}}writeFileSync(file,JSON.stringify(clean)+'\n');}
const all:Place[]=[...originals];
for(const name of readdirSync('shared').filter(f=>/\.json(?:\.gz)?$/.test(f))){
 const file='shared/'+name,bytes=readFileSync(file),data=JSON.parse((name.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 if(!Array.isArray(data)||!data.some(p=>p?.country&&p?.city&&p?.description))continue;
 let changed=false;const clean:Place[]=[];
 for(const p of data as Place[]){
  // This single directory entry had no reuse license for its prose. Keep the
  // research privately rather than invent a license for a venue website.
  if(p.source&&!p.source.license){changed=true;report.removedRecords.push({file,id:p.id,sourceUrl:p.source.url,reason:'Unlicensed source prose; listing quarantined'});continue;}
  if(p.photo){const photo=clear(p.photo,file,p.id);if(photo)p.photo=photo;else delete p.photo;changed=true;}
  if(p.image!=='/images/photo-unavailable.svg'){p.image='/images/photo-unavailable.svg';changed=true;}
  clean.push(p);
 }
 for(const p of clean)all.push(p);
 if(changed){backup(file);const json=JSON.stringify(clean)+'\n';writeFileSync(file,name.endsWith('.gz')?gzipSync(json):json);}
}
// Reuse a cleared photograph only for the same named place within 500 metres.
const key=(p:Place)=>p.country+':'+p.name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const candidates=new Map<string,Place[]>();
for(const p of all){const photo=photos[p.id]||p.photo;if(photo){const list=candidates.get(key(p))||[];list.push({...p,photo});candidates.set(key(p),list);}}
for(const p of all){if(photos[p.id]||p.photo)continue;const match=candidates.get(key(p))?.find(c=>Math.hypot(c.lat-p.lat,(c.lng-p.lng)*Math.cos(p.lat*Math.PI/180))*111<0.5);if(match?.photo){photos[p.id]=match.photo;report.reusedExactPhotos.push(p.id);}}
// Store recovered exact matches in the main, attributed index.
const main=JSON.parse(readFileSync('shared/place-images.json','utf8'));for(const id of report.reusedExactPhotos)main[id]=photos[id];writeFileSync('shared/place-images.json',JSON.stringify(main)+'\n');
const featured:Record<string,PlaceImage>={};for(const p of originals)if(photos[p.id])featured[p.id]=photos[p.id];
const heroPlaces=['kyoto-1','tokyo-2','paris-1','bali-2','rome-1','interlaken-1','bangkok-1','cebu-1','kyoto-2','rome-2'].map(id=>all.find(p=>p.id===id)).filter((p):p is Place=>Boolean(p&&photos[p.id]));
if(heroPlaces.length<3)throw new Error('Not enough cleared hero photographs.');
const heroes=heroPlaces.map(p=>({image:photos[p.id].url,label:`${p.name}, ${p.city}`,photo:photos[p.id],credit:{label:`${photos[p.id].author} · ${photos[p.id].license}`,url:photos[p.id].sourceUrl,licenseUrl:photos[p.id].licenseUrl}}));
writeFileSync('shared/featured-photos.json',JSON.stringify({places:featured,heroes},null,2)+'\n');
// Remove all stale local photo-cache records. New downloads require current
// license checks. Account/trip rows remain untouched and are filtered at use.
const dbFile=path.resolve(process.env.DATA_DIR||'data','roam.sqlite');
if(existsSync(dbFile)){const db=new DatabaseSync(dbFile);if(db.prepare("SELECT name FROM sqlite_master WHERE name='photo_cache'").get())db.exec('DELETE FROM photo_cache');db.close();}
function walk(dir:string):string[]{return existsSync(dir)?readdirSync(dir).flatMap(n=>{const f=path.join(dir,n);return statSync(f).isDirectory()?walk(f):[f];}):[];}
const acceptedUrls=new Set([...retainedManifestPhotos,...Object.values(photos),...all.flatMap(p=>p.photo?[p.photo]:[])].map(p=>p.url));
for(const f of [...walk('public/images'),...walk('public/illustrations'),...walk('data/photos'),...walk('public/fonts')].filter(f=>/\.(?:jpe?g|png|webp|gif|avif|svg|ttf|woff2?)$/i.test(f))){
 const url='/'+f.replaceAll('\\','/').slice(7);
 if(!acceptedUrls.has(url)&&!f.endsWith('-variable.ttf')&&!f.endsWith('photo-unavailable.svg'))safeMove(f);
}
// Newly authored geometric/text assets contain no third-party illustration.
writeFileSync('public/images/photo-unavailable.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#eeeae1"/><text x="400" y="305" text-anchor="middle" fill="#756f63" font-family="sans-serif" font-size="24">Photo unavailable</text></svg>\n');
backup('public/fallback.svg');writeFileSync('public/fallback.svg',readFileSync('public/images/photo-unavailable.svg'));
backup('public/favicon.svg');writeFileSync('public/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="#f5cd3c"/><path d="M16 35V13h10a7 7 0 0 1 0 14H16m9 0 8 8" fill="none" stroke="#262923" stroke-width="4"/></svg>\n');
writeFileSync('research/rights/remediation.json',JSON.stringify(report,null,2)+'\n');
// Bind the checked source records to the exact pre-existing downloaded bytes.
// Future builds must not silently bless a different image under the same URL.
const ledger:Record<string,{sha256:string;sourceUrl:string;evidence:string;basis:string}>={};
const verifiedBySource=new Map(Object.values(verified).filter(v=>v.photo).map(v=>[v.photo!.sourceUrl,v]));
for(const photo of [...retainedManifestPhotos,...Object.values(photos),...all.flatMap(p=>p.photo?[p.photo]:[])]){if(ledger[photo.url])continue;const source=verifiedBySource.get(photo.sourceUrl);if(!source)throw new Error(`Missing source evidence ${photo.url}`);ledger[photo.url]={sha256:createHash('sha256').update(readFileSync('public'+photo.url)).digest('hex'),sourceUrl:photo.sourceUrl,evidence:source.evidence,basis:'Existing download/import manifest matched to live Wikimedia source metadata; retained bytes hashed during remediation'};}
for(const url of ['/favicon.svg','/fallback.svg','/images/photo-unavailable.svg'])ledger[url]={sha256:createHash('sha256').update(readFileSync('public'+url)).digest('hex'),sourceUrl:'scripts/remediate-rights.ts',evidence:'scripts/remediate-rights.ts',basis:'Newly authored geometry and text'};
writeFileSync('research/rights/asset-evidence.json',JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({removedRecords:report.removedRecords.length,quarantinedAssets:report.movedAssets.length,reusedExactPhotos:report.reusedExactPhotos.length,featuredPhotos:Object.keys(featured).length,heroPhotos:heroes.length}));
