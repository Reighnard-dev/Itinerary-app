import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {places} from '../server/catalog.js';
import {worldwideDestinations,geoCity} from '../server/world.js';
import {parseGuidePage,safeWebsite,discoverGuide,type GuidePage} from '../server/travel-guide.js';
import {placeSnapshotSchema,tripSchema} from '../server/validation.js';
import {guideLink} from '../shared/guide-link.js';

test('worldwide index has unique country and city labels with usable coordinates',()=>{
 assert.equal(worldwideDestinations.length,250);assert.ok(worldwideDestinations.reduce((n,c)=>n+c.cities.length,0)>34000);
 for(const country of worldwideDestinations){assert.equal(new Set(country.cities).size,country.cities.length);for(const name of country.cities){const city=geoCity(country.country,name)!;assert.ok(Number.isFinite(city.lat)&&Math.abs(city.lat)<=90&&Math.abs(city.lng)<=180);}}
 for(const [country,city] of [['Japan','Osaka'],['Singapore','Singapore'],['United States','New York City'],['Netherlands','Amsterdam'],['New Zealand','Queenstown']])assert.ok(geoCity(country,city));
});
test('every built-in listing can be stored, has a local image asset, and retains its actual source',()=>{
 assert.ok(places.length>5900);assert.ok(new Set(places.map(p=>p.country)).size>=31);assert.equal(new Set(places.map(p=>p.id)).size,places.length);
 for(const p of places){const parsed=placeSnapshotSchema.safeParse(p);assert.ok(parsed.success,`${p.name}: ${parsed.success?'':parsed.error.message}`);assert.ok(geoCity(p.country,p.city),`${p.country}/${p.city}`);assert.ok(existsSync(`public${p.image}`),p.image);if(p.id.startsWith('guide-')){assert.equal(p.rating,null);assert.ok(p.source?.url&&new URL(p.source.url).protocol==='https:');if(p.source.name==='Wikivoyage contributors'){assert.ok(p.source.url.startsWith('https://en.wikivoyage.org/'));assert.equal(p.source.license,'CC BY-SA 4.0');}}}
 assert.ok(places.filter(p=>p.category==='Restaurants').length>1500);assert.ok(places.filter(p=>p.category==='Parks & gardens').length>150);assert.ok(places.filter(p=>p.category==='Activities').length>500);
});
const fixture:GuidePage={title:'Singapore',revid:12345,text:`<h2>Eat</h2><bdi class="vcard"><a data-lat="1.29" data-lon="103.85"></a><span class="listing-name" id="Example_Cafe"><a class="external" href="javascript:alert(1)">Example Café</a></span><span class="listing-content">Coffee &amp; a peaceful courtyard.</span><span class="listing-address">1 Example Street</span><span class="listing-hours">Mo–Fr 09:00–17:00</span></bdi><h2>See</h2><bdi class="vcard"><a data-lat="1.3" data-lon="103.84"></a><span class="listing-name" id="Example_Garden">Example Garden</span><span class="listing-content">A green place for a walk.</span></bdi><h2>Sleep</h2><bdi class="vcard"><a data-lat="1.29" data-lon="103.85"></a><span class="listing-name">Ignored Hotel</span></bdi><h2>See</h2><bdi class="vcard"><a data-lat="48.85" data-lon="2.35"></a><span class="listing-name">Wrong continent</span></bdi>`};
test('guide parser separates dining and parks, keeps attribution, and excludes wrong coordinates',()=>{
 const parsed=parseGuidePage(fixture,'Singapore','Singapore');assert.equal(parsed.length,2);assert.equal(parsed[0].category,'Restaurants');assert.equal(parsed[1].category,'Parks & gardens');assert.equal(parsed[0].website,undefined);assert.equal(parsed[0].rating,null);assert.match(parsed[0].source!.url,/oldid=12345/);assert.equal(parsed[0].description,'Coffee & a peaceful courtyard.');assert.equal(parsed[0].id,parseGuidePage(fixture,'Singapore','Singapore')[0].id);
 assert.equal(safeWebsite('data:text/html,bad'),undefined);assert.equal(safeWebsite('//example.com'),'https://example.com/');
});
test('full-guide links preserve multiword names and remove only city disambiguators',()=>{assert.equal(guideLink('New York City'),'https://en.wikivoyage.org/wiki/New_York_City');assert.equal(guideLink('Springfield (Illinois)'),'https://en.wikivoyage.org/wiki/Springfield');assert.equal(guideLink('São Paulo'),'https://en.wikivoyage.org/wiki/S%C3%A3o_Paulo');});
test('snapshot validation supports multiple cities within one country and rejects cross-country substitution',()=>{
 const osaka=places.find(p=>p.city==='Osaka')!;const trip={id:randomUUID(),title:'Japan together',country:'Japan',city:'Kyoto',days:5,startDate:'',stops:[{id:randomUUID(),placeId:osaka.id,place:osaka,day:3,time:'10:00',notes:'Train to Osaka.'}]};
 assert.equal(tripSchema.safeParse(trip).success,true);const paris=places.find(p=>p.city==='Paris')!;assert.equal(tripSchema.safeParse({...trip,stops:[{...trip.stops[0],placeId:paris.id,place:paris}]}).success,false);
});
test('previously unseen guide snapshots survive validation without adding to a central catalog',()=>{
 const point={...parseGuidePage(fixture,'Singapore','Singapore')[0],id:'guide-sg-0123456789abcdef0123'};
 const trip={id:randomUUID(),title:'A live discovery',country:'Singapore',city:'Singapore',days:2,startDate:'',stops:[{id:randomUUID(),placeId:point.id,place:point,day:1,time:'',notes:''}]};
 assert.equal(tripSchema.safeParse(trip).success,true);assert.equal(tripSchema.safeParse({...trip,stops:[{...trip.stops[0],place:{...point,lat:99}}]}).success,false);
});
test('guide discovery handles missing pages and temporary district failures',async()=>{
 const result=await discoverGuide('Singapore','Singapore',async()=>null);assert.deepEqual(result.places,[]);
 const main={...fixture,text:fixture.text+'<a href="/wiki/Singapore/Example">District</a>'};const partial=await discoverGuide('Singapore','Singapore',async title=>{if(title==='Singapore')return main;throw new Error('Temporary failure');});assert.equal(partial.places.length,2);
});
