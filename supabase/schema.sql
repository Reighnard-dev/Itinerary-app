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
