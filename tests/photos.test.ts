import test from 'node:test';
import assert from 'node:assert/strict';
import {commonsPhoto,identityFromListing,isNearby,type CommonsImage} from '../server/photo-search.js';
import {placeSnapshotSchema} from '../server/validation.js';
import {places} from '../shared/catalog.js';
import manifest from '../shared/place-images.json' with {type:'json'};
import {existsSync} from 'node:fs';
import type {PlaceImage} from '../shared/types.js';
import {places as fullCatalog} from '../server/catalog.js';

const commons:CommonsImage={title:'File:Fushimi Inari shrine.jpg',imageinfo:[{url:'https://upload.wikimedia.org/wikipedia/commons/0/01/Fushimi.jpg',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Fushimi.jpg/640px-Fushimi.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Fushimi_Inari_shrine.jpg',mime:'image/jpeg',width:1800,height:1200,extmetadata:{Artist:{value:'<a href="/wiki/User:Photographer">Photographer</a>'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}}}]};
test('image matches require nearby coordinates for ambiguous place names',()=>{const shrine={lat:34.9671,lng:135.7727};assert.equal(isNearby(shrine,[{lat:34.9673,lon:135.7729}]),true);assert.equal(isNearby(shrine,[{lat:48.8584,lon:2.2945}]),false);assert.equal(isNearby(shrine,undefined),false);});
test('guide image identifiers come from explicit source links',()=>{const result=identityFromListing('<span class="listing-sister-wikidata"><a href="https://www.wikidata.org/wiki/Q132218">Wikidata</a></span><span class="listing-sister-wikipedia"><a href="https://en.wikipedia.org/wiki/Fushimi_Inari-taisha">Wikipedia</a></span>');assert.equal(result.wikidataId,'Q132218');assert.equal(result.wikipediaTitle,'Fushimi Inari-taisha');});
test('photo metadata retains attribution and strips markup from author names',()=>{const result=commonsPhoto(commons,'Linked guide entity');assert.ok(result);assert.equal(result.author,'Photographer');assert.equal(result.license,'CC BY-SA 4.0');assert.equal(result.sourceUrl,commons.imageinfo![0].descriptionurl);});
test('photo selection rejects logos, unlicensed files and third-party image URLs',()=>{
 assert.equal(commonsPhoto({...commons,title:'File:Shrine logo.jpg'},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{}}]},''),null);
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Categories:{value:'Piazza Barberini|Paintings by Ettore Roesler Franz'}}}]},''),null);
 assert.ok(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],extmetadata:{...commons.imageinfo![0].extmetadata,Categories:{value:'Beurs van Berlage|Flags of Amsterdam|Photographs by Warren LeMay'}}}]},''));
 assert.equal(commonsPhoto({...commons,imageinfo:[{...commons.imageinfo![0],thumburl:'https://other.example/image.jpg'}]},''),null);
});
test('photo credits and linked identities survive itinerary snapshot validation',()=>{const info=commonsPhoto(commons,'Linked guide entity')!;const {remoteUrl,...credit}=info;const result=placeSnapshotSchema.safeParse({...places[0],photo:{...credit,url:'/images/places/0123456789abcdef01234567.jpg'},photoIdentity:{wikidataId:'Q132218'}});assert.ok(result.success);});
test('the researched photo index contains local images with reusable licenses and traceable sources',()=>{
 const entries=Object.entries(manifest as Record<string,PlaceImage>);assert.ok(entries.length>=100,'The import must contain actual downloaded place photographs.');
 for(const [id,photo] of entries){assert.ok(existsSync(`public${photo.url}`),`${id}: ${photo.url}`);assert.match(photo.sourceUrl,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.ok(photo.author&&photo.license&&photo.licenseUrl&&photo.match);assert.match(photo.license,/^(CC0|Public domain|CC BY)/i);}
});
test('every displayed place photograph has a local asset and a source credit',()=>{const photographed=fullCatalog.filter(p=>p.photo);assert.ok(photographed.length>1900);for(const place of photographed){assert.ok(existsSync(`public${place.photo!.url}`),place.name);assert.ok(placeSnapshotSchema.safeParse(place).success,place.name);assert.ok(place.photo!.sourceUrl&&place.photo!.licenseUrl&&place.photo!.author);}});
