import {destinationNotice} from '../shared/destination-notices';
import {useCallback,useEffect,useRef,useState} from 'react';
import {destinations as initialDestinations,places as handpicked} from '../shared/catalog';
import type {Destination,ExploreResult,Place} from '../shared/types';
import {api} from './api';
import {loadDestinations,loadPlaces,usesStaticDiscovery} from './discovery-data';
export function useDiscovery(result:{country:string;city:string}){
 const [destinations,setDestinations]=useState<Destination[]>(initialDestinations);
 const [places,setPlaces]=useState<Place[]>(handpicked),[loading,setLoading]=useState(false),[notice,setNotice]=useState('');
 const [counts,setCounts]=useState({countries:initialDestinations.length,cities:initialDestinations.reduce((n,d)=>n+d.cities.length,0),places:handpicked.length});
 const version=useRef(0),current=useRef(result);current.current=result;
 useEffect(()=>{let alive=true;loadDestinations().then(data=>{if(alive){setDestinations(data.destinations);setCounts({countries:data.countryCount,cities:data.cityCount,places:data.placeCount});}}).catch(()=>{if(alive)setNotice('The worldwide city index is temporarily unavailable. Built-in destinations are still available.');});return()=>{alive=false;};},[]);
 const merge=useCallback((incoming:Place[])=>setPlaces(prev=>{const updates=new Map(incoming.map(p=>[p.id,p]));const ids=new Set(prev.map(p=>p.id));const names=new Set(prev.map(p=>`${p.country}:${p.city}:${p.name.toLowerCase()}`));return [...prev.map(p=>updates.has(p.id)?{...p,...updates.get(p.id)!}:p),...incoming.filter(p=>!ids.has(p.id)&&!names.has(`${p.country}:${p.city}:${p.name.toLowerCase()}`))];}),[]);
 const live=useCallback(async(selection:{country:string;city:string},token:number)=>{try{const data=await api<ExploreResult>(`/explore?${new URLSearchParams(selection)}`);if(token!==version.current)return;merge(data.places);setNotice([destinationNotice(selection.country,selection.city),data.notice||`Place listings ${data.cached?'from the server cache':'retrieved'} ${new Date(data.fetchedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}. Confirm visitor access, hours and prices with the venue.`].filter(Boolean).join(' '));}catch(error){if(token===version.current)setNotice((error as Error).message);}finally{if(token===version.current)setLoading(false);}},[merge]);
 useEffect(()=>{const token=++version.current;setLoading(true);setNotice(destinationNotice(result.country,result.city));loadPlaces(result).then(async data=>{if(token!==version.current)return;merge(data.places);if(!data.places.length&&!usesStaticDiscovery)await live(result,token);else setLoading(false);}).catch(error=>{if(token===version.current){setNotice((error as Error).message);setLoading(false);}});return()=>{version.current++;};},[result.country,result.city,merge,live]);
 const loadLive=()=>{const token=++version.current;setLoading(true);setNotice('Checking the city and its district guides…');void live(current.current,token);};
 return {destinations,places,loading,notice,counts,loadLive};
}
