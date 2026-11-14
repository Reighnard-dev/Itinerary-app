import type {PlaceImage} from './types.js';

// A recorded open license is evidence to review, not a warranty of ownership.
// Anchor the entire label: CC BY-NC/ND must never pass as CC BY.
export function hasOpenPhotoLicense(photo:Pick<PlaceImage,'title'|'author'|'license'|'licenseUrl'|'sourceUrl'>):boolean{
 const label=/^(?:CC0(?: 1\.0)?|Public domain|CC BY(?:-SA)? (?:[1-4]\.0|2\.1|2\.5)(?: [a-z]{2,3})?)$/i;
 if(!label.test(photo.license)||!photo.author?.trim()||!photo.title?.trim()||/^Wikimedia Commons contributors$/i.test(photo.author.trim()))return false;
 try{
  const source=new URL(photo.sourceUrl),license=new URL(photo.licenseUrl);
  if(!['http:','https:'].includes(source.protocol)||!['http:','https:'].includes(license.protocol)||source.port||license.port||license.username||license.password)return false;
  if(!['commons.wikimedia.org','en.wikipedia.org'].includes(source.hostname)||!source.pathname.startsWith('/wiki/File:')||source.username||source.password)return false;
  if(photo.license==='Public domain')return ['commons.wikimedia.org','creativecommons.org'].includes(license.hostname);
  if(license.hostname!=='creativecommons.org')return false;
  if(/^CC0/i.test(photo.license))return license.pathname==='/publicdomain/zero/1.0'||license.pathname.startsWith('/publicdomain/zero/1.0/');
  const match=photo.license.match(/^CC (BY(?:-SA)?) ([\d.]+)(?: ([a-z]+))?$/i)!;
  const base=`/licenses/${match[1].toLowerCase()}/${match[2]}`;
  return license.pathname===base||license.pathname.startsWith(base+'/');
 }catch{return false;}
}

// Apply this to historical trip snapshots as well as new imports. A website
// credit, fair-use claim, or arbitrary remote URL is never a reuse license.
export function reusablePhoto(photo:PlaceImage|undefined|null):PlaceImage|null{
 return photo&&hasOpenPhotoLicense(photo)&&/^\/(?:images\/places|api\/photos)\/[a-f0-9]{24}\.jpg$/.test(photo.url)?photo:null;
}
