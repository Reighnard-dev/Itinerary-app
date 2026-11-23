import type {DestinationIndex} from '../shared/types.js';
import {places} from './catalog.js';
import {countryArtwork} from './destination-artwork.js';
import {worldwideDestinations} from './world.js';

const destinations = worldwideDestinations.map(destination => {
  const photo = countryArtwork.get(destination.country);
  return {...destination, ...(photo && {photo})};
});

export const destinationIndex: DestinationIndex = {
  destinations,
  countryCount: destinations.length,
  cityCount: destinations.reduce((count, destination) => count + destination.cities.length, 0),
  placeCount: places.length,
};
