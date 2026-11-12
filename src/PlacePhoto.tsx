import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Place,PlaceImage} from '../shared/types';

const cache=new Map<string,PlaceImage|null>(),pending=new Map<string,Promise<void>>(),listeners=new Set<()=>void>();
const subscribe=(notify:()=>void)=>{listeners.add(notify);return()=>{listeners.delete(notify);};};
const getPhoto=(place:Place)=>place.photo||cache.get(place.id)||null;
async function resolve(place:Place){
 if(place.photo||cache.has(place.id))return;if(pending.has(place.id))return pending.get(place.id);
 const request=(async()=>{try{const response=await fetch(`/api/place-image?id=${encodeURIComponent(place.id)}`);if(!response.ok)return;const data=await response.json() as {photo:PlaceImage|null};cache.set(place.id,data.photo);for(const notify of listeners)notify();}catch{/* Keep a clearly marked placeholder when the source is unavailable. */}finally{pending.delete(place.id);}})();pending.set(place.id,request);return request;
}
function usePhoto(place:Place){return useSyncExternalStore(subscribe,()=>getPhoto(place),()=>place.photo||null);}
export default function PlacePhoto({place,className=''}:{place:Place;className?:string}){
 const photo=usePhoto(place),ref=useRef<HTMLImageElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false);const el=ref.current;if(!el||place.photo)return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){void resolve(place);observer.disconnect();}},{rootMargin:'250px'});observer.observe(el);return()=>observer.disconnect();},[place.id,place.photo]);
 const original=!place.image.startsWith('/illustrations/');
 const src=failed?'/fallback.svg':photo?.url||(original?place.image:'/fallback.svg');
 return <img ref={ref} src={src} alt={photo||original?place.name:`Photo unavailable for ${place.name}`} className={className} loading="lazy" decoding="async" data-photo-status={failed||(!photo&&!original)?'unavailable':'available'} title={photo?`${photo.author} · ${photo.license} · ${photo.sourceUrl}`:original?place.name:`An exact-place photograph is not available for ${place.name}. Open the place to view location photos on Maps.`} onError={()=>setFailed(true)}/>;
}
export function PhotoCredit({place,full=false}:{place:Place;full?:boolean}){
 const photo=usePhoto(place);if(!photo)return place.image.startsWith('/illustrations/')?(full?<div className="photo-attribution">An exact-place photograph is not available yet. You can view location photos on Maps below.</div>:<a className="photo-credit" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.city} ${place.country}`)}`} target="_blank" rel="noreferrer" aria-label={`View location photos for ${place.name} on Maps`}>Photos on Maps ↗</a>):null;
 return full?<div className="photo-attribution"><a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.provider?photo.author:`Photo: ${photo.author}`}</a><span> · </span><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a><span> · Cropped for display</span></div>:<a className="photo-credit" href={photo.sourceUrl} target="_blank" rel="noreferrer" title={`${photo.author} · ${photo.license}`} aria-label={`Photo credit for ${place.name}: ${photo.author}, ${photo.license}`}>Photo credit ↗</a>;
}
