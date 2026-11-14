// Resume the byte-ledger stage only; never changes manifests or moves files.
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import type {PlaceImage} from '../shared/types.js';
if(existsSync('research/rights/asset-evidence.json'))throw new Error('Asset evidence already exists; do not re-approve changed bytes.');
if(!existsSync('research/rights/remediation.json'))throw new Error('Remediation must complete first.');
const verification=JSON.parse(readFileSync('research/rights/verified-photo-sources.json','utf8'));
const sources=new Map<string,{photo:PlaceImage;evidence:string}>(Object.values(verification).filter((v:any)=>v.photo).map((v:any)=>[v.photo.sourceUrl,v]));
const photos=new Map<string,PlaceImage>();
function add(p:PlaceImage){photos.set(p.url,p);}
for(const name of readdirSync('shared').filter(f=>/\.json(?:\.gz)?$/.test(f))){const bytes=readFileSync('shared/'+name),data=JSON.parse((name.endsWith('.gz')?gunzipSync(bytes):bytes).toString());if(Array.isArray(data)){for(const p of data)if(p?.photo)add(p.photo);}else if(data&&typeof data==='object'){for(const p of Object.values(data))if(p&&typeof p==='object'&&'url'in p&&'author'in p)add(p as PlaceImage);}}
const ledger:Record<string,unknown>={};
for(const [url,p] of photos){const source=sources.get(p.sourceUrl);if(!source)throw new Error(`Missing source ${url}`);ledger[url]={sha256:createHash('sha256').update(readFileSync('public'+url)).digest('hex'),sourceUrl:p.sourceUrl,evidence:source.evidence,basis:'Existing download/import manifest matched to live Wikimedia source metadata; retained bytes hashed during remediation'};}
for(const url of ['/favicon.svg','/fallback.svg','/images/photo-unavailable.svg'])ledger[url]={sha256:createHash('sha256').update(readFileSync('public'+url)).digest('hex'),sourceUrl:'scripts/remediate-rights.ts',evidence:'scripts/remediate-rights.ts',basis:'Newly authored geometry and text'};
writeFileSync('research/rights/asset-evidence.json',JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify({assets:Object.keys(ledger).length}));
