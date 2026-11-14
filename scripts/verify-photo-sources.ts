import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readdirSync} from 'node:fs';
import {wikiRequest,commonsPhoto,plain,photoNotices,type CommonsImage} from '../server/photo-search.js';
import type {PlaceImage} from '../shared/types.js';
const dir='research/rights/commons-evidence';mkdirSync(dir,{recursive:true});
const originals=new Map<string,PlaceImage>();
function add(p:PlaceImage){if(p?.sourceUrl?.startsWith('https://commons.wikimedia.org/wiki/File:'))originals.set(p.sourceUrl,p);}
for(const name of readdirSync('shared').filter(f=>/\.json(?:\.gz)?$/.test(f))){
 const bytes=readFileSync('shared/'+name);const data=JSON.parse((name.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 if(Array.isArray(data)){for(const p of data)if(p?.photo)add(p.photo);}
 else if(data&&typeof data==='object'){for(const p of Object.values(data))if(p&&typeof p==='object'&&'sourceUrl'in p&&'author'in p)add(p as PlaceImage);}
}
const titles=[...new Set([...originals.keys()].map(url=>{try{return 'File:'+decodeURIComponent(new URL(url).pathname.split('/wiki/File:')[1]).replaceAll('_',' ');}catch{return '';}}).filter(Boolean))];
const output:Record<string,{photo:Omit<PlaceImage,'url'>|null;evidence:string;reason?:string}>={};
async function requestGroup(group:string[]):Promise<any>{
 if(encodeURIComponent(group.join('|')).length>5500&&group.length>1){const mid=Math.floor(group.length/2),left=await requestGroup(group.slice(0,mid)),right=await requestGroup(group.slice(mid));return {query:{pages:[...(left.query?.pages||[]),...(right.query?.pages||[])],normalized:[...(left.query?.normalized||[]),...(right.query?.normalized||[])],redirects:[...(left.query?.redirects||[]),...(right.query?.redirects||[])]}};}
 return wikiRequest('commons.wikimedia.org',{action:'query',titles:group.join('|'),redirects:'1',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500'});
}
let done=0;
for(let i=0;i<titles.length;i+=50){
 const group=titles.slice(i,i+50),key=createHash('sha256').update(JSON.stringify(group)).digest('hex');const file=`${dir}/${key}.json`;
 const result=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):await requestGroup(group);
 if(!result.query?.pages)throw new Error('Source returned no file pages; no licenses were inferred.');
 if(!existsSync(file))writeFileSync(file,JSON.stringify({retrievedAt:new Date().toISOString(),...result},null,2));
 const pages=new Map<string,CommonsImage>(result.query.pages.map((p:CommonsImage)=>[p.title,p]));
 const aliases=new Map<string,string>([...(result.query.normalized||[]),...(result.query.redirects||[])].map((p:{from:string;to:string})=>[p.from,p.to]));
 for(const [url,original] of originals){
  let title='File:'+decodeURIComponent(new URL(url).pathname.split('/wiki/File:')[1]).replaceAll('_',' ');if(!group.includes(title))continue;
  for(let j=0;j<5&&aliases.has(title);j++)title=aliases.get(title)!;
  const page=pages.get(title),photo=page?commonsPhoto(page,original.match):null;
  const meta=page?.imageinfo?.[0]?.extmetadata||{};
  // Do not silently ignore additional restrictions or reproduce a file that
  // requires a separate rights assessment (e.g. non-free artwork/panorama).
  const restrictions=plain(meta.Restrictions?.value||'');
  const notices=photoNotices(meta,page?.imageinfo?.[0]?.descriptionurl||url);
  if(photo&&photo.author.length<=300&&!restrictions){const {remoteUrl,...credit}=photo;output[url]={photo:{...credit,notices},evidence:file};}
  else output[url]={photo:null,evidence:file,reason:restrictions?`Additional restrictions: ${restrictions}`:page?'Source metadata does not pass the commercial-photo policy':'Source file missing'};
 }
 done+=group.length;writeFileSync('research/rights/verified-photo-sources.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({checked:done,total:titles.length,accepted:Object.values(output).filter(r=>r.photo).length}));
}
writeFileSync('research/rights/photo-verification-summary.json',JSON.stringify({completedAt:new Date().toISOString(),sources:originals.size,checked:Object.keys(output).length,accepted:Object.values(output).filter(r=>r.photo).length},null,2)+'\n');
