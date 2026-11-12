-- Runs against the linked database and rolls back every test identity and row.
begin;
do $$
declare
 owner_id uuid := gen_random_uuid();
 other_id uuid := gen_random_uuid();
 trip_id uuid := gen_random_uuid();
 stop_id uuid := gen_random_uuid();
 snapshot jsonb;
begin
 insert into auth.users(id) values (owner_id), (other_id);
 perform set_config('request.jwt.claim.sub', owner_id::text, true);
 set local role authenticated;
 snapshot := jsonb_build_object('id',trip_id,'title','Integration check','country','Japan',
  'city','Kyoto','days',2,'startDate','','stops',jsonb_build_array(
   jsonb_build_object('id',stop_id,'placeId','live-discovery-test','day',1,'time','09:00',
    'notes','Private note','place',jsonb_build_object('id','live-discovery-test','name','A discovered place'))));
 perform public.save_itinerary(snapshot);
 if not exists(select 1 from public.itinerary_items where id=stop_id and notes='Private note'
  and place->>'name'='A discovered place') then raise exception 'Stop snapshot did not round-trip'; end if;

 -- A failing replacement must roll back its title change and stop deletion.
 begin
  perform public.save_itinerary(jsonb_set(jsonb_set(snapshot,'{title}','"Should roll back"'),'{stops,0,day}','9'));
  raise exception 'Invalid stop was accepted';
 exception when invalid_parameter_value then null;
 end;
 if not exists(select 1 from public.itineraries where id=trip_id and title='Integration check')
  or not exists(select 1 from public.itinerary_items where id=stop_id)
 then raise exception 'Atomic save rollback failed'; end if;

 perform set_config('request.jwt.claim.sub', other_id::text, true);
 if exists(select 1 from public.itineraries where id=trip_id)
  or exists(select 1 from public.itinerary_items where id=stop_id)
 then raise exception 'RLS exposed another user trip'; end if;
 begin
  perform public.save_itinerary(snapshot);
  raise exception 'RLS allowed another user to overwrite a trip';
 exception when insufficient_privilege then null;
 end;
 delete from public.itineraries where id=trip_id;
 perform set_config('request.jwt.claim.sub', owner_id::text, true);
 if not exists(select 1 from public.itineraries where id=trip_id)
 then raise exception 'Another user deleted the trip'; end if;
 perform public.save_itinerary(jsonb_set(snapshot,'{stops}','[]'));
 if exists(select 1 from public.itinerary_items where itinerary_id=trip_id)
 then raise exception 'Removing stops did not persist'; end if;
 perform public.save_itinerary(snapshot);
 delete from public.itineraries where id=trip_id;
 if exists(select 1 from public.itinerary_items where itinerary_id=trip_id)
 then raise exception 'Cascade delete failed'; end if;
 reset role;
end $$;
rollback;
select 'PASS: atomic save, place snapshots, ownership RLS, stop removal, and cascade delete' as result;
