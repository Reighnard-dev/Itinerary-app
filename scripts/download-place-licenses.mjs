import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {load} from 'cheerio';
mkdirSync('public/licenses',{recursive:true});
for(const [url,file] of [
 ['https://www.apache.org/licenses/LICENSE-2.0.txt','Apache-2.0.txt'],
 ['https://raw.githubusercontent.com/Community-Data-License-Agreements/Releases/main/CDLA-Permissive-2.0.txt','CDLA-Permissive-2.0.txt'],
]){const response=await fetch(url);if(!response.ok)throw new Error(`${file}: ${response.status}`);writeFileSync(`public/licenses/${file}`,await response.text());}
const response=await fetch('https://opensource.foursquare.com/places-notice-txt/');if(!response.ok)throw new Error(`Notice: ${response.status}`);
const $=load(await response.text());$('script,style,noscript').remove();const text=$('main').text().replace(/\s+/g,' ').trim();
if(!text.includes('Foursquare')||!text.includes('Apache'))throw new Error('Could not identify the provider notice.');
writeFileSync('public/licenses/Foursquare-NOTICE.txt',`${text}\n\nRoam changes: transformed from Overture Maps release 2026-10-21.0; filtered tourism and dining categories; matched coordinates to indexed destination cities; adapted display descriptions and categories. No fabricated review scores.\n`);
const heading='Overture Maps places data\n\nProviders: Overture Maps Foundation; Meta; Microsoft; Foursquare; AllThePlaces and other providers identified in each source feature.\n\nSource feature links preserve GERS IDs and expose each record source provenance. Roam selects tourism and dining categories, matches country/city coordinates, and adapts display descriptions. Existence confidence is not a traveler rating.\n\n';
writeFileSync('public/licenses/overture-places.txt',heading+['CDLA-Permissive-2.0.txt','Foursquare-NOTICE.txt','Apache-2.0.txt'].map(file=>readFileSync(`public/licenses/${file}`,'utf8')).join('\n\n'));
console.log('Saved dataset license bundle and provider notice.');
