import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Shared offline selector is an ES module without declarations.
import select from '../scripts/select-image-search-results.mjs';

const place={name:'Sample Venue',city:'Paris',category:'Restaurants',address:'28 Example Street'};
const raw=(url='https://photos.example/exterior.jpg',source='https://venue.example/paris',caption='Sample Venue Paris exterior')=>`Sample Venue Paris (${source})\nImage URL: ${url}# ${caption}\n\nThe exterior entrance and seating area at this named venue in Paris.`;

test('web candidates retain source rights for a matching physical venue scene',()=>{
 const [photo]=select(raw(),place);
 assert.ok(photo);
 assert.equal(photo.license,'Source image — rights retained');
 assert.equal(photo.sourceUrl,'https://venue.example/paris');
 assert.equal(photo.provider,'web');
});

test('nearby hotels and explicitly described composites cannot become place photos',()=>{
 assert.equal(select(raw(undefined,'https://www.hotelplanner.com/Hotels/3660-NEAR-Sample-Venue'),place).length,0);
 assert.equal(select(raw(undefined,undefined,'Sample Venue Paris collage'),place).length,0);
 assert.equal(select(raw(undefined,undefined,'Sample Venue Paris book cover'),place).length,0);
});

test('review exclusions survive refreshed web searches and Commons retains its license workflow',()=>{
 const rejected=Object.keys(JSON.parse(readFileSync(new URL('../shared/web-photo-exclusions.json',import.meta.url),'utf8')))[0];
 assert.ok(rejected);
 assert.equal(select(raw(rejected),place).length,0);
 assert.equal(select(raw('https://upload.wikimedia.org/wikipedia/commons/a/ab/Sample_Venue.jpg'),place).length,0);
 assert.equal(select(raw('https://photos.example/Kazuo_Ohno.jpg'),place).length,0);
});

test('known multi-branch venues require address evidence beyond brand and city',()=>{
 const venue={...place,name:"Nanny's Pavilion",city:'Jakarta',address:'Central Park Jakarta'};
 const scene=(branch:string)=>raw(undefined,'https://venue.example/jakarta',`Nanny's Pavilion Jakarta ${branch} exterior`);
 assert.equal(select(scene('Library'),venue).length,0);
 assert.equal(select(scene('Central Park'),venue).length,1);
});
