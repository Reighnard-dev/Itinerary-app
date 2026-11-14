# Copyright remediation — 13 November 2026

Subsequent visual update: the user approved six shared photorealistic AI-generated atmosphere scenes for missing-photo cards. Verified location photos keep priority, and fictional scenes are visibly labeled. See [the atmosphere update](research/rights/ATMOSPHERE-UPDATE.md) for current behavior and provenance; references below to normal text-only absence panels describe the earlier remediation state.

The local release excludes photographs without documented reuse evidence. It keeps actual location photography and uses a plain text absence panel where a cleared exact-place photo is unavailable. This is a technical remediation and evidence inventory, not a legal opinion or a guarantee of ownership.

The remediated release retains **13,252 photographic files**, with **8 photographic hero slides**. It removes **3,319 unresolved source/photo records** from active data, quarantines **3,880 media assets**, and recovers cleared exact-place matches for **842 listings**. Counts overlap across manifests and duplicate thumbnails; the machine-readable inventory is authoritative.

## What was checked and fixed

- Enumerated current source catalogs and manifests, public media, compiled public media, local photo-cache records, font files, browser asset references, and installed software notices. The original audit found 1,809 unresolved photo records and 1,020 unmapped asset copies; records and duplicate files overlap.
- Retrieved current Wikimedia file metadata for all 14,722 distinct recorded source-photo URLs. Saved complete API responses, including creator, license, attribution, copyright, usage and restriction fields, under `research/rights/commons-evidence/`. Files with missing/unsupported licensing, generic attribution, additional restrictions, or unsuitable subject metadata are excluded. No permission was inferred from a source credit or an image-search result.
- Removed unresolved web, venue and news photographs from active manifests and public directories. The former files/manifests are preserved privately under gitignored `data/rights-quarantine/`, together with their original hashes. **Do not upload or serve that directory.** `research/rights/remediation.json` lists every removed record and moved asset. This preserves research evidence; quarantine does not grant reuse rights.
- Reused cleared images only for the same named location within 500 metres. Rebuilt the hero from cleared location photos. Removed the category-illustration assets from public delivery and replaced the old illustrated error image with a text-only panel. Missing photographs are not represented by a different attraction.
- Bound retained local photo bytes to their import metadata, live source-license evidence and SHA-256 hashes in `research/rights/asset-evidence.json`. This binds the existing import records to retained bytes; it is not an independent forensic finding about photographer ownership or a new full-image comparison against every remote original.
- Added complete, linked photo credits at `/photo-credits.html`, retained extra notices and cropping/adaptation information, and linked credits from hero slides and itinerary/saved-trip thumbnails. Incoming and outgoing hero photographs both retain credits while fading. Runtime photo credits are also available at `/api/photo-credits`.
- Historical saved snapshots use canonical server/bundled photo metadata. Production static delivery refuses unapproved or changed media, and cached photos require license evidence and matching byte hashes. Legacy venue/news downloads are disabled. New live photographs must pass current Wikimedia metadata and reuse checks. Missing bundled photos return immediately; background lookups use at most two browser connections so image research cannot starve navigation.
- Replaced untraced font binaries with official Google Fonts DM Sans and Manrope variable fonts. Pinned upstream commits, file hashes and full OFL notices are retained. Completed notices for 224 installed software packages, including the seven packages without a top-level notice. The upstream supplemental notices are preserved with their source URLs. Supplied authors/contributors and Lightning CSS MPL source-availability links are included.
- Retained Wikivoyage CC BY-SA attribution and adaptation terms; GeoNames CC BY attribution; Wikidata CC0; OpenStreetMap ODbL attribution and adapted extract downloads; and Overture provider, CDLA, Apache and Foursquare notices. Removed one venue-source listing that had unlicensed prose instead of assigning it an invented open license. Source data downloads are linked from `/credits.html`.
- `npm run build` now checks evidence before building and audits the resulting public assets afterward. `npm start` also checks the release. Unknown assets, changed hashes, unsupported photo/data licenses, missing source records and missing notices fail the gate. The gate does not certify legal clearance.

## Evidence and verification

- `research/rights/photo-verification-summary.json`: completed source-photo verification totals.
- `research/rights/inventory.json`: current source/media inventory and release issue count.
- `research/rights/needs-review.json`: exact remaining technical blockers, if any.
- `research/rights/remediation.json`: removed records, privately quarantined asset hashes and recovered exact matches.
- `research/rights/upstream-evidence.json`: official font and supplemental software-notice sources and hashes.
- `research/rights/approved-assets.json`: current public-media allowlist; generated from checked evidence, not filename alone.
- `research/rights/folder-scan.json`: current workspace file counts (including dependencies, ignored research and quarantine) and application-source provenance-marker scan; credential/account contents were not read.

Recheck with `npm run build`, `npm test`, `npm run test:e2e`, and `npm run release:check`. Current test results and totals are recorded in `research/rights/validation.json` after verification.

## Scope limits before launch

1. **Existing deployments/CDNs:** this work updates the workspace. Replace old deployment artifacts and purge old image URLs/CDN caches and previous public bundles. No hosting account or remote deployment was accessed. Deploy the generated app assets and server inputs only; never deploy the entire workspace or private `data/` research tree.
2. **Ownership and local law:** a Commons uploader's license is evidence, not a warranty. Files with explicit restriction metadata were excluded, but metadata can omit artwork, architecture, property, personality, privacy or moral-rights concerns. Obtain jurisdiction-specific legal review for the actual markets and promotional use, and investigate any rights complaint. Removing licensing uncertainty from the local release does not establish zero legal risk.
3. **Original work and branding:** no upstream application template/license was found in the project source. Repository history cannot establish independent authorship or detect every copied passage. Confirm ownership/assignments for any externally supplied code or copy. The Roam name needs a separate trademark clearance; that is distinct from copyright.
4. **Remote accounts and historical material:** remote Supabase data, user-authored notes/uploads, older deployments and full historical Git objects were not cleared or deleted. The current UI filters stale photo snapshots and the server refuses removed local URLs, but a separate app consuming old snapshots needs the same policy. Keep required attribution when exporting or redistributing licensed data; user notes do not acquire a third-party open license merely by being saved.
5. **Future additions:** do not reuse the old web-photo research queue as an import approval. New static photographs need a source check, retained notices, a verified download/byte record and an updated credit index before release. The initial remediation script intentionally refuses a second bulk run.

## Primary licensing references

- [Creative Commons BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — attribution, change notices, ShareAlike and limits of the license.
- [Wikimedia reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) — file-specific licenses and additional rights.
- [Wikivoyage copyleft](https://en.wikivoyage.org/wiki/Wikivoyage:Copyleft).
- [OpenStreetMap copyright and ODbL](https://www.openstreetmap.org/copyright).
- [GeoNames export and attribution](https://www.geonames.org/export/).
- [Overture licensing](https://docs.overturemaps.org/attribution/) and [Foursquare provider notice](https://opensource.foursquare.com/places-notice-txt/).
