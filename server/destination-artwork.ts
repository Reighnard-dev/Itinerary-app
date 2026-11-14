import {placeById, placesByCity} from './catalog.js';
import {cityDistance, worldCountries} from './world.js';
import type {CityArtwork, DestinationPhoto, Place} from '../shared/types.js';

// Reserve distinct images for the popular country and city cards first.
const countryPicks: Record<string, string> = {
  France: 'guide-fr-573adda4e5bf0409f10a',
  Italy: 'rome-4',
  Spain: 'guide-es-a61cfbd24f17536be493',
  Greece: 'guide-gr-5c57ee7c4ffa8c45b2fa',
  Philippines: 'cebu-1',
  Japan: 'kyoto-4',
  Indonesia: 'bali-2',
  Switzerland: 'interlaken-1',
  Thailand: 'bangkok-1',
};
const cityPicks: Record<string, string[]> = {
  France: ['paris-1', 'guide-fr-07d146ec339b0bd0f415'],
  Italy: ['rome-1'],
  Spain: ['guide-es-9fd1aaa62bb08ed9cfde'],
  Greece: ['guide-gr-cfc4a6b6a574dd396e8d'],
  Philippines: ['guide-ph-01426f2a15e6b4bd1eb7', 'cebu-2'],
  Japan: ['kyoto-1', 'tokyo-2'],
  Thailand: ['bangkok-2'],
};

const used = new Set<string>();
function assign(place: Place | undefined): DestinationPhoto | undefined {
  const photo = place?.photo;
  if (!photo || !photo.url.startsWith('/images/places/') || used.has(photo.url)) return;
  used.add(photo.url);
  return {url:photo.url, title:`${place.name} · ${place.city}, ${place.country}`};
}

export const countryArtwork = new Map<string, DestinationPhoto>();
const curatedCities = new Map<Place, DestinationPhoto>();
for (const [country, id] of Object.entries(countryPicks)) {
  const place = placeById.get(id);
  const photo = place?.country === country ? assign(place) : undefined;
  if (photo) countryArtwork.set(country, photo);
}
for (const [country, ids] of Object.entries(cityPicks)) {
  for (const id of ids) {
    const place = placeById.get(id);
    if (place?.country !== country) continue;
    const photo = assign(place);
    if (photo) curatedCities.set(place, photo);
  }
}

const cityArtwork = new Map<string, Record<string, CityArtwork>>();
for (const {country, cities} of worldCountries) {
  const artwork: Record<string, CityArtwork> = Object.create(null);
  for (const city of cities) {
    const places = placesByCity.get(JSON.stringify([country, city.name])) ?? [];
    let photo = places.map(place => curatedCities.get(place)).find(Boolean);
    if (!photo) {
      // Prefer recognizable sights over venue photos, and stay near the indexed city.
      const sights = places.filter(place => place.photo && ['Culture','Nature','Parks & gardens','Beaches'].includes(place.category));
      for (const place of sights) {
        if (cityDistance(place, city) > 15) continue;
        photo = assign(place);
        if (photo) break;
      }
    }
    artwork[city.name] = {lat:city.lat, lng:city.lng, ...(photo && {photo})};
  }
  cityArtwork.set(country, artwork);
}

const countryPlaces = new Map<string, Place[]>();
for (const places of placesByCity.values()) {
  for (const place of places) {
    if (!place.photo || countryArtwork.has(place.country) || !['Nature','Culture','Beaches','Parks & gardens'].includes(place.category)) continue;
    const candidates = countryPlaces.get(place.country);
    if (candidates) candidates.push(place);
    else countryPlaces.set(place.country, [place]);
  }
}
for (const [country, candidates] of countryPlaces) {
  for (const place of candidates) {
    const photo = assign(place);
    if (!photo) continue;
    countryArtwork.set(country, photo);
    break;
  }
}

export function artworkForCities(country: string) {
  return cityArtwork.get(country);
}
