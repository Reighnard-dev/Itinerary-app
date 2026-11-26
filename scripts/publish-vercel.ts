import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { places as handpicked } from '../shared/catalog.js';
import type { Place, PlaceImage } from '../shared/types.js';
import { placesByCity } from '../server/catalog.js';
import { artworkForCities } from '../server/destination-artwork.js';
import { destinationIndex } from '../server/destination-index.js';
import { worldCountries } from '../server/world.js';

const featured = JSON.parse(readFileSync('shared/featured-photos.json', 'utf8')) as {
  places: Record<string, PlaceImage>;
  heroes: { image: string; photo: PlaceImage }[];
};

const featuredUrls = new Set<string>([
  ...Object.values(featured.places).map((p) => p.url),
  ...featured.heroes.map((h) => h.image),
]);

// 1. Prune dist/images/places/ down to the 34 cleared featured images so we stay
// well below Vercel Hobby's 15,000-file and size limits without touching public/.
const distPlacesImgDir = path.join('dist', 'images', 'places');
let keptImages = 0;
let removedImages = 0;
if (existsSync(distPlacesImgDir)) {
  for (const file of readdirSync(distPlacesImgDir)) {
    const url = `/images/places/${file}`;
    if (featuredUrls.has(url)) {
      keptImages++;
    } else {
      rmSync(path.join(distPlacesImgDir, file), { force: true });
      removedImages++;
    }
  }
}

// 2. Build lean dist/discovery/
const output = path.join('dist', 'discovery');
rmSync(output, { recursive: true, force: true });
mkdirSync(path.join(output, 'artwork'), { recursive: true });
mkdirSync(path.join(output, 'places'), { recursive: true });

function writeJson(filePath: string, data: unknown) {
  writeFileSync(filePath, JSON.stringify(data));
}

// Artwork: preserve all city artwork photos (served statically or via Vercel Edge rewrite)
for (const { country, code } of worldCountries) {
  const artwork = artworkForCities(country) || {};
  writeJson(path.join(output, 'artwork', `${code}.json`), { cities: artwork });
}

/* Keep established single-city URLs usable by already-open installations.
   Smaller cities share a same-country file to stay within the deployment file limit. */
const standalone = new Set(handpicked.map(p => JSON.stringify([p.country, p.city])));
standalone.add(JSON.stringify(['Vietnam', 'Sa Pa']));
const placeFiles: Record<string, string> = Object.create(null);
let fileCount = 0;
function publish(keys: string[], listings: Place[]) {
  const key = keys.length === 1 ? keys[0] : JSON.stringify(keys);
  const file = createHash('sha256').update(key).digest('hex').slice(0, 24) + '.json';
  writeJson(path.join(output, 'places', file), {places: listings});
  for (const city of keys) placeFiles[city] = file;
  fileCount++;
}
for (const {country, cities} of worldCountries) {
  let keys: string[] = [], batch: Place[] = [];
  for (const city of cities) {
    const key = JSON.stringify([country, city.name]);
    const listings = placesByCity.get(key);
    if (!listings?.length) throw new Error('Missing place listings for ' + key);
    if (listings.length >= 60 || standalone.has(key)) {
      publish([key], listings);
      continue;
    }
    if (batch.length + listings.length > 160) {
      publish(keys, batch);
      keys = [];
      batch = [];
    }
    keys.push(key);
    batch.push(...listings);
  }
  if (keys.length) publish(keys, batch);
}

writeJson(path.join(output, 'destinations.json'), {
  ...destinationIndex,
  placeFiles,
});

// 3. Summarize dist/ file count & size
function countDist(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      const sub = countDist(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files++;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

const stats = countDist('dist');
console.log(
  JSON.stringify({
    keptFeaturedImages: keptImages,
    prunedImages: removedImages,
    discoveryCityFiles: fileCount,
    coveredCities: Object.keys(placeFiles).length,
    distTotalFiles: stats.files,
    distTotalMB: Number((stats.bytes / 1048576).toFixed(2)),
  })
);
