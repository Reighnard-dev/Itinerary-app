# Full catalog photo recovery

This recovery is scoped to every catalog listing missing a reusable photograph, using free reusable sources only. The initial inventory contains 216,952 listings, including restaurants, shopping venues, parks, and landmarks. The earlier 3,880 figure counted quarantined assets, not missing places.

`inventory.json` preserves the initial missing-photo list. `outcomes.jsonl` records successive results per place; the last row for each ID is its latest outcome. `progress.json` is a checkpoint, not a declaration that the requested coverage is complete. A `no-exact-article-photo` outcome only describes that research route; it does not establish that no reusable photograph exists anywhere.

The article recovery uses direct place-source image identities, linked Wikidata identities with location checks, and named Wikipedia articles with matching coordinates. Additional article images are considered when the main image is excluded and the filename identifies the named subject. Commons metadata must pass the existing reuse-license policy. Each new file has a retained API response, individual attribution/license/notices, download URL, and SHA-256 byte evidence. GPS discrepancies, archival metadata, and broad visitor-center associations receive additional rejection checks.

The independent knowledge search checks exact English labels against coordinates within 500 metres. Its results are candidates only; they must pass the same Commons license, location, quality and byte-evidence checks before use. Service rate limits and lag responses are respected. Requests and results are checkpointed for resumption.

Private review sheets live under `data/photo-review/sheets/`. Visual rejections are recorded in `visual-decisions.json`; `review-full-photo-recovery.ts` applies these decisions, rechecks the location/freshness policy, and moves this recovery's unreferenced rejected downloads into private review storage. It does not restore any previously quarantined files.

Commands:

```
npx tsx scripts/backfill-all-landmark-photos.ts
npx tsx scripts/research-missing-photo-entities.ts
npx tsx scripts/backfill-all-landmark-photos.ts --knowledge-only
npx tsx scripts/research-replacement-categories.ts
npx tsx scripts/backfill-all-landmark-photos.ts --category-only
npx tsx scripts/backfill-all-landmark-photos.ts --retry-downloads
npx tsx scripts/repair-photo-recovery-checkpoints.ts
node scripts/render-recovery-review.mjs
npx tsx scripts/review-full-photo-recovery.ts
npm run build
```

Run only one importer that writes the manifests at a time. The knowledge search and rendering are read/research operations and may run alongside the importer. Apply the final quality review after import completion, then rebuild to publish the approved asset index and credits.

Free sources cannot be presumed to cover every business or attraction. Unresolved listings need more research, permission from a photographer, or original photography. A recorded photographer license does not certify uploader ownership or all underlying artwork/personality/property rights. These tools do not claim legal certification or complete coverage.

The recovery also checks explicit public-domain creator releases when Commons omits a separate license URL. This requires a named creator, `Own work`, `Copyrighted=False`, and either an explicit permission statement or a `PD-self` dedication in the retained source revision. Ambiguous public-domain claims and unknown creators remain rejected. Structured metadata is CC0; source wikitext is by Wikimedia Commons contributors under CC BY-SA 4.0, with original file URLs and revision IDs retained. Photographs keep their individual grants. See DATA-SOURCES.md.
