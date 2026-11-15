import {copyFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {places, placesByCity} from '../server/catalog.js';
import {artworkForCities} from '../server/destination-artwork.js';
import {destinationIndex} from '../server/destination-index.js';
import {worldCountries} from '../server/world.js';

const output = 'dist/discovery';
mkdirSync(output + '/artwork', {recursive:true});
mkdirSync(output + '/places', {recursive:true});
mkdirSync('dist/api/source-data', {recursive:true});

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data));
}

const placeFiles: Record<string, string> = Object.create(null);
for (const {country, code} of worldCountries) {
  writeJson(`${output}/artwork/${code}.json`, {cities:artworkForCities(country)});
}
for (const [city, listings] of placesByCity) {
  const file = createHash('sha256').update(city).digest('hex').slice(0, 24) + '.json';
  placeFiles[city] = file;
  writeJson(`${output}/places/${file}`, {places:listings});
}
writeJson(output + '/destinations.json', {...destinationIndex, placeFiles});

for (const file of ['map-places.json', 'sapa-places.json', 'expanded-places.json', 'researched-places.json',
  'geographic-places.json', 'knowledge-places.json', 'world-cities.json', 'overture-places.json.gz']) {
  copyFileSync('shared/' + file, 'dist/api/source-data/' + file);
}
writeJson('dist/api/source-data/odbl-places.json', {
  license:'ODbL 1.0',
  attribution:'© OpenStreetMap contributors',
  changes:'Filtered, normalized and deduplicated for Roam; photos and text retain their separate notices',
  places:places.filter(place => place.source?.name === 'OpenStreetMap contributors'),
});

console.log(`Published ${destinationIndex.countryCount} countries and territories, ${destinationIndex.cityCount} cities and towns, and ${placesByCity.size} city place files`);
