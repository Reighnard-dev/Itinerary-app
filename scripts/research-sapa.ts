import {writeFileSync,mkdirSync} from 'node:fs';
import {fetchGuidePage,parseGuidePage} from '../server/travel-guide.js';
mkdirSync('data/sapa',{recursive:true});
const guide=await fetchGuidePage('Sa Pa');
if(guide){writeFileSync('data/sapa/guide.json',JSON.stringify(guide));const places=parseGuidePage(guide,'Vietnam','Sa Pa');writeFileSync('data/sapa/guide-places.json',JSON.stringify(places));console.log('Guide places',places.length);}
const query='[out:json][timeout:90];nwr(around:20000,22.34023,103.84415)[name][tourism];out center tags; nwr(around:12000,22.34023,103.84415)[name][amenity~"restaurant|cafe|bar|marketplace"];out center tags; nwr(around:12000,22.34023,103.84415)[name][shop];out center tags; nwr(around:20000,22.34023,103.84415)[name][natural~"peak|waterfall|water"];out center tags; nwr(around:12000,22.34023,103.84415)[name][leisure~"park|garden"];out center tags;';
const r=await fetch('https://overpass.private.coffee/api/interpreter?'+new URLSearchParams({data:query}),{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('OSM '+r.status);const data=await r.json();writeFileSync('data/sapa/osm.json',JSON.stringify(data));console.log('OSM places',data.elements.length);
