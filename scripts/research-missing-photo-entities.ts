import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {places} from '../server/catalog.js';
import {isNearby,isExcludedPhotoTitle} from '../server/photo-search.js';
const root='research/rights/full-photo-recovery';mkdirSync(root+'/knowledge-requests',{recursive:true});
const groups=new Map<string,typeof places>();for(const p of places){if(p.photo)continue;const group=groups.get(p.name)||[];group.push(p);groups.set(p.name,group);}
const namesFile=root+'/knowledge-names.json';
if(!existsSync(namesFile)){
 const inventory=JSON.parse(readFileSync(root+'/inventory.json','utf8')),baseline=[...new Set<string>(inventory.places.map((p:any)=>p.name))],positions=new Map(baseline.map((n,i)=>[n,i]));
 const cachedBatches=readdirSync(root+'/knowledge-requests').filter(f=>f.endsWith('.json')).map(f=>{const q=JSON.parse(readFileSync(root+'/knowledge-requests/'+f,'utf8')).query as string;return [...q.matchAll(/("(?:[^"\\]|\\.)*")@en/g)].map(m=>JSON.parse(m[1]) as string);}).filter(batch=>batch.length===5000).sort((a,b)=>(positions.get(a[0])??Infinity)-(positions.get(b[0])??Infinity));
 const checkedNames=cachedBatches.flat(),seen=new Set(checkedNames);writeFileSync(namesFile,JSON.stringify([...checkedNames,...baseline.filter(n=>!seen.has(n))]));
}
const names:string[]=JSON.parse(readFileSync(namesFile,'utf8')),candidates:Record<string,unknown>=existsSync(root+'/knowledge-candidates.json')?JSON.parse(readFileSync(root+'/knowledge-candidates.json','utf8')):{};let checked=0;
for(let offset=0;offset<names.length;offset+=5000){
 const batch=names.slice(offset,offset+5000);
 const query='PREFIX wdt:<http://www.wikidata.org/prop/direct/> PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> SELECT ?item ?wanted ?coordinate ?image WHERE { VALUES ?wanted { '+batch.map(n=>JSON.stringify(n)+'@en').join(' ')+' } ?item rdfs:label ?wanted; wdt:P625 ?coordinate; wdt:P18 ?image. }';
 const evidence=root+'/knowledge-requests/'+createHash('sha256').update(query).digest('hex')+'.json';
 let data:any;const cached=existsSync(evidence);
 if(cached)data=JSON.parse(readFileSync(evidence,'utf8')).data;
 else{
  let response:Response|undefined;
  for(let attempt=0;attempt<3;attempt++){
   response=await fetch('https://qlever.dev/api/wikidata',{method:'POST',body:new URLSearchParams({query,format:'json'}),headers:{Accept:'application/sparql-results+json','User-Agent':'RoamItinerary/1.0 (attributed landmark photo identity research)'},signal:AbortSignal.timeout(60000)});
   if(response.status!==429&&response.status!==503)break;
   const delay=Math.max(60000,(Number(response.headers.get('retry-after'))||60)*1000);const body=(await response.text()).slice(0,1200).replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g,'[network address redacted]');writeFileSync(root+'/knowledge-backoff.json',JSON.stringify({checkedAt:new Date().toISOString(),status:response.status,retryAfterSeconds:delay/1000,message:body}));console.log(JSON.stringify({sourceBusy:response.status,retryAfterSeconds:delay/1000}));if(attempt<2)await new Promise(resolve=>setTimeout(resolve,delay));
  }
  if(!response)throw new Error('No knowledge response');
  if(!response.ok)throw new Error('Knowledge endpoint returned '+response.status);data=await response.json();
  if(!data.results?.bindings)throw new Error('Knowledge endpoint returned no result table');
  writeFileSync(evidence,JSON.stringify({retrievedAt:new Date().toISOString(),endpoint:'https://qlever.dev/api/wikidata',query,data}));
 }
 for(const row of data.results.bindings){const point=row.coordinate?.value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i),raw=row.image?.value.split('/Special:FilePath/')[1];if(!point||!raw)continue;const file=decodeURIComponent(raw);if(isExcludedPhotoTitle(file))continue;
  for(const p of groups.get(row.wanted.value)||[]){if(candidates[p.id]||!isNearby(p,[{lat:Number(point[2]),lon:Number(point[1])}],0.5))continue;candidates[p.id]={file,match:'Exact English Wikidata label and coordinates within 500 metres of the listing',identityEvidence:evidence,wikidataId:row.item.value.split('/').at(-1)};}
 }
 checked+=batch.length;writeFileSync(root+'/knowledge-candidates.json',JSON.stringify(candidates));writeFileSync(root+'/knowledge-progress.json',JSON.stringify({checked,total:names.length,candidates:Object.keys(candidates).length,complete:checked===names.length}));console.log(JSON.stringify({checked,total:names.length,candidates:Object.keys(candidates).length}));
 if(!cached)await new Promise(resolve=>setTimeout(resolve,10000));
}
