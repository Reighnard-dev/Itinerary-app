import { z } from 'zod';
import { places } from './catalog.js';
import {geoCity} from './world.js';
const webUrl=z.url().max(2000).refine(value=>/^https?:\/\//.test(value),'Use an HTTP or HTTPS URL.');
export const placeSnapshotSchema=z.object({
 id:z.string().max(100),name:z.string().trim().min(1).max(160),country:z.string().min(1).max(120),city:z.string().min(1).max(200),
 category:z.enum(['Culture','Nature','Food & drink','Adventure','Restaurants','Parks & gardens','Activities','Shopping','Beaches']),kind:z.enum(['iconic','hidden','local']),
 description:z.string().max(1000),image:z.string().regex(/^\/(images|illustrations)\/[\w.-]+\.(jpg|svg)$/),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),rating:z.number().min(0).max(5).nullable(),
 duration:z.string().max(80),price:z.string().max(120),bestTime:z.string().max(120),transit:z.string().max(700),driving:z.string().max(700),
 source:z.object({name:z.string().max(100),url:webUrl,retrievedAt:z.iso.datetime(),license:z.string().max(50).optional()}).optional(),
 website:webUrl.optional(),address:z.string().max(300).optional(),hours:z.string().max(300).optional(),phone:z.string().max(100).optional(),listingUpdated:z.string().max(80).optional()
 ,photo:z.object({url:z.string().regex(/^\/(images\/places|api\/photos)\/[a-f0-9]{24}\.jpg$/),title:z.string().max(500),sourceUrl:webUrl,author:z.string().max(300),license:z.string().max(100),licenseUrl:webUrl,match:z.string().max(150),provider:z.enum(['wikimedia','venue','web']).optional()}).optional(),photoIdentity:z.object({wikidataId:z.string().regex(/^Q\d+$/).optional(),wikipediaTitle:z.string().max(300).optional()}).optional()
});
export const credentialsSchema = z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(8).max(128),name:z.string().trim().min(1).max(80).optional()});
export const tripSchema = z.object({
 id:z.uuid(),title:z.string().trim().min(1).max(100),country:z.string().max(120),city:z.string().max(200),days:z.number().int().min(1).max(30),
 startDate:z.union([z.literal(''),z.iso.date()]),
 stops:z.array(z.object({id:z.uuid(),placeId:z.string().max(100),day:z.number().int().min(1).max(30),time:z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),notes:z.string().max(1000),place:placeSnapshotSchema.optional()})).max(200),
 updatedAt:z.string().optional()
}).superRefine((trip,ctx)=>{
 if(!geoCity(trip.country,trip.city)) ctx.addIssue({code:'custom',message:'Choose a country and city from the destination suggestions.'});
 const ids=new Set<string>();
 for(const stop of trip.stops){
  if(stop.day>trip.days) ctx.addIssue({code:'custom',message:'A stop is outside your trip dates.'});
  const known=places.find(p=>p.id===stop.placeId);
  const snapshot=stop.place;
  const sourceValid=snapshot?.source?.name==='Wikivoyage contributors'&&snapshot.source.url.startsWith('https://en.wikivoyage.org/');
  const valid=known?known.country===trip.country:Boolean(snapshot&&snapshot.id===stop.placeId&&snapshot.country===trip.country&&geoCity(snapshot.country,snapshot.city)&&/^guide-[a-z]{2}-[a-f0-9]{20}$/.test(snapshot.id)&&sourceValid);
  if(!valid||(snapshot&&(snapshot.id!==stop.placeId||snapshot.country!==trip.country||(known&&snapshot.city!==known.city)))) ctx.addIssue({code:'custom',message:'A place does not belong to this destination.'});
  if(ids.has(stop.id)) ctx.addIssue({code:'custom',message:'Duplicate stop IDs are not allowed.'});
  ids.add(stop.id);
 }
});
