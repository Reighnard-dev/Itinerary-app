import type {Place} from '../shared/types.js';
import {plain,normalName,isNearby,syntheticPhotoMetadata,type CommonsImage} from './photo-search.js';
// Additional identity and freshness checks for automated bulk assignments.
export function recoveryRejection(place:Pick<Place,'name'|'lat'|'lng'>,page:CommonsImage):string|undefined{
 const meta=page.imageinfo?.[0]?.extmetadata||{},description=plain(meta.ImageDescription?.value||'');
 if(syntheticPhotoMetadata(meta,page.title))return 'synthetic-image-rejected';
 if(/historical (?:images|photographs)|black.and.white|postcards|\b(?:18\d\ds|19[0-8]\ds)\b/i.test(plain(meta.Categories?.value||''))||/\b(?:date|dato|datum|circa|ca)\s*[:/.]?\s*(?:ca\s*)?(?:18\d{2}|19[0-8]\d)\b/i.test(description))return 'archival-image-rejected';
 if(meta.GPSLatitude?.value&&meta.GPSLongitude?.value&&!isNearby(place,[{lat:Number(meta.GPSLatitude.value),lon:Number(meta.GPSLongitude.value)}],3))return 'image-location-mismatch';
 if(/\bcent(?:er|re)\b/i.test(place.name)&&!normalName(description+' '+page.title).includes(normalName(place.name)))return 'identity-review-needed';
}
