import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mapPlace,mapQuery} from '../server/map-places.js';
import {discoverPlaces} from '../server/discovery.js';
import {tripSchema,placeSnapshotSchema} from '../server/validation.js';
import {placeSource} from '../shared/place-source.js';
import {places} from '../server/catalog.js';
import {overturePlace,type OverturePlace} from '../server/overture-places.js';

const cafe=()=>mapPlace({type:'node',id:123456,tags:{name:'A local cafe',amenity:'cafe',website:'javascript:alert(1)'},lat:13.096,lon:-59.615},'Barbados','Bridgetown')!;
test('expanded places have unique IDs and can be preserved as itinerary snapshots',()=>{
 assert.equal(new Set(places.map(p=>p.id)).size,places.length);
 for(const place of places){const result=placeSnapshotSchema.safeParse(place);assert.ok(result.success,`${place.id}: ${result.success?'':result.error.message}`);}
});
test('mapped places reject invalid/private/distant features and preserve source-specific credits',()=>{
 const place=cafe();assert.equal(place.category,'Food & drink');assert.equal(place.rating,null);assert.equal(place.website,undefined);assert.equal(placeSource(place).license,'ODbL 1.0');
 assert.equal(mapPlace({type:'node',id:1,tags:{name:'Private garden',leisure:'garden',access:'private'},lat:13.1,lon:-59.6},'Barbados','Bridgetown'),null);
 assert.equal(mapPlace({type:'node',id:2,tags:{name:'Faraway museum',tourism:'museum'},lat:0,lon:0},'Barbados','Bridgetown'),null);
 const beach=mapPlace({type:'way',id:3,tags:{name:'A beach',natural:'beach'},center:{lat:13.1,lon:-59.6}},'Barbados','Bridgetown');assert.equal(beach?.category,'Beaches');
 assert.ok(mapQuery('(area.a)').includes('[name]'));
});
test('unseen mapped itinerary stops require an exact source ID and support later account saves',()=>{
 const place=cafe(),trip={id:randomUUID(),country:'Barbados',city:'Bridgetown',title:'A day out',days:1,startDate:'',stops:[{id:randomUUID(),placeId:place.id,place,day:1,time:'',notes:''}]};
 assert.ok(tripSchema.safeParse(trip).success);
 assert.equal(tripSchema.safeParse({...trip,stops:[{...trip.stops[0],place:{...place,source:{...place.source!,url:'https://www.openstreetmap.org/node/999'}}}]}).success,false);
});
test('discovery keeps map results when the guide fails and does not disguise partial failures',async()=>{
 const mapped={places:[cafe()],sourcePages:['https://www.openstreetmap.org/copyright'],fetchedAt:new Date().toISOString()};
 const result=await discoverPlaces('Barbados','Bridgetown',async()=>{throw new Error('Unavailable');},async()=>mapped);
 assert.equal(result.places.length,1);assert.match(result.notice!,/temporarily unavailable/);
 await assert.rejects(()=>discoverPlaces('Barbados','Bridgetown',async()=>{throw new Error('Unavailable');},async()=>{throw new Error('Unavailable');}));
});
test('alternate garden spellings across sources merge without losing a source or photograph',()=>{
 const gardens=places.filter(p=>p.country==='Barbados'&&/Andromeda Botanic(?:al)? Gardens/i.test(p.name));
 assert.equal(gardens.length,1);assert.equal(gardens[0].source?.name,'Wikivoyage contributors');
});
test('a geographic stop remains editable after a later catalog deduplication',()=>{
 const place={...cafe(),id:'geo-bb-999999999',source:{name:'GeoNames contributors',url:'https://www.geonames.org/999999999/',license:'CC BY 4.0',retrievedAt:new Date().toISOString()}};
 const trip={id:randomUUID(),country:'Barbados',city:'Bridgetown',title:'Saved earlier',days:1,startDate:'',stops:[{id:randomUUID(),placeId:place.id,place,day:1,time:'',notes:''}]};
 assert.ok(tripSchema.safeParse(trip).success);
});
test('Overture accepts only supported source licenses, nearby country matches, and real park categories',()=>{
 const row:OverturePlace={id:'01234567-89ab-cdef-0123-456789abcdef',name:'A city park',country:'Barbados',code:'BB',city:'Bridgetown',lat:13.107,lng:-59.62,category:'Parks & gardens',basic_category:'park',confidence:0.95,sources:[{license:'CDLA-Permissive-2.0'}]};
 const place=overturePlace(row)!;assert.ok(place);assert.equal(place.rating,null);assert.equal(placeSource(place).license,'CDLA Permissive 2.0');
 assert.equal(overturePlace({...row,name:'Helipad Car Park'}),null);
 assert.equal(overturePlace({...row,name:'Luxury Apartments',category:'Culture'}),null);
 assert.equal(overturePlace({...row,name:'Church Boy Prints',category:'Culture'}),null);
 assert.equal(overturePlace({...row,code:'BE'}),null);
 assert.equal(overturePlace({...row,sources:[{license:'Unknown'}]}),null);
 assert.equal(overturePlace({...row,confidence:0.5}),null);
});
