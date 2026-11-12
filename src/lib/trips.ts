import type { Trip } from '../../shared/types';
import { getSupabase } from './supabase';
import { deleteItinerary, listItineraries } from './itineraries';
import { toTrip } from './trip-mapping';
import type { Json } from './database.types';

// Serialize mutations so rapid edits cannot finish out of order or resurrect a deleted trip.
let pendingWrite: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
 const next = pendingWrite.catch(() => undefined).then(operation);
 pendingWrite = next;
 return next;
}

/** Normalized records take precedence over snapshots saved by the previous API. */
export async function listTrips(): Promise<Trip[]> {
 const client = getSupabase();
 const [itineraries, items, legacy] = await Promise.all([
  listItineraries(),
  client.from('itinerary_items').select('*').order('position'),
  client.from('trips').select('data').order('updated_at', { ascending: false }),
 ]);
 if (items.error) throw items.error;
 if (legacy.error) throw legacy.error;
 const trips = itineraries.map(itinerary => toTrip(itinerary, items.data));
 const ids = new Set(trips.map(trip => trip.id));
 return [...trips, ...legacy.data.map(row => row.data as unknown as Trip).filter(trip => !ids.has(trip.id))];
}

/** Metadata and stops are replaced together, with caller ownership enforced by RLS. */
async function writeTrip(trip: Trip): Promise<void> {
 const { error } = await getSupabase().rpc('save_itinerary', { trip: trip as unknown as Json });
 if (error) throw error;
}

async function removeTrip(id: string): Promise<void> {
 // Remove the legacy snapshot too, so a migrated trip cannot reappear after deletion.
 const { error } = await getSupabase().from('trips').delete().eq('id', id);
 if (error) throw error;
 const { data, error: lookupError } = await getSupabase().from('itineraries').select('id').eq('id', id).maybeSingle();
 if (lookupError) throw lookupError;
 if (data) await deleteItinerary(id);
}

export function saveTrip(trip: Trip): Promise<void> { return enqueue(() => writeTrip(trip)); }
export function deleteTrip(id: string): Promise<void> { return enqueue(() => removeTrip(id)); }
