import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {commonsPhoto,type CommonsImage} from '../server/photo-search.js';
import {places} from '../server/catalog.js';
const countries=new Set(['Pitcairn','Reunion','Saint Barthelemy','Saint Lucia','Sint Maarten','Turks and Caicos Islands','Tuvalu','Ukraine','United States Minor Outlying Islands','Wallis and Futuna']);
const manifest=JSON.parse(readFileSync('shared/place-images.json','utf8'));
const targets=new Set(places.filter(p=>countries.has(p.country)&&p.photo).map(p=>p.photo!.title));
const normalize=(s:string)=>s.replace(/^File:/,'').replaceAll('_',' ').normalize('NFC');
const wanted=new Set([...targets].map(normalize)),pages=new Map<string,CommonsImage>();
for(const file of readdirSync('data/sources/world-expansion/photos')){if(!file.endsWith('.json'))continue;const data=JSON.parse(readFileSync(`data/sources/world-expansion/photos/${file}`,'utf8'));for(const p of data.query?.pages||[])if(p.title?.startsWith('File:')&&wanted.has(normalize(p.title))&&p.imageinfo?.[0]?.extmetadata?.ImageDescription)pages.set(normalize(p.title),p);}
const exclusions=JSON.parse(readFileSync('shared/photo-exclusions.json','utf8'));
exclusions['Czernowitz. Israelitischer Tempel (08).jpg']='Visual review: archival postcard of the former synagogue; misleading as a current venue photograph.';
const rejected:string[]=[];for(const [title,page] of pages)if(!commonsPhoto(page,'Metadata review')){exclusions[page.title.replace(/^File:/,'')]='Full metadata review rejected a historical or non-photographic image.';rejected.push(title);}
for(const [id,photo] of Object.entries(manifest) as [string,{title:string}][])if(Object.keys(exclusions).some(title=>normalize(title)===normalize(photo.title)))delete manifest[id];
writeFileSync('shared/place-images.json',JSON.stringify(manifest,null,2)+'\n');writeFileSync('shared/photo-exclusions.json',JSON.stringify(exclusions,null,2)+'\n');
writeFileSync('research/final-ten-photo-review.json',JSON.stringify({checkedAt:new Date().toISOString(),targetFiles:targets.size,cachedFullMetadataChecked:pages.size,rejected,visualSamples:'15 images across all ten countries plus 20 Ukrainian images; samples overlap. Additional selected images reviewed individually.',manualRejection:'Czernowitz. Israelitischer Tempel (08).jpg',note:'Cached full metadata was checked where available. Individually selected replacements have separate source and metadata review. Visual review is a sample, not every file.'},null,2));console.log(JSON.stringify({targetFiles:targets.size,checked:pages.size,rejected:rejected.length}));
