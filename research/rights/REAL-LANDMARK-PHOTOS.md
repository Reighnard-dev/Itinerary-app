# Real landmark photo recovery

This first recovery batch adds 12 individually matched photographs: Ta Phin Village, Silver Waterfall, Tegallalang Rice Terraces, Yanaka Ginza, Todoroki Valley, Sidemen Valley, Tukad Cepung Waterfall, Quartiere Coppede, Weissenau Nature Reserve, Bang Krachao, Bojo River, and Osmena Peak.

Each selection was checked against the photographer's description and location information, previewed visually, and passed through the existing commercial photo license policy. Retained Commons API responses, download receipts, creator credits, license links, notices, and SHA-256 byte evidence accompany the imports. Display crops retain the source license and ShareAlike notices on the existing credits page.

Selections: `landmark-photo-selections.json`. Results and individual sources: `landmark-photo-import.json`. Search evidence: `photo-discovery/`. License metadata: `commons-evidence/landmark-*.json`. Download previews/receipts are private in `data/photo-review/`.

To extend the batch, use `npx tsx scripts/research-missing-photos.ts 'search terms'`, review the returned source descriptions, location and license metadata, then add exact file selections and identity evidence to the selection JSON. Run `npx tsx scripts/import-cleared-landmark-photos.ts` to download private previews. After visually reviewing the previews, run the same command with `--apply`, followed by `npm run build`. The importer checkpoints evidence and uses atomic manifest updates. The existing build gate verifies source evidence and approved bytes before publication.

The browsing endpoint intentionally avoids starting a long queue of external research requests for missing bundled photos. Imported photos join its canonical photo index and replace generated fallbacks automatically. Existing verified photos keep priority.

Coverage is incomplete. Searches in this batch did not establish acceptable exact-location photos for Ban Ho Village, Love Waterfall, Sun Plaza, Rong May Glass Bridge, Hotel de la Coupole, Silk Path Grand Sapa Resort, Victoria Sapa Resort, Topas Ecolodge, Pao's Sapa Leisure Hotel, Red Dzao House, Le Gecko, Hoa Tam Vegetarian Restaurant, or the current Sa Pa Market building. Similar names returned unrelated places, broad landscapes, old market views, and other hotels; these were not imported. This is not proof that no reusable photo exists. Additional source research, owner permission, or commissioned photography is required to close those gaps.

The original 3,880 quarantined files remain excluded; that number includes duplicate/unused assets and is not a count of unique missing landmarks. This recovery batch does not claim full catalog coverage or certify third-party uploader ownership.

Validation: `npm run build` completed successfully, including both release gates (14,372 verified photo records; 26,550 packaged/source assets checked; zero unapproved assets or release issues). The 13 focused photo/license tests and all three targeted browser tests passed. Browser checks cover every imported photo through the API, credited Ta Phin cards, desktop/mobile rendering, quarantined URL rejection, and navigation responsiveness. The running localhost preview returned HTTP 200 for the new Ta Phin photo.
