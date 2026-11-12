# Supabase integration

The main workspace uses one typed browser client in src/lib/supabase.ts.
Auth screens call src/lib/auth.ts. Signed-in itineraries load from Supabase and
autosave through src/lib/trips.ts after an 800 ms edit debounce. The existing
Save to account button also retries failed saves. Pending drafts are saved
before opening another itinerary, starting another trip, or signing out.

The browser writes public.itineraries and public.itinerary_items through the
save_itinerary RPC. Metadata, stop order, notes, times and discovered place
snapshots are replaced in one database transaction with caller RLS enforced.
Guest drafts remain local. Signed-in lists use cloud rows rather than local
trip caches. Old public.trips snapshots remain readable and migrate into the
normalized tables when saved; deletion also removes any old snapshot.

## Local setup

- Express reads SUPABASE_URL and SUPABASE_ANON_KEY from .env.
- Vite reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local.
- Use the same project and public anon/publishable key for both pairs.
- Never put service_role or secret API keys in either browser variable.
- Environment files and Supabase temporary linking state are ignored by Git.

Linked project: geeujmbxmbydgqzlrafh.
Restart development servers after changing environment settings.

Apply migrations:
1. npx supabase login
2. npx supabase link --project-ref geeujmbxmbydgqzlrafh
3. npx supabase db push --remote

Supabase Auth manages users and passwords. Email confirmation and allowed
redirect URLs are controlled in the Supabase dashboard. A signup requiring
confirmation shows the existing email confirmation message.

## Validation

- npm run build
- npm test
- npx playwright test --config playwright.supabase.config.ts
  (requires the normal cloud-configured build; mocks HTTP responses)
- npx supabase db query --remote --file supabase/tests/live-integration.sql --yes
  (checks real database writes and cross-user RLS, then rolls back all test data)

The original Playwright suite exercises local demo mode. Build with both VITE
variables set to empty strings in the shell before npm run test:e2e, then rebuild
normally to restore the cloud-configured bundle.
