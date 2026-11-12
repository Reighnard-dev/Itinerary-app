begin;
-- Run in your Supabase SQL Editor. Supabase Auth manages accounts and passwords.
create table if not exists public.trips (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint trip_id_matches check ((data->>'id')::uuid = id),
  constraint trip_data_object check (jsonb_typeof(data) = 'object')
);
create index if not exists trips_user_updated_idx on public.trips(user_id,updated_at desc);
alter table public.trips enable row level security;
drop policy if exists "Users own their trips" on public.trips;
create policy "Users own their trips" on public.trips for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.trips from anon;
grant select,insert,update,delete on public.trips to authenticated;

create table public.itineraries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) > 0),
 country text not null default '', city text not null default '',
 days integer not null default 1 check (days > 0), start_date date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index itineraries_user_updated_idx on public.itineraries(user_id, updated_at desc);
create table public.itinerary_items (
 id uuid primary key default gen_random_uuid(),
 itinerary_id uuid not null references public.itineraries(id) on delete cascade,
 place_id text not null, day integer not null default 1 check (day > 0),
 time text not null default '', notes text not null default '',
 position integer not null default 0 check (position >= 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index itinerary_items_parent_order_idx on public.itinerary_items(itinerary_id, day, position);
create function public.set_itinerary_updated_at() returns trigger language plpgsql
set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger itineraries_updated_at before update on public.itineraries
for each row execute function public.set_itinerary_updated_at();
create trigger itinerary_items_updated_at before update on public.itinerary_items
for each row execute function public.set_itinerary_updated_at();
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
create policy "Owners manage itineraries" on public.itineraries for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners manage itinerary items" on public.itinerary_items for all to authenticated
using (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = (select auth.uid())))
with check (exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = (select auth.uid())));
revoke all on public.itineraries, public.itinerary_items from anon;
grant select, insert, update, delete on public.itineraries, public.itinerary_items to authenticated;
commit;
