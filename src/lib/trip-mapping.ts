import type { Trip } from '../../shared/types';
import type { Itinerary, ItineraryItem } from './database.types';

/** Preserve discovered places outside the built-in catalog across reloads. */
export function toTrip(itinerary: Itinerary, items: ItineraryItem[]): Trip {
 return {
  id: itinerary.id, title: itinerary.title, country: itinerary.country, city: itinerary.city,
  days: itinerary.days, startDate: itinerary.start_date || '', updatedAt: itinerary.updated_at,
  stops: items.filter(item => item.itinerary_id === itinerary.id)
   .sort((a, b) => a.position - b.position)
   .map(item => ({ id: item.id, placeId: item.place_id, day: item.day, time: item.time,
    notes: item.notes, ...(item.place ? { place: item.place } : {}) })),
 };
}
