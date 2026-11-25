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
import type { CityArtwork, Place, PlaceImage } from '../shared/types.js';
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

// Artwork: keep only photos whose URL is in featuredUrls (prevents 404s)
for (const { country, code } of worldCountries) {
  const raw = artworkForCities(country) || {};
  const leanArtwork: Record<string, CityArtwork> = {};
  for (const [city, art] of Object.entries(raw)) {
    if (art.photo && featuredUrls.has(art.photo.url)) {
      leanArtwork[city] = art;
    } else {
      const { photo: _omitted, ...rest } = art;
      leanArtwork[city] = rest;
    }
  }
  writeJson(path.join(output, 'artwork', `${code}.json`), { cities: leanArtwork });
}

// Prioritize all handpicked cities, Sa Pa, plus top 200 cities worldwide by place count
const priorityCities = new Set<string>(
  handpicked.map((p) => JSON.stringify([p.country, p.city]))
);
priorityCities.add(JSON.stringify(['Vietnam', 'Sa Pa']));

const sortedCities = [...placesByCity.entries()].sort((a, b) => b[1].length - a[1].length);
const selectedCities = new Map<string, Place[]>();

for (const key of priorityCities) {
  const list = placesByCity.get(key);
  if (list) selectedCities.set(key, list);
}
for (const [key, list] of sortedCities) {
  if (selectedCities.size >= priorityCities.size + 200) break;
  if (!selectedCities.has(key)) selectedCities.set(key, list);
}

const placeFiles: Record<string, string> = Object.create(null);
for (const [cityKey, listings] of selectedCities) {
  const file = createHash('sha256').update(cityKey).digest('hex').slice(0, 24) + '.json';
  placeFiles[cityKey] = file;
  const capped = listings.slice(0, 60).map((place) => {
    if (place.photo && !featuredUrls.has(place.photo.url)) {
      const { photo: _omitted, ...rest } = place;
      return rest;
    }
    return place;
  });
  writeJson(path.join(output, 'places', file), { places: capped });
}

const leanDestinations = destinationIndex.destinations.map((dest) => {
  if (dest.photo && !featuredUrls.has(dest.photo.url)) {
    const { photo: _omitted, ...rest } = dest;
    return rest;
  }
  return dest;
});

writeJson(path.join(output, 'destinations.json'), {
  ...destinationIndex,
  destinations: leanDestinations,
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
    discoveryCityFiles: selectedCities.size,
    distTotalFiles: stats.files,
    distTotalMB: Number((stats.bytes / 1048576).toFixed(2)),
  })
);
