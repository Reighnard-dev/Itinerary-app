import {readFileSync,writeFileSync} from 'node:fs';
import {geoCity,cityDistance} from '../server/world.js';
import type {Place} from '../shared/types.js';
const selections=JSON.parse(readFileSync('research/verified-landmark-additions.json','utf8')) as {wikidataId:string;country:string;city:string;category:Place['category'];description:string}[];
const query=`PREFIX wd:<http://www.wikidata.org/entity/> PREFIX wdt:<http://www.wikidata.org/prop/direct/> PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> SELECT ?item ?label ?coordinate ?image WHERE { VALUES ?item { ${selections.map(p=>'wd:'+p.wikidataId).join(' ')} } ?item rdfs:label ?label;wdt:P625 ?coordinate. FILTER(LANG(?label)="en") OPTIONAL { ?item wdt:P18 ?image } }`;
const response=await fetch(`https://qlever.dev/api/wikidata?${new URLSearchParams({query,format:'json'})}`,{headers:{Accept:'application/sparql-results+json','User-Agent':'RoamItinerary/1.0 (verified landmark research)'},signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`Knowledge source returned ${response.status}`);
const data=await response.json() as {results:{bindings:{item:{value:string};label:{value:string};coordinate:{value:string};image?:{value:string}}[]}};
const places:Place[]=JSON.parse(readFileSync('shared/knowledge-places.json','utf8'));
for(const selection of selections){
 const entity=data.results.bindings.find(row=>row.item.value.endsWith('/'+selection.wikidataId)),name=entity?.label.value,coordinates=entity?.coordinate.value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i),point=coordinates?{latitude:Number(coordinates[2]),longitude:Number(coordinates[1])}:undefined;
 const center=geoCity(selection.country,selection.city);if(!name||!point||!center||cityDistance(center,{lat:point.latitude,lng:point.longitude})>20)throw new Error(`No nearby verified entity: ${selection.wikidataId}`);
 const encodedFile=entity?.image?.value.split('/Special:FilePath/')[1],file=encodedFile?decodeURIComponent(encodedFile):undefined;
 const place:Place={id:`wikidata-${selection.wikidataId}`,name,country:selection.country,city:selection.city,category:selection.category,kind:'local',description:selection.description,image:'/illustrations/culture.svg',lat:point.latitude,lng:point.longitude,rating:null,duration:'1–2 hours',price:'Confirm current visitor prices',bestTime:'Confirm visitor hours',transit:'Check current public transport directions from your starting point.',driving:'Check current directions, parking, and visitor access.',source:{name:'Wikidata contributors',url:`https://www.wikidata.org/wiki/${selection.wikidataId}`,retrievedAt:new Date().toISOString(),license:'CC0 1.0'},photoIdentity:{wikidataId:selection.wikidataId,...(typeof file==='string'?{commonsFile:file}:{})}};
 const existing=places.findIndex(p=>p.id===place.id);if(existing<0)places.push(place);else places[existing]=place;
 console.log(JSON.stringify({id:place.id,name,photoIdentity:place.photoIdentity}));
}
writeFileSync('shared/knowledge-places.json',JSON.stringify(places));
