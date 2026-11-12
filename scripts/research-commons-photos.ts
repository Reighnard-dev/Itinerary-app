import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import type {Place,PlaceImage} from '../shared/types.js';
import {places as originals} from '../shared/catalog.js';
import {commonsPhoto,isNearby,normalName,plain,wikiRequest,type CommonsImage} from '../server/photo-search.js';
interface Candidate extends Omit<PlaceImage,'url'> {remoteUrl:string;score:number}
const all:Place[]=[...originals,...JSON.parse(readFileSync('shared/expanded-places.json','utf8'))];
const output:Record<string,Candidate>=existsSync('shared/researched-photo-candidates.json')?JSON.parse(readFileSync('shared/researched-photo-candidates.json','utf8')):{};
const groups=new Map<string,Place[]>();for(const place of all){const key=`${place.country}:${place.city}`;const group=groups.get(key)||[];group.push(place);groups.set(key,group);}
for(const [key,places] of groups){
 const city=places[0].city,country=places[0].country;const file=`data/sources/photos/city-bitmap-${createHash('sha256').update(key).digest('hex')}.json`;
 try{
  const params={action:'query',generator:'search',gsrnamespace:'6',gsrsearch:`"${city}" (restaurant OR cafe OR park OR garden OR museum OR temple OR beach) filetype:bitmap`,gsrlimit:'50',prop:'imageinfo|coordinates',iiprop:'url|mime|size|extmetadata',iiurlwidth:'640',iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|Categories|ImageDescription',colimit:'max'};
  const data=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):await wikiRequest<{query?:{pages:(CommonsImage&{coordinates?:{lat:number;lon:number}[]})[]}}>('commons.wikimedia.org',params);
  if(!existsSync(file))writeFileSync(file,JSON.stringify(data));
  for(const page of data.query?.pages||[]){
   const photo=commonsPhoto(page,'Exact Commons filename, destination and geographic match');if(!photo)continue;
   const title=normalName(page.title.replace(/^File:/,'')),description=normalName(plain(page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value||'')),location=normalName(city.replace(/ city$/i,''));
   for(const place of places){
    const name=normalName(place.name.replace(/\([^)]*\)/g,'').replace(/^the /i,''));if(name.length<8||!title.includes(name))continue;
    const near=isNearby(place,page.coordinates,2);if(!near&&!(title+' '+description).includes(location))continue;
    const looksLikeVenue=/\b(exterior|interior|facade|entrance|building|courtyard|garden|park|temple|museum|restaurant|beach)\b/.test(title);
    const score=(near?5:0)+(looksLikeVenue?3:0)+Math.min(3,name.length/15);
    if(!output[place.id]||output[place.id].score<score)output[place.id]={...photo,score};
   }
  }
  writeFileSync('shared/researched-photo-candidates.json',JSON.stringify(output));console.log(`${country} / ${city}: ${Object.keys(output).length} exact-name Commons candidates in total`);
 }catch(error){console.log(`Research paused at ${key}: ${(error as Error).message}`);break;}
}
