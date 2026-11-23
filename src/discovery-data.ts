import type {CityArtwork, DestinationIndex, Place, PlaceImage} from '../shared/types';
import {api} from './api';

export const usesStaticDiscovery = import.meta.env.MODE === 'netlify';

type StaticIndex = DestinationIndex & {placeFiles: Record<string, string>};
let indexRequest: Promise<StaticIndex> | undefined;
const placePhotos = new Map<string, PlaceImage>();

async function readJson<T>(file: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/discovery/' + file, {signal});
  if (!response.ok) throw new Error('Could not load destination data. Please try again.');
  return response.json();
}

function staticIndex() {
  indexRequest ??= readJson<StaticIndex>('destinations.json').catch(error => {
    indexRequest = undefined;
    throw error;
  });
  return indexRequest;
}

export function loadDestinations(): Promise<DestinationIndex> {
  return usesStaticDiscovery ? staticIndex() : api<DestinationIndex>('/destinations');
}

export function loadArtwork(country: string, code: string, signal: AbortSignal) {
  type Artwork = {cities: Record<string, CityArtwork>};
  return usesStaticDiscovery
    ? readJson<Artwork>(`artwork/${code}.json`, signal)
    : api<Artwork>(`/destination-artwork?${new URLSearchParams({country})}`, {signal});
}

export async function loadPlaces(selection: {country: string; city: string}): Promise<{places: Place[]}> {
  if (!usesStaticDiscovery) return api(`/places?${new URLSearchParams(selection)}`);
  const {placeFiles} = await staticIndex();
  const {city} = selection;
  const country = ['USA', 'US', 'United States of America'].includes(selection.country)
    ? 'United States'
    : selection.country;
  const file = placeFiles[JSON.stringify([country, city])];
  if (!file) return {places:[]};
  const data = await readJson<{places: Place[]}>(`places/${file}`);
  for (const place of data.places) {
    if (place.photo) placePhotos.set(place.id, place.photo);
  }
  return data;
}

export function staticPlacePhoto(id: string) {
  return placePhotos.get(id);
}
