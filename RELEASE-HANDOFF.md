# Release handoff

The existing Netlify site is linked locally as d5344008-5217-42ea-a71c-c47467c1f4c7. Do not create a replacement site. Publication waits for the owner's localhost approval.

## Prepared changes

- Netlify builds the frontend, licensed source downloads, and Express API function.
- Node 24 runtime; serverless scratch database holds disposable discovery caches only. Supabase is required for public accounts. Dynamic image downloading is disabled on Netlify because ephemeral files cannot be shared across instances. Bundled verified photos and labeled atmosphere remain available.
- Privacy, terms, account requests, and copyright reporting contact ROAM Support at roamtravelsupport30@gmail.com. The owner must monitor this inbox and verify account ownership before fulfilling requests.
- Paid routing is disabled unless ENABLE_PAID_ROUTES=true. Per-instance limits protect bursts; Google API restrictions and hard provider quotas are required before enabling it. In-memory limits alone cannot cap aggregate serverless spending.

## Before the approved deployment

1. Confirm the linked Netlify site. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the existing project's HTTPS URL and publishable key. `npm run build:netlify` creates the read-only function catalog with this public configuration. Run the build before a manual deploy so the frontend and function use the same project. Set `PHOTO_SOURCE_CONTACT` to the public site URL or support email.
2. Confirm Supabase Site URL and allowed redirects include the existing production origin and http://localhost:5173/. Configure production SMTP so recovery/confirmation emails reach ordinary users. No production auth settings are changed during local review.
3. Run the production build and rights gate. Deploy only dist and the explicitly bundled API inputs; never upload .env, data, private photo quarantine, or research archives. Source-data copies are licensed extracts, not private user data.
4. Inspect a draft deployment's health, destination requests, source downloads, policy links, and bundled images. Test signup/confirmation, password recovery, save/reload/edit/delete, and two-user isolation against the actual production configuration using owner-approved test accounts.
5. After owner approval, publish to the linked site, verify the live flows, and check old removed image URLs are no longer served. Netlify immutable historical deploy URLs may require separate removal through the hosting account. Do not claim a cache purge or historical-deploy removal without verifying it.

## Initial user validation

Invite 10–20 travelers after the production checks. Ask each to choose a destination, plan a day, save/reopen the plan, and export it. Collect friction and missing-content reports through Support. Prioritize successful trip planning over expanding the destination count. Real demand and retention cannot be established by automated tests.
