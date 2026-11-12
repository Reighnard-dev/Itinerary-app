import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';
import { getSupabase } from './lib/supabase';
export let supabase: SupabaseClient<Database> | null = null;
export async function configure(): Promise<{ mode: 'local' | 'supabase' }> {
 if (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY) {
  supabase = getSupabase();
  return { mode: 'supabase' };
 }
 const response = await fetch('/api/config');
 if (!response.ok) throw new Error('The server is unavailable. Please start the Node.js API.');
 const config = await response.json();
 if (config.mode === 'supabase') throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the browser.');
 return { mode: 'local' };
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
 const headers = new Headers(options.headers);
 headers.set('Content-Type', 'application/json');
 if (supabase) {
  const { data } = await supabase.auth.getSession();
  if (data.session) headers.set('Authorization', 'Bearer ' + data.session.access_token);
 }
 const response = await fetch('/api' + path, { ...options, headers, credentials: 'same-origin' });
 const result = await response.json();
 if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
 return result as T;
}
