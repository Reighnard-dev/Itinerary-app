import type {Place} from './types.js';
export function placeSource(place:Pick<Place,'source'>){
 const name=place.source?.name;
 if(name==='Wikidata contributors')return {label:'Wikidata',badge:'Place',excerpt:'Geographic record',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'};
 if(name==='Overture Maps Foundation')return {label:'Overture Maps',badge:'Map',excerpt:'Mapped place',license:place.source?.license||'CDLA Permissive 2.0',licenseUrl:'/licenses/overture-places.txt'};
 if(name==='OpenStreetMap contributors')return {label:'OpenStreetMap',badge:'Map',excerpt:'Mapped place',license:'ODbL 1.0',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/'};
 if(name==='GeoNames contributors')return {label:'GeoNames',badge:'Place',excerpt:'Geographic record',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
 if(name!=='Wikivoyage contributors')return {label:name||'Source',badge:'Place',excerpt:'Source information',license:place.source?.license||'See source terms',licenseUrl:place.source?.url||'/credits.html'};
 return {label:'Wikivoyage',badge:'Guide',excerpt:'Adapted guide excerpt',license:place.source?.license||'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'};
}
