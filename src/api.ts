import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export let supabase:SupabaseClient|null=null;
export async function configure(){const response=await fetch('/api/config');if(!response.ok)throw new Error('The server is unavailable. Please start the Node.js API.');const config=await response.json();if(config.mode==='supabase'&&!supabase)supabase=createClient(config.supabaseUrl,config.supabaseAnonKey);return config as {mode:'local'|'supabase'};}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const headers=new Headers(options.headers);headers.set('Content-Type','application/json');
 if(supabase){const {data}=await supabase.auth.getSession();if(data.session)headers.set('Authorization',`Bearer ${data.session.access_token}`);}
 const response=await fetch(`/api${path}`,{...options,headers,credentials:'same-origin'});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Something went wrong. Please try again.');return result as T;
}
