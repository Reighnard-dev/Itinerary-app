import { getSupabase } from './supabase';
export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await getSupabase().auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } });
  if (error) throw error;
  return data;
}
export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function getCurrentSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}
export async function getCurrentUser() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  return data.user;
}
export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: new URL('/?recovery=1', window.location.origin).href,
  });
  if (error) throw error;
}
