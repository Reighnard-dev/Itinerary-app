# Destination and place data

Snapshot retrieved **11 November 2026**. Country and city coverage and venue coverage are distinct: the country selector is worldwide, while built-in venue records cover selected destinations. Additional cities can load guide listings on demand when an English-language guide has geocoded listings.

## GeoNames location index

- Source: [GeoNames geographic database](https://www.geonames.org/), [export documentation](https://download.geonames.org/export/dump/readme.txt).
- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
- Files: [countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt), [cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip), [admin1CodesASCII.txt](https://download.geonames.org/export/dump/admin1CodesASCII.txt).
- Local adaptation: `shared/world-cities.json` includes 250 countries/territories and 34,224 city/town labels. The source primarily includes populations above 15,000 and capitals; it does not enumerate every village. A few popular destination aliases, including island regions, retain existing app labels. Duplicate names are disambiguated by region. Obsolete Netherlands Antilles and Serbia and Montenegro records are excluded.
- Empty city lists are retained transparently for territories without records in this extract. No coordinates or attractions are invented to fill these gaps.

To rebuild, download and extract these files into `data/sources/`, then run `npm run data:world`. `scripts/import-world.mjs` documents the transformations and aliases.

## Wikivoyage listings

- Source: [English Wikivoyage](https://en.wikivoyage.org/), by Wikivoyage contributors.
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); see [Wikivoyage copyleft](https://en.wikivoyage.org/wiki/Wikivoyage:Copyleft). **The adapted guide dataset and guide-derived descriptions remain available under this license.** This notice applies to that content, independently of the application source code.
- Listing format: [Wikivoyage listings documentation](https://en.wikivoyage.org/wiki/Wikivoyage:Listings).
- API: [MediaWiki parsing API](https://www.mediawiki.org/wiki/API:Parsing_wikitext).
- Local adaptation: 5,945 geocoded guide records in `shared/expanded-places.json`, combined with the original 34 handpicked entries and deduplicated to **5,975 built-in places**.
- Each imported entry includes the source article and revision, retrieval date, license, coordinates, and available venue website, address, phone, and guide-listed hours. Descriptions are plain-text, shortened adaptations of guide listings. App-added category, illustration, and suggested duration are editorial transformations. Imported records have no invented review scores, and a general guide listing is not labeled a hidden gem.
- Listings without coordinates, accommodation sections, transport facilities, and points more than 120 km from the selected destination are excluded. Island destinations include nearby settlements and are not presented as separate cities. An indexed city does not guarantee that its English guide has geocoded listings.
- Opening hours, descriptions, prices, venue ownership, and access details can change. Retrieval is not independent venue verification. The app links to the venue and source so travelers can check current details.

Run `npm run data:guides` to resume importing the configured destinations. It reuses raw-page caches in `data/sources/guides/`. Use `npm run data:guides -- --refresh` to retrieve fresh guide pages and replace records for those destinations. Keep attribution fields with adapted or redistributed data. Build again after updating either dataset.

## Built-in destination coverage

| Country | Cities / destination areas |
| --- | --- |
| Japan | Kyoto, Tokyo, Osaka, Nara |
| Indonesia | Bali, Jakarta, Yogyakarta |
| France | Paris, Lyon, Nice |
| Italy | Rome, Venice, Florence |
| Switzerland | Interlaken, Zurich, Lucerne |
| Thailand | Bangkok, Chiang Mai, Phuket |
| Philippines | Cebu, Manila, El Nido, Baguio |
| Singapore | Singapore |
| South Korea | Seoul, Busan |
| Vietnam | Hanoi, Ho Chi Minh City |
| Malaysia | Kuala Lumpur, George Town |
| United Kingdom | London, Edinburgh |
| Spain | Barcelona, Madrid |
| Portugal | Lisbon, Porto |
| Netherlands | Amsterdam |
| Germany | Berlin, Munich |
| Greece | Athens |
| Austria | Vienna |
| Czechia | Prague |
| United States | New York City, San Francisco |
| Canada | Toronto, Vancouver |
| Mexico | Mexico City |
| Brazil | Rio de Janeiro |
| Australia | Sydney, Melbourne |
| New Zealand | Auckland, Queenstown |
| United Arab Emirates | Dubai, Abu Dhabi |
| India | Delhi, Jaipur |
| Turkey | Istanbul |
| Egypt | Cairo |
| Morocco | Marrakesh |
| South Africa | Cape Town |

## Images, maps, and transport

Place cards use researched photographs of the named location when available. Unresolved places use a labeled placeholder and a link to location photos. See `public/ASSET-CREDITS.md` for photo and font credits.

### Exact-place photographs

`shared/photo-identities.json` preserves Wikidata and Wikipedia identifiers explicitly linked by the source listing. `npm run data:photos` researches those identifiers and exact Wikipedia article titles; ambiguous title-only matches also require nearby geographic coordinates. Accepted photographs are cached in `public/images/places/`, with photographer, file-page source, license, and matching method recorded in `shared/place-images.json`. The app displays attribution on cards and in place details. The importer rejects logos, maps, unlicensed files, and unrelated geographic matches, and caches source API responses to resume interrupted imports.

Wikimedia imports accept freely licensed or public-domain photographs. Additional linked-identity imports are recorded in `shared/entity-photo-candidates.json`. Smaller venues are also researched through their public websites and image-search source pages: `shared/venue-photo-candidates.json` and `shared/web-photo-candidates.json` retain the individual source page, image title, source credit, and matching method. These additional images retain their original rights; they are not represented as Creative Commons images. Source credits remain visible in the app. Raw research results are retained under `data/sources/` for review.

Web matches require the named place and destination, reject logos, maps, illustrations, food-only close-ups, and paid-stock sources, and prefer views of the actual venue or attraction. Downloads are cached locally, so cards do not depend on live third-party image URLs. Availability still varies. An unavailable exact image is labeled as such and links to location photos on Maps; the app does not substitute an unrelated attraction or a generic category photo. On-demand guide listings use the exact-article and coordinate rules, with server-side image caching.

Research resumed on 12 November 2026 on a new device. The existing manifests and assets were preserved; the ignored `data/` research history was absent and had to be reconstructed. This pass added 32 visually reviewed exact-location photographs after 448 individual searches and 13 targeted follow-ups. Coverage is now **3,995 of 5,975 places**, with **1,980 unresolved** and **3,936 unique referenced photo files**. These totals include overlapping manifests and are not their simple sum. See `PHOTO-RESEARCH-CHECKPOINT.md` for the precise queue state and migration instructions.

`shared/web-photo-exclusions.json` records rejected web-image URLs alongside the existing Wikimedia filename exclusions. The offline selector consults both lists, rejects nearby-hotel results and explicitly described composites, and requires address evidence for additional known multi-branch venues. Web search results from Wikimedia must use the Wikimedia import workflow to resolve their individual author and license. Visual review remains necessary: a successful name match or download is not acceptance.

Photo metadata uses the [PageImages API](https://www.mediawiki.org/wiki/API:Pageimages), [Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo), and source-linked Wikidata identifiers. Source requests are paced and respect server backoff. Set `PHOTO_SOURCE_CONTACT` to your deployment's public URL or contact address. Provider rate limits and replication lag may pause parts of an import; cached work is retained.

Maps use OpenStreetMap embeds with attribution. Directions link to Google Maps for current public transit, walking, and driving routes; route availability and service vary by destination. A map link is not a transit timetable or a guarantee of access.
