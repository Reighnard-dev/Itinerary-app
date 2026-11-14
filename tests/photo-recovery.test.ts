import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryRejection} from '../server/photo-recovery-policy.js';
import type {CommonsImage} from '../server/photo-search.js';
const photo=(title:string,meta:Record<string,{value:string}>):CommonsImage=>({title,imageinfo:[{url:'',descriptionurl:'',mime:'image/jpeg',width:960,height:640,extmetadata:meta}]});
test('an institution photo in Strasbourg cannot represent its Brussels building',()=>{
 assert.equal(recoveryRejection({name:'European Parliament',lat:50.838,lng:4.375},photo('File:European Parliament Strasbourg Hemicycle - Diliff.jpg',{GPSLatitude:{value:'48.597447'},GPSLongitude:{value:'7.769683'}})),'image-location-mismatch');
});
test('digitized historical photographs cannot pass as current views',()=>{
 assert.equal(recoveryRejection({name:'Oscarsborg Fortress',lat:59.67,lng:10.60},photo('File:46. Drøbak, Oscarsborg.jpg',{DateTimeOriginal:{value:'2007-12-11'},ImageDescription:{value:'Dato / Date: ca 1880-1890'},Categories:{value:'Historical images of the Oscarsborg Fortress'}})),'archival-image-rejected');
});
test('a general park view cannot represent a specifically named visitor center',()=>{
 assert.equal(recoveryRejection({name:'Crissy Field Center',lat:37.8,lng:-122.45},photo('File:Crissy Field.JPG',{ImageDescription:{value:'Crissy Field'}})),'identity-review-needed');
 assert.equal(recoveryRejection({name:'Ussher Fort',lat:5.54,lng:-0.21},photo('File:Ussher Fort.JPG',{ImageDescription:{value:'Ussher Fort in Accra'}})),undefined);
});
test('an openly licensed synthetic image is not an actual landmark photograph',()=>{
 assert.equal(recoveryRejection({name:'Castle',lat:1,lng:1},photo('File:Castle.jpg',{Categories:{value:'Midjourney-generated images'},ImageDescription:{value:'AI-generated reconstruction of a castle'}})),'synthetic-image-rejected');
});
