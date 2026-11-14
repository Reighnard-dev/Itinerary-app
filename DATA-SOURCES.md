# Destination and place data

The **13 November 2026 country expansion** adds the requested 144 countries and territories using attributed guide, map, and geographic records. Current totals, remaining empty cities, category gaps, photo coverage, source provenance, and refresh instructions are in [research/COUNTRY-EXPANSION.md](research/COUNTRY-EXPANSION.md) and its linked audit. The destination table and photo checkpoint below describe the original catalog before this expansion.

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

The release uses individually checked Wikimedia photographs. Current file-page metadata, creator, license, retained notices and restrictions are recorded under research/rights/commons-evidence/; retained bytes are hashed in research/rights/asset-evidence.json. Venue, news and image-search photographs without reuse evidence have been removed from active manifests and public directories. Former assets and manifests are quarantined under gitignored data/rights-quarantine/, which must never be deployed. Credits alone do not grant permission. See COPYRIGHT-AUDIT.md for the remediation and scope limits.

Web matches require the named place and destination, reject logos, maps, illustrations, food-only close-ups, and paid-stock sources, and prefer views of the actual venue or attraction. Downloads are cached locally, so cards do not depend on live third-party image URLs. Availability still varies. An unavailable exact image is labeled as such and links to location photos on Maps; the app does not substitute an unrelated attraction or a generic category photo. On-demand guide listings use the exact-article and coordinate rules, with server-side image caching.

Photo counts in PHOTO-RESEARCH-CHECKPOINT.md describe historical research before the 13 November rights remediation. They are not current permission counts. The current inventory and removals are in research/rights/inventory.json and research/rights/remediation.json. A place without a verified exact-place photograph now shows clearly labeled photorealistic AI-generated atmosphere and retains its Maps photo link in the detail panel. These fictional scenes are not presented as photographs of the named location or assigned Creative Commons photo licenses. See research/rights/ATMOSPHERE-UPDATE.md and shared/atmosphere-assets.json.

`shared/web-photo-exclusions.json` records rejected web-image URLs alongside the existing Wikimedia filename exclusions. The offline selector consults both lists, rejects nearby-hotel results and explicitly described composites, and requires address evidence for additional known multi-branch venues. Web search results from Wikimedia must use the Wikimedia import workflow to resolve their individual author and license. Visual review remains necessary: a successful name match or download is not acceptance.

Photo metadata uses the [PageImages API](https://www.mediawiki.org/wiki/API:Pageimages), [Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo), and source-linked Wikidata identifiers. Source requests are paced and respect server backoff. Set `PHOTO_SOURCE_CONTACT` to your deployment's public URL or contact address. Provider rate limits and replication lag may pause parts of an import; cached work is retained.

Maps use OpenStreetMap embeds with attribution. Directions link to Google Maps for current public transit, walking, and driving routes; route availability and service vary by destination. A map link is not a transit timetable or a guarantee of access.

The full missing-photo recovery is recorded in `research/rights/full-photo-recovery/`. Structured Commons metadata is CC0; archived Commons file-description wikitext is by Wikimedia Commons contributors under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with original file URLs and revision IDs retained in the API responses. These archives preserve source evidence and are not served as app content. Photographs retain their individual grants, creators and notices in the photograph credits.

Public-domain self-releases with no separate license URL are accepted only with a named creator, an own-work statement, a non-copyrighted metadata flag, and an explicit creator release or a recorded `PD-self` declaration in the file's source revision. The photo credit links to that file's licensing declaration; the source snapshot and byte hash are retained. A generic public-domain label, unknown author, or source-site credit alone does not satisfy this recovery path. Commons' [PD-self terms](https://commons.wikimedia.org/wiki/Template:PD-self) describe the creator dedication. See the recovery README for the research coverage and remaining gaps.
