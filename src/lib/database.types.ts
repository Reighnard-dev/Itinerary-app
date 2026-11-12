export type Itinerary = { id: string; user_id: string; title: string; country: string; city: string; days: number; start_date: string | null; created_at: string; updated_at: string; }
export type ItineraryItem = { id: string; itinerary_id: string; place_id: string; day: number; time: string; notes: string; position: number; created_at: string; updated_at: string; }
export type ItineraryInsert = Pick<Itinerary, 'title'> & Partial<Omit<Itinerary, 'title'>>;
export type ItineraryItemInsert = Pick<ItineraryItem, 'itinerary_id' | 'place_id'> & Partial<Omit<ItineraryItem, 'itinerary_id' | 'place_id'>>;
type Table<R, I> = { Row: R; Insert: I; Update: Partial<I>; Relationships: [] };
export type Database = { public: {
Tables: { itineraries: Table<Itinerary, ItineraryInsert>; itinerary_items: Table<ItineraryItem, ItineraryItemInsert> };
Views: { [_ in never]: never }; Functions: { [_ in never]: never }; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never };
} };

