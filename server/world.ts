import world from '../shared/world-cities.json' with {type:'json'};
export interface GeoCity {id:string;name:string;nativeName:string;lat:number;lng:number;region:string;population:number;capital:boolean}
export const worldCountries=world.countries;
const countryMap=new Map(worldCountries.map(c=>[c.country,c]));
export const worldwideDestinations=worldCountries.map(c=>({country:c.country,code:c.code,cities:c.cities.map(city=>city.name)}));
export function geoCity(country:string,city:string):GeoCity|undefined{return countryMap.get(country)?.cities.find(c=>c.name===city);}
export function countryCode(country:string){return countryMap.get(country)?.code||'';}
export function cityDistance(a:{lat:number;lng:number},b:{lat:number;lng:number}){const rad=Math.PI/180;const deltaLat=(b.lat-a.lat)*rad,deltaLng=(b.lng-a.lng)*rad;const x=Math.sin(deltaLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(deltaLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
