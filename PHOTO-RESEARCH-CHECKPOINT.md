> Historical photo-research checkpoint. The 13 November copyright remediation supersedes its asset counts and import instructions. See COPYRIGHT-AUDIT.md before resuming this queue; source credits are not reuse permission.

# Photo research checkpoint — 12 November 2026

This is the historical checkpoint before the 13 November country expansion. See [the current country expansion report](research/COUNTRY-EXPANSION.md), coverage audit, and photo metadata audit for the later work.

Project on this device: `C:\Users\admin\Desktop\Itinerary-app`.

Research resumed under the user's explicit authorization. It is **incomplete**, not paused at the user's request. No research/import process remains running. The production preview was rebuilt and restarted at http://localhost:3001.

## Coverage

| Measure | Before | Current |
| --- | ---: | ---: |
| Unique built-in places | 5,975 | 5,975 |
| Places with accepted local photographs | 3,963 | 3,995 |
| Unresolved photo gaps | 2,012 | 1,980 |
| Unique referenced photo files | 3,904 | 3,936 |
| Wikimedia manifest records | 1,906 | 1,906 |
| Linked-identity manifest records | 325 | 325 |
| Venue-site manifest records | 25 | 25 |
| Web-researched manifest records | 1,736 | 1,768 |

The 32 additions were reviewed visually. No pre-existing manifest entry was changed or removed. Individual source rights, source links, and photographer/supplied credits are retained. Photos selected in intermediate stages and rejected later are excluded from the manifest. Their downloaded assets were retained; do not infer acceptance from file presence.

## Reconstructed research history

The repository transfer included all original manifests and local photo assets, but **no `data/` directory**. Consequently the previous checkpoint notes, 27 imported batches, raw searches, and review records were unavailable here. `shared/photo-exclusions.json` was present and remains intact. Do not claim the old raw searches were recovered or that the reconstructed queue is identical to the old 4,082-record queue.

This device now has:

- A reconstructed 4,073-record queue. Its size excludes primary Wikimedia matches and follows the existing queue script's behavior.
- 448 saved individual first-pass results in `data/sources/image-search/`.
- 13 saved targeted follow-ups in `data/sources/image-search-refined/`.
- 2,509 queue records accounted for by existing accepted sources or this device's saved searches. This is **not** a photo coverage count or a count of searches performed in this pass.
- 1,564 queue records still needing an individual first-pass search on this device.
- 10 staged batch files, all with processing/review markers and none pending. Batches `00002` and `00005` were screened, with selected alternatives copied into later batches rather than importing their unscreened top results.

There are 1,980 unresolved photos overall: some places have already been researched but lack an accepted/downloadable image. Continue the remaining first-pass searches, then refine unresolved identities, names, addresses, and branches. The first pending record at this checkpoint is MOIS Dance Club, George Town.

## Review and safeguards

`shared/web-photo-exclusions.json` contains persistent rejected URLs. The selector also consults the existing Wikimedia filename exclusions. Rejected results included nearby hotels, other branches, book covers, anniversary graphics, portrait-led images, composites/collages, and a restaurant source reporting permanent closure. Existing photos were preserved.

Targeted aliases were reviewed individually rather than weakening the global selector: Suyeong History Park / Suyeong Sajeok Park; Twenty-Three September Park / September 23 Park; OCBC Garden Rhapsody / Garden Rhapsody; Burnham boating / Burnham Lake; and Đại Nam's actual Bình Dương location. Yanaka Ginza was researched as a named shopping street despite its existing Food & drink category. Restaurant sources with addresses were checked against the listed branch. Do Farai uses a current venue-owner interior at Dorsoduro 3278 after its source described new ownership.

All newly referenced photos are listed with place IDs, metadata and source URLs in `data/photo-review/resumed/entries.json`. Contact sheets cover **every** new photo, not a sample. `ui-check.json` records the new-card/detail credit checks. Additional source and rejection records are in that directory. The full decoding audit and source samples are in `data/photo-review/`.

## Verification

- `npm run build`: passed.
- `npm test`: all 25 checks passed, including four new web-selector regression checks.
- `npm run test:e2e`: all 9 browser checks passed.
- `node scripts/audit-place-photos.mjs`: all 3,936 referenced files decoded; zero failures.
- `node scripts/photo-visual-check.mjs`: no page errors, no mobile overflow, zero unloaded images in a 32-image sample.
- `node scripts/check-resumed-photo-ui.mjs`: new Garden Rhapsody and Yanaka Ginza images decoded; source/rights credits visible; no page errors or mobile overflow.
- All 32 new photos visually inspected; production preview restarted after the updated build.

Node on this device is v26.13.1. Chrome's localhost requests and the importer's external DNS were blocked in the execution sandbox; approved outside-sandbox runs completed those checks/downloads. The initial sandbox decoding failures were environmental, not corrupt assets. The audit now navigates to its local origin before decoding to support current Chrome restrictions. Do not use that initial failed attempt as the final coverage report.

## Resume

1. Read this file and `data/PHOTO-CHECKPOINT.md`, `data/photo-work-notes-current.md`, and `data/photo-coverage.json` when available.
2. Run `node scripts/missing-photo-list.mjs --single-pending 1`.
3. Reuse saved results with `node scripts/assemble-image-search-batches.mjs --refresh`; inspect selections before accepting them.
4. Remove `data/web-photo-batches/DONE` only when intentionally starting a watch importer. This marker means the current download session has settled, **not** that photo research is complete.
5. Run `node --import tsx scripts/import-web-photo-batches.ts --watch` with network access. Stop it before any external manifest cleanup.
6. The tool orchestration helper still needs a real `tools` object exposing `exec_command`, `web__run`, and `apply_patch`. It was invoked through this environment's `functions.exec`, with raw tool results saved in the existing format. Running it as an ordinary Node command does not perform searches.
7. Review each addition, preserve rights metadata, rebuild, restart the preview, audit, and update this checkpoint.

`scripts/write-photo-checkpoint.mjs` now accepts `--status "..."` instead of always claiming the user paused. `scripts/review-resumed-photos.mjs` accepts an optional baseline coverage JSON argument; its default is this pass's baseline. It renders source files directly and fails if a review image cannot decode.

## Transfer this work

`data/` remains ignored because it also contains local account databases. To transfer the research, copy the photo research data explicitly or use `data/photo-research-checkpoint-2026-11-12.zip`. That archive contains research/checkpoint files only, with project-relative paths; it excludes SQLite accounts, sessions, and environment credentials. Extract it into the project root on the next device. Also transfer the current tracked manifests, exclusions, scripts, and `public/images/places/` assets. The archive alone does not contain the photo assets.
