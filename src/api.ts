import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';
import { initializeSupabase } from './lib/supabase';
export let supabase: SupabaseClient<Database> | null = null;
export async function configure(): Promise<{ mode: 'local' | 'supabase' }> {
 const url = import.meta.env.VITE_SUPABASE_URL;
 const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
 if (url && key) {
  supabase = initializeSupabase(url, key);
  return { mode: 'supabase' };
 }
 const response = await fetch('/api/config');
 if (!response.ok) throw new Error('The server is unavailable. Please start the Node.js API.');
 const config = await response.json();
 if (config.mode === 'supabase') {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
   throw new Error('Roam could not connect to your account. Reload the app and try again.');
  }
  supabase = initializeSupabase(config.supabaseUrl, config.supabaseAnonKey);
  return { mode: 'supabase' };
 }
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
