import {copyFileSync,mkdirSync,mkdtempSync,renameSync,rmdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {places,placesByCity} from '../server/catalog.js';
import {artworkForCities,countryArtwork} from '../server/destination-artwork.js';
import {hostedCatalogPath} from '../server/hosted-catalog.js';
import {DatabaseSync} from '../server/runtime-db.js';
import {worldCountries} from '../server/world.js';
import {loadEnv} from 'vite';

const publicConfig = loadEnv('production', process.cwd(), 'VITE_SUPABASE_');
const supabaseUrl = new URL(publicConfig.VITE_SUPABASE_URL ?? '');
const publishableKey = publicConfig.VITE_SUPABASE_ANON_KEY ?? '';
if (supabaseUrl.protocol !== 'https:' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
 throw new Error('The Netlify build requires an HTTPS Supabase URL and a publishable key.');
}
// Ship only the licensed release datasets, never private data, secrets, or quarantine.
mkdirSync('public/source-data',{recursive:true});
for(const file of ['map-places.json','sapa-places.json','expanded-places.json','researched-places.json','geographic-places.json','knowledge-places.json','world-cities.json','overture-places.json.gz'])copyFileSync('shared/'+file,'public/source-data/'+file);
writeFileSync('public/source-data/odbl-places.json',JSON.stringify({license:'ODbL 1.0',attribution:'© OpenStreetMap contributors',changes:'Filtered, normalized and deduplicated for Roam; photos and text retain their separate notices',places:places.filter(p=>p.source?.name==='OpenStreetMap contributors')}));

// Precompute the same catalog and artwork used locally. Hosted functions read only
// the rows they need so cold starts fit within Netlify's default memory limit.
const catalogDir = path.dirname(hostedCatalogPath);
mkdirSync(catalogDir,{recursive:true});
const stagingDir = mkdtempSync(path.join(catalogDir,'build-'));
const stagingCatalog = path.join(stagingDir,'catalog.sqlite');
const db = new DatabaseSync(stagingCatalog);
try {
 db.exec(`CREATE TABLE place_index (id TEXT PRIMARY KEY, country TEXT NOT NULL, city TEXT NOT NULL) WITHOUT ROWID;
          CREATE TABLE city_places (country TEXT NOT NULL, city TEXT NOT NULL, payload BLOB NOT NULL, PRIMARY KEY (country, city)) WITHOUT ROWID;
          CREATE TABLE country_artwork (country TEXT PRIMARY KEY, payload TEXT NOT NULL);
          CREATE TABLE city_artwork (country TEXT PRIMARY KEY, payload TEXT NOT NULL);
          CREATE TABLE public_config (url TEXT NOT NULL, publishable_key TEXT NOT NULL);
          BEGIN;`);
 db.prepare('INSERT INTO public_config VALUES (?, ?)').run(supabaseUrl.origin, publishableKey);
 const insertPlace = db.prepare('INSERT INTO place_index VALUES (?, ?, ?)');
 const insertPlaceGroup = db.prepare('INSERT INTO city_places VALUES (?, ?, ?)');
 const insertCountry = db.prepare('INSERT INTO country_artwork VALUES (?, ?)');
 const insertCity = db.prepare('INSERT INTO city_artwork VALUES (?, ?)');
 for (const group of placesByCity.values()) {
  const [{country,city}] = group;
  insertPlaceGroup.run(country,city,gzipSync(JSON.stringify(group)));
  for (const place of group) insertPlace.run(place.id,country,city);
 }
 for (const [country,artwork] of countryArtwork) insertCountry.run(country,JSON.stringify(artwork));
 for (const {country} of worldCountries) insertCity.run(country,JSON.stringify(artworkForCities(country)));
 db.exec('COMMIT;');
} finally {
 db.close();
}
renameSync(stagingCatalog,hostedCatalogPath);
rmdirSync(stagingDir);
