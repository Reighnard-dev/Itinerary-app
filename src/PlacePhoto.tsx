import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Place,PlaceImage} from '../shared/types';
import {reusablePhoto} from '../shared/photo-rights';
import {atmosphereFor} from '../shared/atmosphere';
import featuredData from '../shared/featured-photos.json' with {type:'json'};
const featured=featuredData as {places:Record<string,PlaceImage>};

const cache=new Map<string,PlaceImage|null>(),pending=new Map<string,Promise<void>>(),listeners=new Set<()=>void>();
let inFlight=0;const waiting:(()=>void)[]=[];
async function acquire(){if(inFlight<2){inFlight++;return;}await new Promise<void>(resolve=>waiting.push(resolve));}
function release(){const next=waiting.shift();if(next)next();else inFlight--;}
const subscribe=(notify:()=>void)=>{listeners.add(notify);return()=>{listeners.delete(notify);};};
// Saved snapshots can contain obsolete or forged credits. Display only the
// bundled, reviewed featured index or the current server's canonical response.
const getPhoto=(place:Place)=>cache.has(place.id)?cache.get(place.id)!:reusablePhoto(featured.places[place.id]);
async function resolve(place:Place){
 if(featured.places[place.id]||cache.has(place.id))return;if(pending.has(place.id))return pending.get(place.id);
 const request=(async()=>{await acquire();try{const response=await fetch(`/api/place-image?id=${encodeURIComponent(place.id)}`,{signal:AbortSignal.timeout(15000)});if(!response.ok)return;const data=await response.json() as {photo:PlaceImage|null};cache.set(place.id,reusablePhoto(data.photo));for(const notify of listeners)notify();}catch{/* Keep an explicit absence when a licensed photograph is unavailable. */}finally{pending.delete(place.id);release();}})();pending.set(place.id,request);return request;
}
function usePhoto(place:Place){return useSyncExternalStore(subscribe,()=>getPhoto(place),()=>reusablePhoto(featured.places[place.id]));}
export default function PlacePhoto({place,className=''}:{place:Place;className?:string}){
 const photo=usePhoto(place),ref=useRef<HTMLSpanElement>(null),[fallbackFailed,setFallbackFailed]=useState(false),atmosphere=atmosphereFor(place);
 useEffect(()=>{setFallbackFailed(false);const el=ref.current;if(!el||photo)return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){void resolve(place);observer.disconnect();}},{rootMargin:'250px'});observer.observe(el);return()=>observer.disconnect();},[place.id,photo]);
 if(!photo){
  if(fallbackFailed)return <span ref={ref} role="img" aria-label={`Photo unavailable for ${place.name}`} className={`photo-unavailable ${className}`} data-photo-status="unavailable"><span>Photo unavailable</span></span>;
  return <span ref={ref} className={`atmosphere-photo ${className}`} data-photo-status="generated" title={atmosphere.disclosure}><img src={atmosphere.url} alt={`AI-generated scenic atmosphere; not a photograph of ${place.name}`} loading="lazy" decoding="async" onError={()=>setFallbackFailed(true)}/><span className="atmosphere-label">AI-generated atmosphere</span></span>;
 }
 return <img src={photo.url} alt={place.name} className={className} loading="lazy" decoding="async" data-photo-status="available" title={`${photo.title} · ${photo.author} · ${photo.license} · Cropped for display · ${photo.sourceUrl}`} onError={()=>{cache.set(place.id,null);for(const notify of listeners)notify();}}/>;
}
export function PhotoCredit({place,full=false}:{place:Place;full?:boolean}){
 const photo=usePhoto(place);if(!photo){const atmosphere=atmosphereFor(place);return full?<div className="photo-attribution"><a href={`/atmosphere.html#${atmosphere.key}`}>AI-generated scenic atmosphere</a> · Fictional scene, not a photograph of {place.name}. An exact-place photo is not available. View actual location photos on Maps below.</div>:<a className="photo-credit atmosphere-credit" href={`/atmosphere.html#${atmosphere.key}`} target="_blank" rel="noreferrer" title={atmosphere.disclosure}>About this AI image ↗</a>;}
 return full?<div className="photo-attribution"><a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.title} — Photo: {photo.author}</a><span> · </span><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a><span> · Cropped for display; adaptations offered under the same license.</span>{photo.notices?.length?<p>{photo.notices.join(' · ')}</p>:null}</div>:<a className="photo-credit" href={photo.sourceUrl} target="_blank" rel="noreferrer" title={`${photo.title} · ${photo.author} · ${photo.license} · Cropped for display`} aria-label={`Photo credit for ${place.name}: ${photo.author}, ${photo.license}`}>{photo.author} · {photo.license} ↗</a>;
}
