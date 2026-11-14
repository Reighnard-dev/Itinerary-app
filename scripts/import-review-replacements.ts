import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {commonsPhoto,wikiRequest,type CommonsImage} from '../server/photo-search.js';
import type {PlaceImage,Place} from '../shared/types.js';
const replacements:Record<string,{file:string;sourceUrl:string;reason:string}>=JSON.parse(readFileSync('research/photo-review-replacements.json','utf8'));
const manifest:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const identities:Record<string,NonNullable<Place['photoIdentity']>>=JSON.parse(readFileSync('shared/photo-identities.json','utf8'));
const requestedIds=new Set(process.argv.slice(2));
for(const [id,replacement] of Object.entries(replacements)){
 if(requestedIds.size&&!requestedIds.has(id))continue;
 const data=await wikiRequest<{query?:{pages:CommonsImage[]}}>('commons.wikimedia.org',{action:'query',titles:`File:${replacement.file}`,prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'500',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories|ImageDescription|DateTimeOriginal|Restrictions|Attribution|Copyright'});
 const photo=data.query?.pages.map(page=>commonsPhoto(page,'Named-site photograph selected after source and visual review')).find(Boolean);if(!photo)throw new Error(`No acceptable photograph: ${replacement.file}`);
 const name=createHash('sha256').update(photo.remoteUrl).digest('hex').slice(0,24)+'.jpg',file=`public/images/places/${name}`;
 if(!existsSync(file)){const response=await fetch(photo.remoteUrl,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed place thumbnail review)'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`${response.status}: ${replacement.file}`);writeFileSync(file,Buffer.from(await response.arrayBuffer()));}
 const {remoteUrl,...credit}=photo;manifest[id]={...credit,url:`/images/places/${name}`};identities[id]={...identities[id],commonsFile:replacement.file};
 console.log(JSON.stringify({id,file,source:photo.sourceUrl}));
}
writeFileSync('shared/place-images.json',JSON.stringify(manifest));writeFileSync('shared/photo-identities.json',JSON.stringify(identities));
