import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';
import type { Trip, User } from '../shared/types';
import { getSupabase } from './lib/supabase';

export let supabase: SupabaseClient<Database> | null = null;

const isStaticDeploy = typeof window !== 'undefined' && (
  import.meta.env.MODE === 'netlify' ||
  window.location.hostname.endsWith('netlify.app')
);

function getLocalAccounts(): { id: string; email: string; name: string; password?: string }[] {
  try {
    const raw = localStorage.getItem('roam.accounts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: { id: string; email: string; name: string; password?: string }[]) {
  try {
    localStorage.setItem('roam.accounts', JSON.stringify(accounts));
  } catch {}
}

function getLocalSessionUser(): User | null {
  try {
    const raw = localStorage.getItem('roam.session_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSessionUser(user: User | null) {
  try {
    if (user) localStorage.setItem('roam.session_user', JSON.stringify(user));
    else localStorage.removeItem('roam.session_user');
  } catch {}
}

function getLocalTrips(userId?: string): Trip[] {
  try {
    const key = 'roam.trips.' + (userId || 'guest');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTrips(userId: string | undefined, trips: Trip[]) {
  try {
    const key = 'roam.trips.' + (userId || 'guest');
    localStorage.setItem(key, JSON.stringify(trips));
  } catch {}
}

function handleStaticApi<T>(path: string, options: RequestInit = {}): T {
  const method = (options.method || 'GET').toUpperCase();
  let body: Record<string, unknown> = {};
  try {
    body = options.body ? JSON.parse(String(options.body)) : {};
  } catch {}

  if (path === '/auth/login' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) throw new Error('Email and password are required.');
    const accounts = getLocalAccounts();
    let account = accounts.find(a => a.email.toLowerCase() === email);
    if (!account) {
      const name = email === 'reighnardglorioso@gmail.com' ? 'Reighnard Glorioso' : (email.split('@')[0] || 'Traveler');
      account = { id: 'user-' + Math.random().toString(36).slice(2, 10), email, name, password };
      accounts.push(account);
      saveLocalAccounts(accounts);
    } else if (account.password && account.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }
    const user: User = { id: account.id, email: account.email, name: account.name };
    setLocalSessionUser(user);
    return { user } as T;
  }

  if (path === '/auth/signup' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim() || (email.split('@')[0] || 'Traveler');
    if (!email || !password) throw new Error('Email and password are required.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    const accounts = getLocalAccounts();
    if (accounts.some(a => a.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists. Please log in.');
    }
    const account = { id: 'user-' + Math.random().toString(36).slice(2, 10), email, name, password };
    accounts.push(account);
    saveLocalAccounts(accounts);
    const user: User = { id: account.id, email: account.email, name: account.name };
    setLocalSessionUser(user);
    return { user } as T;
  }

  if (path === '/me' && method === 'GET') {
    const user = getLocalSessionUser();
    if (!user) throw new Error('Not authenticated');
    return { user } as T;
  }

  if (path === '/logout' && method === 'POST') {
    setLocalSessionUser(null);
    return { ok: true } as T;
  }

  if (path === '/trips' && method === 'GET') {
    const user = getLocalSessionUser();
    return { trips: getLocalTrips(user?.id) } as T;
  }

  if (path.startsWith('/trips/') && method === 'PUT') {
    const user = getLocalSessionUser();
    const trip = body as unknown as Trip;
    const trips = getLocalTrips(user?.id);
    const updated = [trip, ...trips.filter(t => t.id !== trip.id)];
    saveLocalTrips(user?.id, updated);
    return { trip } as T;
  }

  if (path.startsWith('/trips/') && method === 'DELETE') {
    const user = getLocalSessionUser();
    const id = path.replace('/trips/', '');
    const trips = getLocalTrips(user?.id);
    saveLocalTrips(user?.id, trips.filter(t => t.id !== id));
    return { ok: true } as T;
  }

  throw new Error(`Endpoint not found: ${path}`);
}

export async function configure(): Promise<{ mode: 'local' | 'supabase' }> {
  if (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY) {
    supabase = getSupabase();
    return { mode: 'supabase' };
  }
  if (isStaticDeploy) {
    return { mode: 'local' };
  }
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return { mode: 'local' };
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return { mode: 'local' };
    const config = await response.json();
    if (config.mode === 'supabase') throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the browser.');
    return { mode: 'local' };
  } catch {
    return { mode: 'local' };
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set('Authorization', 'Bearer ' + data.session.access_token);
  }

  if (isStaticDeploy && !supabase && (path.startsWith('/auth') || path.startsWith('/trips') || path === '/me' || path === '/logout')) {
    return handleStaticApi<T>(path, options);
  }

  try {
    const response = await fetch('/api' + path, { ...options, headers, credentials: 'same-origin' });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || response.status === 404) {
      return handleStaticApi<T>(path, options);
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
    return result as T;
  } catch (err) {
    if ((err instanceof SyntaxError || (err as Error).message.includes('JSON')) && (path.startsWith('/auth') || path.startsWith('/trips') || path === '/me' || path === '/logout')) {
      return handleStaticApi<T>(path, options);
    }
    throw err;
  }
}
