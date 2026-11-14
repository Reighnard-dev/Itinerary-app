# Country destination expansion

The app now combines the original handpicked catalog with travel-guide listings, map records, and geographic features for the 144 requested countries and territories. The country selector's existing city labels are retained. [The coverage report](DESTINATION-COVERAGE.md) contains measured totals; [the detailed JSON](expansion-coverage.json) records every selectable city's categories and photo coverage. Empty cities and missing categories remain explicit in the two research CSV files.

## Sources and matching

- **Wikivoyage:** the [English article dump](https://dumps.wikimedia.org/enwikivoyage/latest/) supplies See, Do, Eat, Drink, and Buy listings. Country membership follows the guide's parent hierarchy. Accented article identities remain distinct from redirects. Accommodation, transport, embassy, comment-only, and explicitly closed listings are excluded. The app links to each source revision and retains CC BY-SA 4.0 attribution. Coordinate-only facts linked through Wikidata are resolved from their explicit identifiers.
- **Overture Maps:** the [official catalog](https://stac.overturemaps.org/catalog.json) identifies the release. Country addresses and coordinates match records to indexed destination centers, within 20 km. The importer uses exact tourism category codes, excludes closed records, requires existence confidence of at least 0.85, and selects up to six records per category per city. Existence confidence is not a rating or a popularity measure. GERS IDs and source-feature links are retained. The app includes source licenses and the provider notice under `public/licenses/`; [the provenance file](overture-provenance.json) records release and transformations.
- **GeoNames:** [country extracts](https://download.geonames.org/export/dump/) identify named museums, historic sites, places of worship, parks, gardens, beaches, waterfalls, caves, and some activities and restaurants. These records are labeled as geographic records and do not establish visitor access. Only nearby features in the source country are assigned to an indexed destination, within 20 km. Source hashes and retrieval times are recorded in [data-provenance.json](data-provenance.json).
- **OpenStreetMap:** [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) supplies additional named attractions, restaurants, parks, and activities, with individual feature URLs and ODbL credits. Public-server capacity limited the bulk import. Live discovery can fall back to maps if the English guide is missing or lacks the requested categories. Failures and partial results remain visible, with shorter cache periods for incomplete results.
- **Wikidata:** remaining empty cities are also checked by exact GeoNames identifier, administrative containment, attraction type, and coordinates within 20 km. Records retain individual entity links, CC0 credits, and any explicit image identity. The QLever mirror, listed by Wikidata as an alternative endpoint, was available when the main query endpoint failed. [Knowledge-source provenance](knowledge-provenance.json) records the lookup coverage.

Additional city landmarks were individually researched to close country photo gaps and cover the final ten destinations. [The selections](verified-landmark-additions.json) retain research links; `scripts/import-researched-landmarks.ts` verifies their entity labels and coordinates against the selected city before import.

City labels are destination centers, rather than surveyed municipal boundaries. Source coordinates and addresses are preserved. Guide listings from another nearby travel area say which guide they came from and how far they are from the selected center. Country and city records do not imply that every place is popular, currently open, accessible, or suitable to visit. The app does not invent ratings, prices, or opening hours.

## Photographs

`shared/place-images.json` retains the individual file page, author, license, and matching method for each downloaded photograph. Matching uses explicit Commons filenames or Wikidata links; title-based Wikipedia matches also require nearby coordinates. Cards use locally stored images and retain their source and license links. Unmatched photos remain labeled unavailable, with a link to location photos.

New photographs receive a metadata check for licensing, artwork, logos, maps, and historical views. A visual sample covers 235 images across 124 countries; twelve selected replacements and country-gap photographs also received source, metadata, and visual review. This is not visual review of every file. [The review rejections](photo-review-rejections.json), [selected photographs](photo-review-replacements.json), and [metadata audit](photo-metadata-audit.json) preserve corrections. The bulk audit checked 11,625 files without failed batches and rejected 188. Wikimedia downloads use a supported 500-pixel thumbnail size, limited concurrency, and provider backoff.

## Refresh or resume

Node dependencies come from the app's existing `npm install`. Bulk guide and geographic imports additionally require 7-Zip. Overture research uses a workspace-local DuckDB CLI; the production app does not require it.

```powershell
npm run data:guide-dump
npm run data:expanded-guides
npm run data:guide-coordinates
npm run data:geographic
node scripts/download-overture-tools.mjs
npm run data:overture-query
& ./data/tools/duckdb/duckdb.exe data/sources/world-expansion/overture-places.duckdb -no-agent -bail -f data/sources/world-expansion/overture-import.sql
npm run data:overture-import
npm run data:coverage
npm run data:knowledge
node --import tsx scripts/import-researched-landmarks.ts
npm run data:expansion-photos
node --import tsx scripts/audit-expansion-photo-metadata.ts
node --import tsx scripts/import-review-replacements.ts
npm run data:coverage
node scripts/write-expansion-provenance.mjs
npm run build
npm test
npm run test:e2e
```

The SQL cache is tied to the recorded Overture release. Use a new analytical database when refreshing to a different release. The supplementary religious-landmark import for a cache built before those categories were added uses `npm run data:overture-query -- --supplement`, followed by the same DuckDB command and `data:overture-import`.

Raw source pages, API replies, candidate queues, analytical databases, and photo review sheets are cached under ignored `data/`. Keep that directory to resume research without repeating requests. The shipped records, images, source manifests, and reports are separate from account and itinerary storage. Rebuild after importing so the production `dist/` includes the new photo files.

The final ten additions have a separate [coverage and access report](FINAL-TEN-DESTINATIONS.md), [photo review](final-ten-photo-review.json), and [source lookup log](final-ten-source-log.json).
