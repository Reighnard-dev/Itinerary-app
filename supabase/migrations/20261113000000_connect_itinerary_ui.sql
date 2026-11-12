begin;
alter table public.itinerary_items add column place jsonb;
alter table public.itinerary_items add constraint itinerary_item_place_object
 check (place is null or jsonb_typeof(place) = 'object');

-- One transaction prevents a failed stop write from leaving a partially saved trip.
-- Invoker privileges keep ownership RLS active for every statement.
create function public.save_itinerary(trip jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
 trip_id uuid := (trip->>'id')::uuid;
 stop jsonb;
 stop_position integer := 0;
begin
 if auth.uid() is null then
  raise exception 'Sign in to save an itinerary' using errcode = '42501';
 end if;
 if jsonb_typeof(trip->'stops') is distinct from 'array' then
  raise exception 'Trip stops must be an array' using errcode = '22023';
 end if;
 insert into public.itineraries(id, user_id, title, country, city, days, start_date)
 values (trip_id, auth.uid(), trip->>'title', trip->>'country', trip->>'city',
  (trip->>'days')::integer, nullif(trip->>'startDate', '')::date)
 on conflict (id) do update set title = excluded.title, country = excluded.country,
  city = excluded.city, days = excluded.days, start_date = excluded.start_date;
 delete from public.itinerary_items where itinerary_id = trip_id;
 for stop in select value from jsonb_array_elements(trip->'stops') loop
  if (stop->>'day')::integer > (trip->>'days')::integer then
   raise exception 'Stop day exceeds itinerary duration' using errcode = '22023';
  end if;
  insert into public.itinerary_items(id, itinerary_id, place_id, day, time, notes, position, place)
  values ((stop->>'id')::uuid, trip_id, stop->>'placeId', (stop->>'day')::integer,
   coalesce(stop->>'time', ''), coalesce(stop->>'notes', ''), stop_position, nullif(stop->'place', 'null'::jsonb));
  stop_position := stop_position + 1;
 end loop;
end;
$$;
revoke all on function public.save_itinerary(jsonb) from public, anon;
grant execute on function public.save_itinerary(jsonb) to authenticated;
commit;
