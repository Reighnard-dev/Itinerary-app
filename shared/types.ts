export interface Place {
  id: string; name: string; country: string; city: string; category: 'Culture' | 'Nature' | 'Food & drink' | 'Adventure' | 'Restaurants' | 'Parks & gardens' | 'Activities' | 'Shopping' | 'Beaches';
  kind: 'iconic' | 'hidden' | 'local'; description: string; image: string; lat: number; lng: number;
  rating: number | null; duration: string; price: string; bestTime: string; transit: string; driving: string;
  source?: {name:string;url:string;retrievedAt:string;license?:string};
  website?:string;address?:string;hours?:string;phone?:string;listingUpdated?:string;
  photo?:PlaceImage;photoIdentity?:{wikidataId?:string;wikipediaTitle?:string};
}
export interface PlaceImage {url:string;title:string;sourceUrl:string;author:string;license:string;licenseUrl:string;match:string;provider?:'wikimedia'|'venue'|'web'}
export interface Stop { id: string; placeId: string; day: number; time: string; notes: string; place?:Place }
export interface Trip { id: string; title: string; country: string; city: string; days: number; startDate: string; stops: Stop[]; updatedAt: string }
export interface User { id: string; email: string; name: string }
export interface Destination {country:string;code?:string;cities:string[]}
export interface ExploreResult {places:Place[];sourcePages:string[];cached:boolean;fetchedAt:string;notice?:string}
