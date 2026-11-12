import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { places } from './catalog.js';
import {worldwideDestinations,geoCity,canonicalCountry} from './world.js';
import {discoverGuide,type GuideResult} from './travel-guide.js';
import { credentialsSchema, tripSchema } from './validation.js';
import type { User } from '../shared/types.js';
import {photoService} from './photo-service.js';

if(existsSync('.env')) process.loadEnvFile('.env');
const url=process.env.SUPABASE_URL||'';
const key=process.env.SUPABASE_ANON_KEY||'';
if(Boolean(url)!==Boolean(key)) throw new Error('Set both SUPABASE_URL and SUPABASE_ANON_KEY, or leave both blank for local mode.');
const cloud=Boolean(url&&key);
const supabase=cloud?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const dataDir=process.env.DATA_DIR||'data';
mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'roam.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS trips(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS place_cache(city_key TEXT PRIMARY KEY,data TEXT NOT NULL,fetched_at TEXT NOT NULL);`);
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');if(req.path.startsWith('/api'))res.setHeader('Cache-Control','no-store');next();});
const attempts=new Map<string,{count:number;until:number}>();
app.use('/api/auth',(req,res,next)=>{
 if(req.method!=='POST')return next();
 const origin=req.get('origin');
 if(origin){try{if(!['localhost','127.0.0.1',req.hostname].includes(new URL(origin).hostname))return res.status(403).json({error:'Invalid request origin.'});}catch{return res.status(403).json({error:'Invalid request origin.'});}}
 const ip=req.ip||'local';const now=Date.now();
 for(const [id,value] of attempts)if(value.until<now)attempts.delete(id);
 const entry=attempts.get(ip)||{count:0,until:now+15*60*1000};
 entry.count++;attempts.set(ip,entry);
 if(entry.count>30)return res.status(429).json({error:'Too many attempts. Please try again in 15 minutes.'});next();
});
app.get('/api/config',(_req,res)=>res.json({mode:cloud?'supabase':'local',supabaseUrl:url,supabaseAnonKey:key}));
app.get('/api/health',(_req,res)=>res.json({status:'ok',mode:cloud?'supabase':'local'}));
app.get('/api/destinations',(_req,res)=>res.json({destinations:worldwideDestinations,countryCount:worldwideDestinations.length,cityCount:worldwideDestinations.reduce((n,d)=>n+d.cities.length,0),placeCount:places.length}));
app.get('/api/places',(req,res)=>{const targetCountry=typeof req.query.country==='string'?canonicalCountry(req.query.country):'';res.json({places:places.filter(p=>(!targetCountry||p.country===targetCountry)&&(!req.query.city||p.city===req.query.city))});});
const photograph=photoService(db,dataDir,places);
app.use('/api/photos',express.static(photograph.dir,{maxAge:'30d',immutable:true}));
app.get('/api/place-image',async(req,res)=>{
 const id=typeof req.query.id==='string'?req.query.id:'';
 if(!/^[a-z0-9_-]{1,100}$/.test(id))return res.status(400).json({error:'A valid place ID is required.'});
 const photo=await photograph.resolve(id);
 res.json({photo});
});
const pendingGuides=new Map<string,Promise<GuideResult>>();
const discoveryLimits=new Map<string,{count:number;until:number}>();
app.get('/api/explore',async(req,res)=>{
 const rawCountry=typeof req.query.country==='string'?req.query.country:'',city=typeof req.query.city==='string'?req.query.city:'';
 const country=canonicalCountry(rawCountry);
 if(!geoCity(country,city))return res.status(400).json({error:'Choose a city from the location suggestions.'});
 const cityKey=JSON.stringify([country,city]);
 const row=db.prepare('SELECT data,fetched_at FROM place_cache WHERE city_key=?').get(cityKey) as {data:string;fetched_at:string}|undefined;
 if(row&&Date.now()-Date.parse(row.fetched_at)<7*86400000)return res.json({...JSON.parse(row.data),cached:true});
 const ip=req.ip||'local';const now=Date.now();for(const [key,value] of discoveryLimits)if(value.until<now)discoveryLimits.delete(key);
 const limit=discoveryLimits.get(ip)||{count:0,until:now+3600000};
 if(limit.count>=20)return res.status(429).json({error:'You have reached the live discovery limit for this hour. Built-in destinations remain available.'});
 limit.count++;discoveryLimits.set(ip,limit);
 try{
  let promise=pendingGuides.get(cityKey);if(!promise){promise=discoverGuide(country,city);pendingGuides.set(cityKey,promise);}
  const result=await promise;db.prepare('INSERT INTO place_cache VALUES(?,?,?) ON CONFLICT(city_key) DO UPDATE SET data=excluded.data,fetched_at=excluded.fetched_at').run(cityKey,JSON.stringify(result),result.fetchedAt);
  res.json({...result,cached:false,...(!result.places.length?{notice:'No geocoded listings were found in this city’s English-language guide. Try another nearby city or open the full travel guide.'}:{})});
 }catch{
  if(row)return res.json({...JSON.parse(row.data),cached:true,notice:'The live guide is temporarily unavailable. Showing previously downloaded listings.'});
  res.status(503).json({error:'The live travel guide is temporarily unavailable. Your built-in places and saved itineraries are still available. Try again shortly.'});
 }finally{pendingGuides.delete(cityKey);}
});
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
function session(res:express.Response,userId:string){const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),userId,Date.now()+7*86400000);res.cookie('roam_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',maxAge:7*86400000,path:'/'});}
app.post('/api/auth/:action',(req,res)=>{
 if(cloud)return res.status(400).json({error:'Use Supabase authentication for this installation.'});
 if(!['signup','login'].includes(req.params.action))return res.status(404).json({error:'Not found.'});
 const parsed=credentialsSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Enter a valid email and a password of 8–128 characters.'});
 const {email,password,name}=parsed.data;
 if(req.params.action==='signup'){
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email))return res.status(409).json({error:'An account already exists with this email. Try signing in.'});
  const user={id:randomUUID(),email,name:name||email.split('@')[0]};const salt=randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(user.id,email,user.name,scryptSync(password,salt,64).toString('hex'),salt);session(res,user.id);return res.status(201).json({user});
 }
 const row=db.prepare('SELECT * FROM users WHERE email=?').get(email) as {id:string;email:string;name:string;password_hash:string;salt:string}|undefined;
 const candidate=scryptSync(password,row?.salt||'dummy-salt',64);
 if(!row||!timingSafeEqual(candidate,Buffer.from(row.password_hash,'hex')))return res.status(401).json({error:'Email or password is incorrect.'});
 session(res,row.id);return res.json({user:{id:row.id,email:row.email,name:row.name}});
});
app.post('/api/logout',(req,res)=>{const token=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('roam_session='))?.slice(13);if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));res.clearCookie('roam_session',{path:'/'});res.json({ok:true});});
type AuthRequest=express.Request&{user?:User;supabaseClient?:SupabaseClient};
async function authenticate(req:AuthRequest,res:express.Response,next:express.NextFunction){
 try{
 if(supabase){const token=req.get('authorization')?.replace(/^Bearer /,'');if(!token)return res.status(401).json({error:'Please sign in to save your trip.'});const {data,error}=await supabase.auth.getUser(token);if(error||!data.user)return res.status(401).json({error:'Your session expired. Please sign in again.'});req.user={id:data.user.id,email:data.user.email||'',name:data.user.user_metadata.name||'Traveler'};req.supabaseClient=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});}
 else{const token=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('roam_session='))?.slice(13);const user=token?db.prepare('SELECT u.id,u.email,u.name FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token),Date.now()):null;if(!user)return res.status(401).json({error:'Please sign in to save your trip.'});req.user=user as unknown as User;}
 next();
 }catch(nextError){next(nextError);}
}
app.get('/api/me',authenticate,(req:AuthRequest,res)=>res.json({user:req.user}));
app.get('/api/trips',authenticate,async(req:AuthRequest,res,next)=>{try{
 if(req.supabaseClient){const {data,error}=await req.supabaseClient.from('trips').select('data').order('updated_at',{ascending:false});if(error)throw error;return res.json({trips:data.map(row=>row.data)});}
 const rows=db.prepare('SELECT data FROM trips WHERE user_id=? ORDER BY updated_at DESC').all(req.user!.id) as {data:string}[];res.json({trips:rows.map(row=>JSON.parse(row.data))});
}catch(err){next(err);}});
app.put('/api/trips/:id',authenticate,async(req:AuthRequest,res,next)=>{try{
 const parsed=tripSchema.safeParse(req.body);if(!parsed.success||parsed.data.id!==req.params.id)return res.status(400).json({error:parsed.success?'Trip ID mismatch.':parsed.error.issues[0].message});
 const trip={...parsed.data,updatedAt:new Date().toISOString()};
 if(req.supabaseClient){const {error}=await req.supabaseClient.from('trips').upsert({id:trip.id,user_id:req.user!.id,data:trip,updated_at:trip.updatedAt});if(error)throw error;}
 else{const old=db.prepare('SELECT user_id FROM trips WHERE id=?').get(trip.id);if(old&&old.user_id!==req.user!.id)return res.status(404).json({error:'Trip not found.'});db.prepare('INSERT INTO trips VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at WHERE trips.user_id=excluded.user_id').run(trip.id,req.user!.id,JSON.stringify(trip),trip.updatedAt);}
 res.json({trip});
}catch(err){next(err);}});
app.delete('/api/trips/:id',authenticate,async(req:AuthRequest,res,next)=>{try{
 if(req.supabaseClient){const {error}=await req.supabaseClient.from('trips').delete().eq('id',req.params.id);if(error)throw error;}
 else db.prepare('DELETE FROM trips WHERE id=? AND user_id=?').run(String(req.params.id),req.user!.id);
 res.json({ok:true});
}catch(err){next(err);}});
app.use('/api',(_req,res)=>res.status(404).json({error:'API endpoint not found.'}));
if(existsSync('dist/index.html')){app.use(express.static(path.resolve('dist')));app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));}
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(err instanceof Error?err.message:'Database operation failed');const status=err instanceof SyntaxError?400:500;res.status(status).json({error:status===400?'Invalid JSON request.':'Unable to complete this request. Check your connection and database setup, then try again.'});});
app.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log(`Roam API ready on http://localhost:${process.env.PORT||3001} (${cloud?'Supabase':'local SQLite'} mode)`));

