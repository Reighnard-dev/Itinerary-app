import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasOpenPhotoLicense,reusablePhoto} from '../shared/photo-rights.js';
const base={title:'Location.jpg',author:'Photographer',sourceUrl:'https://commons.wikimedia.org/wiki/File:Location.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'};
test('accepts exact CC BY-SA labels and canonical license URLs with or without trailing slash',()=>{
 assert.equal(hasOpenPhotoLicense(base),true);
 assert.equal(hasOpenPhotoLicense({...base,licenseUrl:base.licenseUrl.slice(0,-1)}),true);
 assert.equal(hasOpenPhotoLicense({...base,license:'CC BY 2.5 hu',licenseUrl:'http://creativecommons.org/licenses/by/2.5/hu/'}),true);
});
test('rejects restricted labels, false license links and missing attribution',()=>{
 for(const license of ['CC BY-NC 4.0','CC BY-ND 4.0','CC BY-SA 4.0 extra','Source website — rights retained'])assert.equal(hasOpenPhotoLicense({...base,license}),false);
 assert.equal(hasOpenPhotoLicense({...base,author:''}),false);
 assert.equal(hasOpenPhotoLicense({...base,licenseUrl:'https://creativecommons.org/licenses/by-nc/4.0/'}),false);
 assert.equal(hasOpenPhotoLicense({...base,sourceUrl:'https://commons.wikimedia.org.example.com/photo.jpg'}),false);
 assert.equal(hasOpenPhotoLicense({...base,sourceUrl:'https://commons.wikimedia.org/wiki/Main_Page'}),false);
 assert.equal(hasOpenPhotoLicense({...base,license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0-fake'}),false);
 assert.equal(hasOpenPhotoLicense({...base,author:'Wikimedia Commons contributors'}),false);
});
test('historical photo snapshots cannot introduce remote assets or restricted licenses',()=>{
 const photo={...base,url:'/images/places/0123456789abcdef01234567.jpg',match:'Exact linked article'};
 assert.ok(reusablePhoto(photo));
 assert.equal(reusablePhoto({...photo,url:'https://example.com/stolen.jpg'}),null);
 assert.equal(reusablePhoto({...photo,url:'/images/places/../../private.jpg'}),null);
 assert.equal(reusablePhoto({...photo,license:'Source website — rights retained'}),null);
});
