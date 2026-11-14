import test from 'node:test';
import assert from 'node:assert/strict';
import {commonsPhoto,identityFromListing,isNearby,type CommonsImage} from '../server/photo-search.js';
import {placeSnapshotSchema} from '../server/validation.js';
import {places} from '../shared/catalog.js';
import manifest from '../shared/place-images.json' with {type:'json'};
import {existsSync,mkdtempSync,rmdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {photoService} from '../server/photo-service.js';
import type {PlaceImage} from '../shared/types.js';
import {places as fullCatalog} from '../server/catalog.js';

const commons:CommonsImage={title:'File:Fushimi Inari shrine.jpg',imageinfo:[{url:'https://upload.wikimedia.org/wikipedia/commons/0/01/Fushimi.jpg',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Fushimi.jpg/640px-Fushimi.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Fushimi_Inari_shrine.jpg',mime:'image/jpeg',width:1800,height:1200,extmetadata:{Artist:{value:'<a href="/wiki/User:Photographer">Photographer</a>'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}}}]};
test('image matches require nearby coordinates for ambiguous place names',()=>{const shrine={lat:34.9671,lng:135.7727};assert.equal(isNearby(shrine,[{lat:34.9673,lon:135.7729}]),true);assert.equal(isNearby(shrine,[{lat:48.8584,lon:2.2945}]),false);assert.equal(isNearby(shrine,undefined),false);});
test('guide image identifiers come from explicit source links',()=>{const result=identityFromListing('<span class="listing-sister-wikidata"><a href="https://www.wikidata.org/wiki/Q132218">Wikidata</a></span><span class="listing-sister-wikipedia"><a href="https://en.wikipedia.org/wiki/Fushimi_Inari-taisha">Wikipedia</a></span>');assert.equal(result.wikidataId,'Q132218');assert.equal(result.wikipediaTitle,'Fushimi Inari-taisha');});
test('photo metadata retains attribution and strips markup from author names',()=>{const result=commonsPhoto(commons,'Linked guide entity');assert.ok(result);assert.equal(result.author,'Photographer');assert.equal(result.license,'CC BY-SA 4.0');assert.equal(result.sourceUrl,commons.imageinfo![0].descriptionurl);assert.ok(result.notices?.some(n=>n.includes('https://commons.wikimedia.org/wiki/User:Photographer')));});
test('photo selection rejects logos, unlicensed files and third-party image URLs',()=>{
 assert.equal(commonsPhoto({...commons,title:'File:Shrine logo.jpg'},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Categories:{value:'AI-generated images'}}}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{}}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Restrictions:{value:'ita-mibac'}}}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Categories:{value:'Piazza Barberini|Paintings by Ettore Roesler Franz'}}}]},''),null);
 assert.ok(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Categories:{value:'Beurs van Berlage|Flags of Amsterdam|Photographs by Warren LeMay'}}}]},''));
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],thumburl:'https://other.example/image.jpg'}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,ImageDescription:{value:'Castle Cornet. Print by William Berry, 1814.'}}}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,ImageDescription:{value:'Old Bazaar Gjakova, 1936'}}}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Categories:{value:'SVG city maps of Estonia'}}}]},''),null);
});
test('photo credits and linked identities survive itinerary snapshot validation',()=>{const info=commonsPhoto(commons,'Linked guide entity')!;const {remoteUrl,...credit}=info;const result=placeSnapshotSchema.safeParse({...places[0],photo:{...credit,url:'/images/places/0123456789abcdef01234567.jpg'},photoIdentity:{wikidataId:'Q132218'}});assert.ok(result.success);});
test('a creator public-domain self-release can link to its recorded declaration when no license URL exists',()=>{
 const meta={Artist:{value:'Named photographer'},Credit:{value:'Own work'},LicenseShortName:{value:'Public domain'},Copyrighted:{value:'False'},Permission:{value:'Own work, all rights released (Public domain)'}};
 const page={...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:meta}]};
 const photo=commonsPhoto(page,'Exact place identity');assert.ok(photo);assert.equal(photo.licenseUrl,commons.imageinfo![0].descriptionurl+'#Licensing');assert.ok(photo.notices?.some(n=>n.includes('all rights released')));
 assert.equal(commonsPhoto({...page,imageinfo:[{...page.imageinfo[0],extmetadata:{...meta,Permission:{value:''}}}]},''),null);
 assert.equal(commonsPhoto({...page,imageinfo:[{...page.imageinfo[0],extmetadata:{...meta,Artist:{value:'Unknown author'}}}]},''),null);
 assert.equal(commonsPhoto({...page,imageinfo:[{...page.imageinfo[0],extmetadata:{...meta,Credit:{value:'External website'}}}]},''),null);
 const withoutPermission={...page,imageinfo:[{...page.imageinfo[0],extmetadata:{...meta,Permission:{value:''}}}]};
 const dedication=commonsPhoto({...withoutPermission,revisions:[{revid:123,slots:{main:{content:'== Licensing ==\n{{PD-self}}'}}}]},'Exact place');assert.ok(dedication);assert.match(dedication.licenseUrl,/#Licensing$/);assert.ok(dedication.notices?.some(n=>n.includes('PD-self')));
 assert.equal(commonsPhoto({...withoutPermission,revisions:[{revid:123,slots:{main:{content:'== Licensing ==\n{{PD-old}}'}}}]},''),null);
 assert.equal(commonsPhoto({...withoutPermission,revisions:[{revid:123,slots:{main:{content:'<!-- {{PD-self}} --> <nowiki>{{PD-self}}</nowiki>'}}}]},''),null);
 assert.equal(commonsPhoto({...withoutPermission,revisions:[{revid:123,slots:{main:{content:'{{PD-self}}\n{{Copyvio|source=example}}'}}}]},''),null);
});
test('temporary photo download failures can be retried instead of caching an absence',async()=>{
 const db=new DatabaseSync(':memory:');const dir=mkdtempSync(path.join(tmpdir(),'roam-photo-test-'));
 const place={...places[0],id:'photo-retry-fixture',photo:undefined};let lookups=0,available=true;
 const service=photoService(db,dir,[place],async()=>{lookups++;return available?commonsPhoto(commons,'Linked guide entity'):null;},async()=>new Response('Unavailable',{status:503}));
 try{
  await assert.rejects(service.resolve(place.id),/temporarily unavailable/);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM photo_cache').get()!.count,0);
  available=false;assert.equal(await service.resolve(place.id),null);assert.equal(lookups,2);
  assert.equal(await service.resolve(place.id),null);assert.equal(lookups,2,'A confirmed absence is cached.');
 }finally{db.close();rmdirSync(service.dir);rmdirSync(dir);}
});
test('unlicensed seeded and cached photographs cannot bypass the live license check',async()=>{
 const db=new DatabaseSync(':memory:'),dir=mkdtempSync(path.join(tmpdir(),'roam-rights-test-'));let lookups=0;
 const unsafe:PlaceImage={url:'/api/photos/0123456789abcdef01234567.jpg',title:'Venue',author:'Venue site',sourceUrl:'https://venue.example/',license:'Source website — rights retained',licenseUrl:'https://venue.example/',match:'Named venue'};
 const place={...places[0],id:'unsafe-cache-fixture',photo:unsafe};
 const service=photoService(db,dir,[place],async()=>{lookups++;throw new Error('Source unavailable');});
 db.prepare('INSERT INTO photo_cache VALUES(?,?,?)').run(place.id,JSON.stringify(unsafe),Date.now());
 try{await assert.rejects(service.resolve(place.id),/Source unavailable/);assert.equal(lookups,1);assert.equal(service.canServe('0123456789abcdef01234567.jpg'),false);}
 finally{db.close();rmdirSync(service.dir);rmdirSync(dir);}
});
test('live downloads preserve canonical credits and refuse changed cached bytes',async()=>{
 const db=new DatabaseSync(':memory:'),dir=mkdtempSync(path.join(tmpdir(),'roam-rights-bytes-'));
 const place={...places[0],id:'verified-download-fixture',photo:undefined};
 const service=photoService(db,dir,[place],async()=>commonsPhoto(commons,'Exact linked identity'),async()=>new Response(new Uint8Array(2000).fill(1),{headers:{'content-type':'image/jpeg'}}));
 let filename='';
 try{
  const photo=await service.resolve(place.id);assert.ok(photo);filename=path.basename(photo.url);assert.equal(service.canServe(filename),true);
  db.prepare('UPDATE photo_cache SET data=? WHERE place_id=?').run(JSON.stringify({...photo,author:'Forged snapshot credit'}),place.id);
  assert.equal((await service.resolve(place.id))?.author,'Photographer');
  const reloaded=photoService(db,dir,[place]);assert.equal((await reloaded.resolve(place.id))?.author,'Photographer');
  writeFileSync(path.join(service.dir,filename),'Changed bytes');assert.equal(reloaded.canServe(filename),false);
 }finally{db.close();if(filename){unlinkSync(path.join(service.dir,filename));unlinkSync(path.join(service.dir,filename)+'.rights.json');}rmdirSync(service.dir);rmdirSync(dir);}
});
test('the researched photo index contains local images with reusable licenses and traceable sources',()=>{
 const entries=Object.entries(manifest as Record<string,PlaceImage>);assert.ok(entries.length>=100,'The import must contain actual downloaded place photographs.');
 for(const [id,photo] of entries){assert.ok(existsSync(`public${photo.url}`),`${id}: ${photo.url}`);assert.match(photo.sourceUrl,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.ok(photo.author&&photo.license&&photo.licenseUrl&&photo.match);assert.match(photo.license,/^(CC0|Public domain|CC BY)/i);}
});
test('every displayed place photograph has a local asset and a source credit',()=>{const photographed=fullCatalog.filter(p=>p.photo);assert.ok(photographed.length>1900);for(const place of photographed){assert.ok(existsSync(`public${place.photo!.url}`),place.name);assert.ok(placeSnapshotSchema.safeParse(place).success,place.name);assert.ok(place.photo!.sourceUrl&&place.photo!.licenseUrl&&place.photo!.author);}});
