# Supabase integration

This worktree uses Vite/React and an Express API. Existing UI and routing files are unchanged.

- Express reads SUPABASE_URL and SUPABASE_ANON_KEY from .env.
- New browser services read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local (Vite also reads .env).
- Use only the public anon key in these variables. Never use a service_role key.
- Both environment files and Supabase temporary linking state are ignored by Git.

The existing UI saves JSON trip snapshots through Express into public.trips.
The new typed services in src/lib manage normalized public.itineraries and
public.itinerary_items separately; these records are not automatically mirrored
into the existing trip snapshots.

Import getSupabase from src/lib/supabase, auth functions from src/lib/auth,
and CRUD functions from src/lib/itineraries. Helpers throw Supabase errors.
Authentication uses Supabase's default browser session storage, shared with the
existing client for the same project. Avoid keeping both clients active with
auth listeners in future UI integration; consolidate their initialization then.

After CLI login:
1. npx supabase link --project-ref geeujmbxmbydgqzlrafh
2. Retrieve the anon key with npx supabase projects api-keys --project-ref geeujmbxmbydgqzlrafh.
3. Populate both variable pairs above using https://geeujmbxmbydgqzlrafh.supabase.co.
4. npx supabase db push --remote
5. Restart development servers after changing environment variables.

The migration preserves the current trips API schema and adds normalized
itineraries/items, ownership RLS, cascading deletes, indexes and update timestamps.
Items are accessible only through a parent itinerary owned by the signed-in user.
Supabase Auth handles users; no passwords are stored in application tables.
Email confirmation and redirect allowlists are configured in the Supabase dashboard.

