import assets from './atmosphere-assets.json' with {type:'json'};
import type {Place} from './types.js';
export function atmosphereFor(place:Pick<Place,'name'|'city'|'category'|'description'>){
 const text=`${place.name} ${place.description}`.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const name=place.name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 let key='heritage';
 if(/\b(mountain|peak|volcano|summit|cave|canyon|cliff)\b/.test(name))key='mountain';
 else if(/\b(rice|terrace|terraced)\b/.test(text)||(/sa\s?pa/i.test(place.city)&&/valley|village|farm/i.test(text)))key='terraces';
 else if(/\b(mountain|peak|volcano|summit|cave|canyon|cliff)\b/.test(text))key='mountain';
 else if(place.category==='Beaches'||/\b(beach|coast|bay|ocean|island|harbour|harbor)\b/.test(text))key='coast';
 else if(/\b(forest|woodland|wood|trail|waterfall)\b/.test(text))key='forest';
 else if(place.category==='Parks & gardens'||/\b(garden|park)\b/.test(text))key='garden';
 else if(place.category==='Adventure')key='mountain';
 else if(place.category==='Nature')key='forest';
 else if(place.category==='Activities')key='garden';
 return assets.find(asset=>asset.key===key)!;
}
