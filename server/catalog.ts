import {places as handpicked} from '../shared/catalog.js';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {Place} from '../shared/types.js';
import type {PlaceImage} from '../shared/types.js';
import {cityDistance} from './world.js';
import {gunzipSync} from 'node:zlib';
import {isExcludedPhotoTitle} from './photo-search.js';
import {reusablePhoto} from '../shared/photo-rights.js';
// Keep bulk data out of TypeScript's inferred JSON types and the browser bundle.
// The server is launched from the project root, as are the other data services.
const readData=<T,>(file:string):T=>{const bytes=readFileSync(path.resolve('shared',file));return JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8'));};
const imported=readData<Place[]>('expanded-places.json'),researched=readData<Place[]>('researched-places.json'),mapped=readData<Place[]>('map-places.json'),geographic=readData<Place[]>('geographic-places.json');
const overture=readData<Place[]>('overture-places.json.gz');
const knowledge=readData<Place[]>('knowledge-places.json');
// Sa Pa includes locally stored, credited photographs and dining listings.
const sapa=readData<Place[]>('sapa-places.json');
const photos=Object.assign({},...['web-photo-candidates.json','venue-photo-candidates.json','entity-photo-candidates.json','place-images.json'].map(file=>readData<Record<string,PlaceImage>>(file))) as Record<string,PlaceImage>;
const identities=readData<Record<string,NonNullable<Place['photoIdentity']>>>('photo-identities.json');
const key=(p:Place)=>`${p.country}:${p.city}:${p.name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')}`;
const known=new Map<string,Place[]>(),aliases=new Map<string,Place[]>();
const aliasKey=(p:Place)=>`${p.country}:${p.city}:${p.name.normalize('NFKD').toLowerCase().replace(/\bbotanical\b/g,'botanic').replace(/\b(national|the)\b/g,'').replace(/[^\p{L}\p{N}]/gu,'')}`;
export const places:Place[]=[];
for(const raw of [...handpicked,...sapa,...imported,...researched,...knowledge,...mapped,...overture,...geographic]){
 const photo=reusablePhoto(photos[raw.id])||reusablePhoto(raw.photo);
 const {photo:ignoredPhoto,...fields}=raw;
 const place:Place={...fields,...(photo&&!isExcludedPhotoTitle(photo.title)?{photo}:{}),...(identities[raw.id]?{photoIdentity:{...raw.photoIdentity,...identities[raw.id]}}:{})};
 const identity=key(place),alias=aliasKey(place);
 const radius=['Parks & gardens','Nature'].includes(place.category)&&place.name.length>12?3:0.5;
 const previous=(known.get(identity)||[]).find(p=>cityDistance(p,place)<radius)||(aliases.get(alias)||[]).find(p=>cityDistance(p,place)<0.5);
 if(previous){
  if(!previous.photo&&place.photo)previous.photo=place.photo;
  if(place.photoIdentity)previous.photoIdentity={...place.photoIdentity,...previous.photoIdentity};
  continue;
 }
 const exact=known.get(identity)||[];exact.push(place);known.set(identity,exact);const group=aliases.get(alias)||[];group.push(place);aliases.set(alias,group);places.push(place);
}
// Construction maps and parsed source objects are unnecessary once the merged
// catalog is ready; release them before serving hundreds of thousands of rows.
known.clear();aliases.clear();
for(const source of [sapa,imported,researched,knowledge,mapped,overture,geographic])source.length=0;
export const placeById=new Map(places.map(place=>[place.id,place]));
export const placesByCity=new Map<string,Place[]>();
for(const place of places){const key=JSON.stringify([place.country,place.city]),group=placesByCity.get(key)||[];group.push(place);placesByCity.set(key,group);}
