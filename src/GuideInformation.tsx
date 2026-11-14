import {ArrowUp,Globe2,MapPin,Clock3} from 'lucide-react';
import type {Place} from '../shared/types';
import {placeSource} from '../shared/place-source';
export default function GuideInformation({place}:{place:Place}){
 if(!place.source)return null;
 const credit=placeSource(place);
 return <div className="guide-information"><div className="guide-information-source"><Globe2 size={16}/><div><a href={place.source.url} target="_blank" rel="noreferrer">{place.source.name} <ArrowUp className="diagonal" size={12}/></a><span>{credit.excerpt} · retrieved {new Date(place.source.retrievedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})} · <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a></span></div></div>{place.address&&<p><MapPin size={14}/><span>{place.address}</span></p>}{place.hours&&<p><Clock3 size={14}/><span><strong>Source-listed hours:</strong> {place.hours}</span></p>}{place.phone&&<p><span>Source-listed phone: {place.phone}</span></p>}{place.website&&<a className="venue-link" href={place.website} target="_blank" rel="noreferrer">Visit the venue’s website <ArrowUp className="diagonal" size={13}/></a>}<p className="guide-freshness">Community details can change. Confirm visitor access, opening, prices, and reservations with the venue. Visit durations are planning suggestions.</p></div>;
}
export function SourceCredit({place}:{place:Place}){if(!place.source)return null;const credit=placeSource(place);return <div className="card-source"><a href={place.source.url} target="_blank" rel="noreferrer">{credit.label} ↗</a><a href={credit.licenseUrl} title={credit.license} target="_blank" rel="noreferrer">{credit.license.length>22?'Open licenses':credit.license}</a></div>;}
