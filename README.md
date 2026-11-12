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

## Connect Supabase

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Copy `.env.example` to `.env`. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` using your project's URL and public anon/publishable key. Do not use a service role key.
3. In Supabase Authentication, enable Email sign-in. Set the Site URL and redirect allowlist to your app's URL, including `http://localhost:5173` for development. If email confirmation is enabled, users confirm their email before signing in.
4. Restart the server. The app automatically uses Supabase sessions, token refresh, email/password sign-up and login. The Node API validates access tokens with Supabase and queries PostgreSQL under the user's identity. SQL row-level security restricts reads and writes to the trip owner.

Production should use HTTPS. Set `COOKIE_SECURE=true` when running local-account mode over HTTPS. Never commit `.env` or `data/`. The app does not require or expose a Supabase service role key.

## Features

- Sign-up, login, logout, session restoration, and account-specific trip storage.
- Worldwide selection of **250 countries and territories and 34,224 cities and larger towns**, with searchable city suggestions, an optional start date, and 1–30 day trips.
- **5,975 built-in places across 60 destinations in 31 countries**, plus on-demand discovery from English-language Wikivoyage city and district guides. Coverage varies by city; this is not an exhaustive inventory of every venue in the world.
- **1,602 restaurants, 178 parks and gardens, 573 activity listings**, plus landmarks, beaches, markets, cafés, shopping, and nature. Categories overlap conceptually but each listing has one primary filter.
- Name/description search, experience chips, iconic/hidden/favorites filters, sorting, and incremental loading of 24 results. Original stars are editorial scores; imported listings have no fabricated ratings.
- Responsive photographic discovery cards, saved favorites, and a side-by-side trip builder.
- **Multiple cities in one country itinerary**, with editable titles, dates, visit times, and notes. Reorder using drag handles or accessible arrow buttons; move stops between days or remove them. Shortening a trip moves later stops onto its final day. Saved stops include their place details so guide listings can be reopened without repeating a live lookup.
- OpenStreetMap location maps, general public/private transportation advice, and Google Maps directions for driving, public transit, or walking from an optional origin. Live routes and schedules are provided by the linked Maps service. No API keys required.
- Multiple trips, browser draft persistence, explicit **Save to account**, account retrieval, deletion confirmation, and downloadable text itineraries with map links.
- Modal focus containment, Escape dismissal, keyboard controls, responsive mobile layouts, image fallbacks, and reduced-motion support.

`shared/catalog.ts` contains the original handpicked places; `shared/expanded-places.json` contains the attributed guide import. `shared/world-cities.json` holds the GeoNames location index. The frontend requests only the selected city's listings; the full place dataset stays on the Node server. Destination photos, category illustrations, and fonts are bundled locally. The hero uses destination inspiration; place cards use exact-place photographs when matched. Maps, live guide discovery, and cloud accounts require network access; built-in discovery, local accounts, and itinerary editing work without Supabase.

Restaurant and venue details include available addresses, guide-listed hours, phone numbers, venue links, and a link to the source revision. Guide details can be out of date; confirm current opening, prices, and reservations with the venue. Durations are planning suggestions. Guide-derived descriptions retain their CC BY-SA 4.0 attribution in the app. See [DATA-SOURCES.md](DATA-SOURCES.md) for coverage, licenses, source links, and refresh instructions.

The header keeps its text on a fixed layer above a 2.4-second photo crossfade. It decodes the next photograph before transitioning, retains the current photograph below it, provides pause/play, and honors reduced-motion preferences. Exact-place photos are researched using linked identities, article titles plus coordinates, venue websites, and named-location image searches, with locally cached images and source credits. Wikimedia images retain their individual licenses; venue and web images retain their original source rights. Run `npm run data:photos` to resume the cached Wikimedia import, then build again. Venues without a matched photograph show a labeled placeholder and a Maps photo link. See `DATA-SOURCES.md` for research manifests and provenance.

Live discovery uses the Wikimedia API without an API key. Results are cached in SQL for seven days, identical concurrent requests are combined, and each client is limited to 20 uncached searches per hour. If a provider request fails, previously cached listings remain usable. Uninhabited territories and very small places may have no city records or geocoded guide listings. Selecting a country in the index does not guarantee a complete local travel guide.

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
