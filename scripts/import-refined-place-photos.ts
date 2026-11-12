import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {places as originals} from '../shared/catalog.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {publicImage} from '../server/public-image-fetch.js';
// @ts-ignore The shared offline selector is a plain ES module.
import select from './select-image-search-results.mjs';
const places=new Map<string,Place>([...originals,...JSON.parse(readFileSync('shared/expanded-places.json','utf8'))].map((p:Place)=>[p.id,p]));
const output:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/web-photo-candidates.json','utf8'));
let imported=0;
for(const file of readdirSync('data/sources/image-search-refined')){const raw=JSON.parse(readFileSync(`data/sources/image-search-refined/${file}`,'utf8'));const place=places.get(raw.place.id);if(!place)continue;
 for(const candidate of select(raw.result,place))try{const local=`/images/places/${createHash('sha256').update(candidate.url).digest('hex').slice(0,24)}.jpg`;if(!existsSync(`public${local}`))writeFileSync(`public${local}`,await publicImage(candidate.url));const {score,...credit}=candidate;output[place.id]={...credit,url:local,match:'Refined exact-place search with source-page and photograph scene review'};imported++;console.log(`${place.name}: ${credit.title}`);break;}catch{}
}
writeFileSync('shared/web-photo-candidates.json',JSON.stringify(output));console.log(JSON.stringify({imported}));
