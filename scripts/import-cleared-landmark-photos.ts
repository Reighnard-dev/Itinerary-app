import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {wikiRequest,commonsPhoto,type CommonsImage} from '../server/photo-search.js';
import {places,placeById} from '../server/catalog.js';
import type {PlaceImage} from '../shared/types.js';
const selectionFile=process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'research/rights/landmark-photo-selections.json';
const apply=process.argv.includes('--apply');
const selections: {id:string;file:string;identityEvidence:string}[]=JSON.parse(readFileSync(selectionFile,'utf8'));
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const manifest:Record<string,PlaceImage>=read('shared/place-images.json');
const verified=read('research/rights/verified-photo-sources.json'),ledger=read('research/rights/asset-evidence.json');
const reportFile='research/rights/landmark-photo-import.json',report=existsSync(reportFile)?read(reportFile):{};
async function save(file:string,value:unknown,pretty=true){
 const temporary=file+'.photo-import.tmp';writeFileSync(temporary,JSON.stringify(value,null,pretty?2:undefined)+(pretty?'\n':''));
 for(let attempt=0;;attempt++){try{renameSync(temporary,file);return;}catch(error){if(attempt>=15)throw error;await new Promise(resolve=>setTimeout(resolve,200));}}
}
mkdirSync('data/photo-review',{recursive:true});
mkdirSync('research/rights/commons-evidence',{recursive:true});
for(const selection of selections){
 const place=placeById.get(selection.id);if(!place||selection.identityEvidence.length<25)throw new Error('Missing landmark identity evidence: '+selection.id);
 const key=createHash('sha256').update(selection.file).digest('hex');
 const evidence=`research/rights/commons-evidence/landmark-${key}.json`;
 const data=existsSync(evidence)?read(evidence):await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:'File:'+selection.file,redirects:'1',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'800'});
 if(!existsSync(evidence))writeFileSync(evidence,JSON.stringify({retrievedAt:new Date().toISOString(),...data},null,2)+'\n');
 const page=data.query?.pages?.find((p:CommonsImage)=>p.imageinfo),photo=page&&commonsPhoto(page,selection.identityEvidence);
 if(!photo)throw new Error('Source does not pass the photo license policy: '+selection.file);
 const preview=`data/photo-review/${selection.id}-${key.slice(0,8)}.jpg`;
 const receiptFile=preview+'.json';
 if(!existsSync(preview)||!existsSync(receiptFile)){
  const response=await fetch(photo.remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed landmark photo import)'},signal:AbortSignal.timeout(30000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Download failed: '+selection.file+' '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1500||bytes.length>5000000)throw new Error('Unexpected image size');writeFileSync(preview,bytes);
  writeFileSync(receiptFile,JSON.stringify({remoteUrl:photo.remoteUrl,sha256:createHash('sha256').update(bytes).digest('hex'),retrievedAt:new Date().toISOString()},null,2)+'\n');
 }
 const bytes=readFileSync(preview),sha256=createHash('sha256').update(bytes).digest('hex');
 const receipt=read(receiptFile);if(receipt.remoteUrl!==photo.remoteUrl||receipt.sha256!==sha256)throw new Error('Preview bytes or source changed; review required: '+selection.id);
 const url='/images/places/'+sha256.slice(0,24)+'.jpg';
 const {remoteUrl,...credit}=photo;
 if(apply){
  if(existsSync('public'+url)&&createHash('sha256').update(readFileSync('public'+url)).digest('hex')!==sha256)throw new Error('Refusing to overwrite changed image');
  writeFileSync('public'+url,bytes);
  verified[photo.sourceUrl]={photo:credit,evidence};
  ledger[url]={sha256,sourceUrl:photo.sourceUrl,evidence,basis:'Downloaded from the Wikimedia image URL in the retained API response; landmark identity and preview reviewed',downloadUrl:remoteUrl};
  manifest[place.id]={...credit,url};
  report[place.id]={name:place.name,city:place.city,country:place.country,photo:manifest[place.id],evidence,identityEvidence:selection.identityEvidence,importedAt:new Date().toISOString()};
  // Checkpoint each successful import; interruptions retain all evidence.
  await save('research/rights/verified-photo-sources.json',verified);
  await save('research/rights/asset-evidence.json',ledger);
  await save('shared/place-images.json',manifest,false);
  await save(reportFile,report);
 }
 console.log(JSON.stringify({id:place.id,name:place.name,preview,source:photo.sourceUrl,license:photo.license,applied:apply}));
}
console.log(JSON.stringify({imported:Object.keys(report).length,catalogPlaces:places.length,mode:apply?'imported':'preview only'}));
