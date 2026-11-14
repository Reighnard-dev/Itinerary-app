import {readFileSync,writeFileSync,readdirSync,statSync,existsSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {hasOpenPhotoLicense,reusablePhoto} from '../shared/photo-rights.js';
import type {PlaceImage} from '../shared/types.js';
const approved:Record<string,{sha256:string;kind:string;sourceUrl:string;evidence?:string}>=existsSync('research/rights/approved-assets.json')?JSON.parse(readFileSync('research/rights/approved-assets.json','utf8')):{};
const verified:Record<string,{photo:PlaceImage|null;evidence:string}>=existsSync('research/rights/verified-photo-sources.json')?JSON.parse(readFileSync('research/rights/verified-photo-sources.json','utf8')):{};
const verifiedSources=new Map(Object.values(verified).filter(v=>v.photo).map(v=>[v.photo!.sourceUrl,v]));
const records:{origin:string;id:string;photo:PlaceImage;status:string}[]=[],issues:string[]=[];
const datasets:{file:string;records:number;licenses:Record<string,number>;missingSource:number}[]=[];
function record(origin:string,id:string,photo:PlaceImage){const source=verifiedSources.get(photo.sourceUrl);const valid=Boolean(reusablePhoto(photo)&&source&&existsSync(source.evidence)&&['title','author','license','licenseUrl','notices'].every(k=>JSON.stringify(photo[k as keyof PlaceImage])===JSON.stringify(source.photo![k as keyof PlaceImage])));records.push({origin,id,photo,status:valid?'source-license-verified':'permission-or-evidence-needed'});if(!valid)issues.push(`${origin}:${id}: unverified photograph or altered attribution`);if(!existsSync('public'+photo.url))issues.push(`${origin}:${id}: missing local photo ${photo.url}`);}
const sourceLicenses:Record<string,string[]|undefined>={'Wikivoyage contributors':['CC BY-SA 4.0'],'GeoNames contributors':['CC BY 4.0'],'OpenStreetMap contributors':['ODbL 1.0'],'Wikidata contributors':['CC0 1.0'],'Overture Maps Foundation':['CDLA Permissive 2.0','CDLA 2.0 / Apache 2.0 / CC0']};
for(const file of readdirSync('shared').filter(f=>/\.json(?:\.gz)?$/.test(f))){
 const bytes=readFileSync('shared/'+file),data=JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 if(Array.isArray(data)&&data.some(p=>p?.country&&p?.city&&p?.description)){
  const licenses:Record<string,number>={};let missingSource=0;
  for(const p of data){const license=p.source?.license||'missing';licenses[license]=(licenses[license]||0)+1;
   if(!p.source?.url||!sourceLicenses[p.source.name]?.includes(license)){missingSource++;issues.push(`${file}:${p.id}: missing or unsupported dataset license`);}
   if(p.photo)record(file,p.id,p.photo);
  }datasets.push({file,records:data.length,licenses,missingSource});
 }else if(data&&typeof data==='object'&&!Array.isArray(data))for(const [id,p] of Object.entries(data))if(p&&typeof p==='object'&&'url'in p&&'license'in p&&'author'in p)record(file,id,p as PlaceImage);
}
const featured=JSON.parse(readFileSync('shared/featured-photos.json','utf8'));for(const [id,p] of Object.entries(featured.places))record('featured-photos.json',id,p as PlaceImage);for(const h of featured.heroes)record('hero',h.label,h.photo);if(featured.heroes.length<3)issues.push('Cleared hero photographs are missing');
const world=JSON.parse(readFileSync('shared/world-cities.json','utf8'));if(world.license!=='CC BY 4.0'||world.source!=='GeoNames')issues.push('Location index provenance is missing');
function walk(dir:string):string[]{return existsSync(dir)?readdirSync(dir).flatMap(name=>{const f=path.join(dir,name);return statSync(f).isDirectory()?walk(f):[f];}):[];}
const roots=['public',...(!process.argv.includes('--source-only')?['dist',...(process.env.STATIC_DIR?[process.env.STATIC_DIR]:[])]:[])];
const files=roots.flatMap(root=>walk(root).filter(f=>/\.(?:jpe?g|png|webp|gif|avif|svg|ttf|woff2?)$/i.test(f)).map(file=>{
 const url='/'+path.relative(root,file).replaceAll('\\','/'),sha256=createHash('sha256').update(readFileSync(file)).digest('hex'),entry=approved[url];const valid=entry?.sha256===sha256&&(!entry.evidence||existsSync(entry.evidence));
 if(!valid)issues.push(`Unapproved or changed public asset: ${file}`);return {file:file.replaceAll('\\','/'),url,sha256,status:valid?entry.kind:'unapproved-asset'};
}));
const dir=path.resolve(process.env.DATA_DIR||'data'),cachePath=path.join(dir,'roam.sqlite');
if(existsSync(cachePath)){
 const db=new DatabaseSync(cachePath,{readOnly:true});
 if(db.prepare("SELECT name FROM sqlite_master WHERE name='photo_cache'").get())for(const row of db.prepare('SELECT place_id,data FROM photo_cache').all()){
  try{const photo=JSON.parse(String(row.data));if(photo&&!reusablePhoto(photo))issues.push(`photo_cache:${row.place_id}: non-reusable legacy photo`);}catch{issues.push(`photo_cache:${row.place_id}: invalid record`);}
 }db.close();
}
for(const file of walk(path.join(dir,'photos')).filter(f=>/\.(?:jpe?g|png|webp)$/i.test(f))){
 const sidecar=file+'.rights.json';const evidence=existsSync(sidecar)?JSON.parse(readFileSync(sidecar,'utf8')):null;
 if(!evidence||!hasOpenPhotoLicense(evidence.photo)||evidence.sha256!==createHash('sha256').update(readFileSync(file)).digest('hex'))issues.push(`Unverified cached asset: ${file}`);
}
const missingSoftware=existsSync('research/rights/software-missing-notices.json')?JSON.parse(readFileSync('research/rights/software-missing-notices.json','utf8')).length:1;if(missingSoftware)issues.push(`Software packages without notices: ${missingSoftware}`);
const software=existsSync('research/rights/software-inventory.json')?JSON.parse(readFileSync('research/rights/software-inventory.json','utf8')):[];
const supportedSoftware=new Set(['MIT','ISC','Apache-2.0','0BSD','BSD-2-Clause','BSD-3-Clause','CC-BY-4.0','MPL-2.0']);
if(!software.length)issues.push('Software license inventory missing');
for(const pkg of software)if(!supportedSoftware.has(pkg.license))issues.push(`New software license needs review: ${pkg.name} ${pkg.license}`);
for(const required of ['public/credits.html','public/photo-credits.html','public/licenses/software-notices.txt','public/licenses/DM-Sans-OFL.txt','public/licenses/Manrope-OFL.txt','public/licenses/overture-places.txt','public/licenses/Foursquare-NOTICE.txt','public/licenses/Apache-2.0.txt','public/licenses/CDLA-Permissive-2.0.txt'])if(!existsSync(required))issues.push(`Required notice missing: ${required}`);
// Catch direct remote assets in browser code; map embeds/venue/source links are
// navigational references, not bundled copyrighted artwork.
for(const file of [...walk('src'),...walk('public')].filter(f=>/\.(?:tsx?|css|html)$/.test(f))){const content=readFileSync(file,'utf8');if(/(?:src\s*=\s*["']https?:\/\/|url\(\s*["']?https?:\/\/)/i.test(content))issues.push(`Direct remote asset requires review: ${file}`);}
const summary={photoRecords:records.length,verifiedPhotoRecords:records.filter(r=>r.status==='source-license-verified').length,permissionOrEvidenceNeeded:records.filter(r=>r.status!=='source-license-verified').length,assets:files.length,unapprovedAssets:files.filter(f=>f.status==='unapproved-asset').length,datasetRows:datasets.reduce((n,d)=>n+d.records,0),missingSoftwareNotices:missingSoftware,releaseIssues:issues.length};
mkdirSync('research/rights',{recursive:true});writeFileSync('research/rights/inventory.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Current shared datasets, public/build assets, active local photo cache, browser remote asset references, installed software notices. Private quarantine, Git history, user prose, remote deployments and Supabase state require separate handling.',summary,datasets,records,files},null,2));writeFileSync('research/rights/needs-review.json',JSON.stringify({issues,photos:records.filter(r=>r.status!=='source-license-verified'),assets:files.filter(f=>f.status==='unapproved-asset')},null,2));console.log(JSON.stringify(summary,null,2));if(issues.length)console.error(issues.slice(0,20).join('\n'));if(process.argv.includes('--release')&&issues.length)process.exitCode=1;
