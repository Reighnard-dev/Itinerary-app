# Roam — a little less ordinary

A responsive itinerary app built with HTML5, React + TypeScript, Tailwind CSS 4, a Node.js/Express API, and SQL. Supabase provides production authentication and PostgreSQL storage. Without credentials, a clearly labeled local mode uses SQLite and real local accounts so the complete app can be tried immediately.

## Run

Requires **Node.js 22.13+** (Node.js 24 LTS recommended) and npm.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` to the Node server on port 3001.

```sh
npm run build
npm start
```

The production server hosts both the built frontend and API at **http://localhost:3001**. Run it from the project root. To change the production port, set `PORT` in `.env`; development's API proxy expects port 3001.

Netlify uses `npm run build:netlify` and publishes `dist`. That build includes the worldwide destination index, destination artwork, and built-in listings as static files. Run `npm run test:netlify` after building to test country and city selection in a mobile-sized browser.

## Connect Supabase

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Copy `.env.example` to `.env`. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` using your project's URL and public anon/publishable key. Do not use a service role key.
3. In Supabase Authentication, enable Email sign-in. Set the Site URL and redirect allowlist to your app's URL, including `http://localhost:5173` for development. If email confirmation is enabled, users confirm their email before signing in.
4. Restart the server. The app automatically uses Supabase sessions, token refresh, email/password sign-up and login. The Node API validates access tokens with Supabase and queries PostgreSQL under the user's identity. SQL row-level security restricts reads and writes to the trip owner.

Production should use HTTPS. Set `COOKIE_SECURE=true` when running local-account mode over HTTPS. Never commit `.env` or `data/`. The app does not require or expose a Supabase service role key.

## Features

- Sign-up, login, logout, session restoration, and account-specific trip storage.
- Worldwide selection of **250 countries and territories and 34,240 cities and larger towns**, with searchable city suggestions, an optional start date, and 1–30 day trips.
- Expanded built-in places across the 144 countries and territories in the destination expansion, plus the original catalog and on-demand guide/map discovery. [The coverage audit](research/DESTINATION-COVERAGE.md) reports actual coverage and remaining empty cities; selection does not guarantee a complete local guide.
- Landmarks, restaurants, parks and gardens, activities, beaches, markets, cafés, shopping, and nature, with individual source and photo credits. Geographic records identify places but do not verify visitor access or tourist popularity.
- Name/description search, experience chips, iconic/hidden/favorites filters, sorting, and incremental loading of 24 results. Original stars are editorial scores; imported listings have no fabricated ratings.
- Responsive photographic discovery cards, saved favorites, and a side-by-side trip builder.
- **Multiple cities in one country itinerary**, with editable titles, dates, visit times, and notes. Reorder using drag handles or accessible arrow buttons; move stops between days or remove them. Shortening a trip moves later stops onto its final day. Saved stops include their place details so guide listings can be reopened without repeating a live lookup.
- OpenStreetMap location maps, general public/private transportation advice, and Google Maps directions for driving, public transit, or walking from an optional origin. Live routes and schedules are provided by the linked Maps service. No API keys required.
- Multiple trips, browser draft persistence, explicit **Save to account**, account retrieval, deletion confirmation, and downloadable text itineraries with map links.
- Modal focus containment, Escape dismissal, keyboard controls, responsive mobile layouts, image fallbacks, and reduced-motion support.

`shared/catalog.ts` contains the original handpicked places; `shared/expanded-places.json` and `shared/researched-places.json` contain attributed guide imports. The additional map and geographic catalogs include the compressed `shared/overture-places.json.gz`. `shared/world-cities.json` holds the location index. The frontend requests only the selected city's listings; the full place dataset stays on the Node server. Destination photographs and officially sourced fonts are bundled locally. The hero uses destination inspiration; place cards use exact-place photographs when matched. Maps, live discovery, and cloud accounts require network access; built-in discovery, local accounts, and itinerary editing work without Supabase.

Restaurant and venue details include available addresses, guide-listed hours, phone numbers, venue links, and a link to the source revision. Guide details can be out of date; confirm current opening, prices, and reservations with the venue. Durations are planning suggestions. Guide-derived descriptions retain their CC BY-SA 4.0 attribution in the app. See [DATA-SOURCES.md](DATA-SOURCES.md) for coverage, licenses, source links, and refresh instructions.

The header keeps its text above a 2.4-second photographic crossfade, provides pause/play, and honors reduced-motion preferences. Release photographs have current Wikimedia source-license evidence, retained attribution notices and file hashes. Unlicensed venue/news/search images and untraced assets are quarantined outside public delivery. Places without a verified location photo use visibly labeled photorealistic AI-generated scenic atmosphere; these fictional scenes do not document the named landmark. Verified photos take priority. See [the atmosphere update](research/rights/ATMOSPHERE-UPDATE.md) for generation provenance and disclosure. Photo credits cover the hero, cards and itinerary thumbnails. See [COPYRIGHT-AUDIT.md](COPYRIGHT-AUDIT.md) before adding new assets; importing a file alone does not clear it for release.

Live discovery uses Wikimedia and OpenStreetMap without an API key. Complete results are cached in SQL for seven days; partial failures use five minutes and empty results one hour. Identical concurrent requests are combined, and each client is limited to 300 uncached searches per hour. Previously cached listings remain usable during provider failures. Stored listings appear without waiting for live research. Cities without stored records attempt live discovery; additional live research is available on request. Uninhabited territories and very small places may have no usable guide or map listings. Selecting a country in the index does not guarantee a complete local travel guide. See [the country expansion report](research/COUNTRY-EXPANSION.md) for measured coverage and refresh commands.

## Storage and authentication

Local data is stored in `data/roam.sqlite`. Passwords use scrypt with per-account random salts. Local sessions use random tokens in HttpOnly, SameSite cookies; only token hashes are stored in SQL. Sessions expire after seven days. Authentication endpoints include request limits. Local mode is intended for development and self-hosted previews, rather than an internet-facing identity service.

Guest drafts stay in browser localStorage. **Save to account** writes a trip through the API. Changes remain local until saved again. Local drafts are scoped to each account; guest plans can be carried into a newly created account. Sign out before sharing a device, and use separate browser profiles on shared computers because browser storage is not encrypted.

## Verify

```sh
npm run build
npm test
npm run test:e2e
```

End-to-end tests use an installed Google Chrome, a separate server on port 3101, and an isolated SQL database in `data/e2e/`. They exercise sign-up, invalid login, session restoration, worldwide autocomplete, restaurants and parks, source attribution, pagination, multi-city plans, editing, maps and transport, exporting, mobile layout, SQL snapshots, provider errors, deletion, and owner isolation. Live-provider UI tests use deterministic responses; a separate live request can verify the public service. For environments without Chrome, install Playwright Chromium and remove `channel: 'chrome'` from `playwright.config.ts`.

Supabase's live authentication, confirmation emails, and PostgreSQL policies must additionally be verified against your configured project; those external operations cannot be tested without project credentials.

Implementation references: [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite), [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [server-side user validation](https://supabase.com/docs/reference/javascript/auth-getuser).
