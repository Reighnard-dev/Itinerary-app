import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
let client: SupabaseClient<Database> | undefined;
export function initializeSupabase(url: string, key: string): SupabaseClient<Database> {
  return (client ??= createClient<Database>(url, key));
}

export function getSupabase(): SupabaseClient<Database> {
  if (!client) throw new Error('Roam could not connect to your account. Reload the app and try again.');
  return client;
}
