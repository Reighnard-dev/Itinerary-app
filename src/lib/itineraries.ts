import { getSupabase } from './supabase';
import type { ItineraryInsert, ItineraryItemInsert } from './database.types';
export type { Itinerary, ItineraryItem, ItineraryInsert, ItineraryItemInsert } from './database.types';
export async function getItinerary(id: string) {
 const { data, error } = await getSupabase().from('itineraries').select('*').eq('id', id).single();
 if (error) throw error;
 return data;
}
export async function createItinerary(input: ItineraryInsert) {
 const { data, error } = await getSupabase().from('itineraries').insert(input).select().single();
 if (error) throw error;
 return data;
}
export async function updateItinerary(id: string, input: Partial<ItineraryInsert>) {
 const { data, error } = await getSupabase().from('itineraries').update(input).eq('id', id).select().single();
 if (error) throw error;
 return data;
}
export async function deleteItinerary(id: string) {
 const { data, error } = await getSupabase().from('itineraries').delete().eq('id', id).select('id').single();
 if (error) throw error;
 return data;
}
export async function getItineraryItem(id: string) {
 const { data, error } = await getSupabase().from('itinerary_items').select('*').eq('id', id).single();
 if (error) throw error;
 return data;
}
export async function createItineraryItem(input: ItineraryItemInsert) {
 const { data, error } = await getSupabase().from('itinerary_items').insert(input).select().single();
 if (error) throw error;
 return data;
}
export async function updateItineraryItem(id: string, input: Partial<ItineraryItemInsert>) {
 const { data, error } = await getSupabase().from('itinerary_items').update(input).eq('id', id).select().single();
 if (error) throw error;
 return data;
}
export async function deleteItineraryItem(id: string) {
 const { data, error } = await getSupabase().from('itinerary_items').delete().eq('id', id).select('id').single();
 if (error) throw error;
 return data;
}
export async function listItineraries() {
 const { data, error } = await getSupabase().from('itineraries').select('*').order('updated_at', { ascending: false });
 if (error) throw error;
 return data;
}
export async function listItineraryItems(itineraryId: string) {
 const { data, error } = await getSupabase().from('itinerary_items').select('*').eq('itinerary_id', itineraryId).order('day').order('position');
 if (error) throw error;
 return data;
}
