import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {placesByCity} from '../server/catalog.js';
import {worldwideDestinations} from '../server/world.js';
import type {DestinationIndex, Place} from '../shared/types.js';

// Pass the deployment origin to exercise the same public URLs used by the picker.
const origin = process.argv[2];
async function read(file: string) {
  if (!origin) return JSON.parse(await readFile('dist/discovery/' + file, 'utf8'));
  const url = new URL('/discovery/' + file + '?v=3', origin);
  const response = await fetch(url, {signal:AbortSignal.timeout(60000)});
  assert.ok(response.ok && response.headers.get('content-type')?.includes('json'), url.href + ' returned ' + response.status);
  return response.json();
}
const index: DestinationIndex & {placeFiles: Record<string,string>} = await read('destinations.json');
assert.deepEqual(index.destinations.map(({country,code,cities}) => ({country,code,cities})), worldwideDestinations);
assert.equal(index.countryCount, worldwideDestinations.length);
const files = new Map<string,string[]>();
let cities = 0, listings = 0;
const localityOnly = new Set<string>();
for (const {country,cities: names} of worldwideDestinations) {
  for (const city of names) {
    const key = JSON.stringify([country,city]);
    const file = index.placeFiles[key];
    assert.match(file ?? '', /^[a-f0-9]{24}\.json$/, 'Unpublished city ' + key);
    const keys = files.get(file) ?? [];
    keys.push(key);
    files.set(file, keys);
    cities++;
  }
}
assert.equal(cities, index.cityCount);
assert.equal(Object.keys(index.placeFiles).length, cities);
const pending = files.entries();
async function verifyFiles() {
  for (const [file,keys] of pending) {
    const {places} = await read('places/' + file) as {places: Place[]};
    const observed = new Map<string,string[]>();
    for (const place of places) {
      assert.ok(place.id && place.name.trim() && Number.isFinite(place.lat) && Number.isFinite(place.lng), file);
      const key = JSON.stringify([place.country,place.city]);
      const ids = observed.get(key) ?? [];
      ids.push(place.id);
      observed.set(key, ids);
    }
    assert.equal(observed.size, keys.length, file);
    for (const key of keys) {
      const ids = observed.get(key);
      assert.ok(ids?.length, 'Empty city ' + key);
      const expected = placesByCity.get(key);
      assert.deepEqual(ids, expected?.map(place => place.id), key);
      if (expected?.every(place => place.category === 'Localities')) localityOnly.add(key);
      listings += ids.length;
    }
  }
}
await Promise.all(Array.from({length:16}, verifyFiles));
assert.equal(listings, index.placeCount);
console.log(JSON.stringify({origin:origin ?? 'local Vercel build',countries:index.countryCount,cities,listings,files:files.size,emptyCities:0,localityOnly:localityOnly.size}));

const [beforePath, reportPath] = process.argv.slice(3);
if (beforePath && reportPath) {
  const before = JSON.parse(await readFile(beforePath,'utf8')) as typeof index;
  const rows = ['Country or territory,Cities and towns,Previously with listings,Previously empty,Now with listings,Now with nearby localities only'];
  for (const {country,cities} of index.destinations) {
    const keys = cities.map(city => JSON.stringify([country,city]));
    const previous = keys.filter(key => before.placeFiles[key]).length;
    rows.push([`"${country.replaceAll('"','""')}"`,cities.length,previous,cities.length-previous,cities.length,keys.filter(key => localityOnly.has(key)).length].join(','));
  }
  await writeFile(reportPath,rows.join('\n')+'\n');
}
