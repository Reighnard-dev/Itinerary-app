import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { ArrowDown, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Bookmark, Car, Check, ChevronRight, Clock3, Compass, Download, Footprints, Globe2, GripVertical, Heart, HelpCircle, Leaf, List, LoaderCircle, LogOut, Map as MapIcon, MapPin, Menu, MoreHorizontal, Navigation, Plane, Plus, Search, Share2, Smartphone, Sparkles, Star, Sun, TrainFront, Trash2, X } from 'lucide-react';
import { images, places as handpicked } from '../shared/catalog';
import type { Place, Stop, Trip, User } from '../shared/types';
import { api, configure, supabase } from './api';
import { getCurrentSession, getCurrentUser, signIn, signOut, signUp } from './lib/auth';
import { listTrips, saveTrip, deleteTrip } from './lib/trips';
import {RecoveryRequest,PasswordRecovery} from './AccountControls';
import AccountSettingsPage from './AccountSettingsPage';
import CityPicker from './CityPicker';
import DestinationPlanner from './DestinationPlanner';
import ExploreControls from './ExploreControls';
import HeroSlideshow from './HeroSlideshow';
import {useDiscovery} from './useDiscovery';
import {loadPlaces, usesStaticDiscovery} from './discovery-data';
import GuideInformation,{SourceCredit} from './GuideInformation';
import {placeSource} from '../shared/place-source';
import {guideLink} from '../shared/guide-link';
import PlacePhoto, {PhotoCredit} from './PlacePhoto';
import {StayPicker} from './StayPicker';
import {departureFor, inclusiveDays} from './stay-dates';
import DirectionsPanel from './DirectionsPanel';
import StartingPoint from './StartingPoint';
import type { RouteLocation } from '../shared/routes';
import './directions.css';
import TravelBackground from './TravelBackground';
import './travel-background.css';
import './engagement.css';
import Modal from './Modal';
import InteractiveMapPreview from './InteractiveMapPreview';
import MobileLandingPage from './MobileLandingPage';
import './mobile-landing.css';
import {
  dismissLandingForSession,
  isLandingPath,
  isStandalonePwa,
  shouldShowMobileLanding,
  type BeforeInstallPromptEvent,
} from './mobile-install';
import { SharedTripView, ShareTripModal } from './SharedTripView';
import {
  appendNoteStarter,
  buildShareUrl,
  cloneSharedTrip,
  curateFullTripStops,
  curateSuggestedStops,
  decodeSharedTrip,
  encodeSharedTrip,
  formatVisitTime,
  isMeaningfulGuestDraft,
  NOTE_STARTERS,
  readShareTokenFromUrl,
  sortDayStopsByTime,
  TIME_SLOT_PRESETS,
  timePeriodLabel,
  type SharedTripData,
} from './engagement';

const flags:Record<string,string>={Japan:'🇯🇵',Indonesia:'🇮🇩',France:'🇫🇷',Italy:'🇮🇹',Switzerland:'🇨🇭',Thailand:'🇹🇭',Philippines:'🇵🇭',USA:'🇺🇸','United States':'🇺🇸'};
const countryLabel=(name:string)=>name==='United States'?'USA (United States)':name;
const stopPlace=(stop:Stop)=>stop.place||handpicked.find(p=>p.id===stop.placeId)!;
const kindLabel=(place:Place)=>place.kind==='iconic'?'Iconic spot':place.kind==='hidden'?'Hidden gem':placeSource(place).badge==='Place'?'Mapped place':placeSource(place).badge==='Map'?'Local place':'Guide pick';
const experienceCategories=['All experiences','Culture','Nature','Food & drink','Adventure','Restaurants','Parks & gardens','Activities','Shopping','Beaches','Hotels','Localities'];
const makeTrip=(country='Japan',city='Kyoto',days=5,startDate=''):Trip=>({id:crypto.randomUUID(),title:`A little escape to ${city}`,country,city,days,startDate,stops:[],updatedAt:new Date().toISOString()});
const accountPath='/account';
const isAccountPath=()=>window.location.pathname.replace(/\/$/,'')===accountPath;
type PlanningView='discover'|'trips'|'planner';
function readStorage<T,>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function Photo({src,alt,className=''}:{src:string;alt:string;className?:string}){return <img src={src} alt={alt} className={className} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/fallback.svg';}}/>;}
function App(){
 const [recovering,setRecovering]=useState(false),[accountOpen,setAccountOpen]=useState(isAccountPath);
 const [landingOpen,setLandingOpen]=useState(()=>shouldShowMobileLanding(window.location,window.innerWidth));
 const [installPrompt,setInstallPrompt]=useState<BeforeInstallPromptEvent|null>(null);
 const [isInstalled,setIsInstalled]=useState(()=>isStandalonePwa());
 const [user,setUser]=useState<User|null>(null),[mode,setMode]=useState<'local'|'supabase'>('local'),[ready,setReady]=useState(false);
 const [view,setView]=useState<PlanningView>('discover');
 useEffect(()=>{
  const syncPath=()=>{
   setAccountOpen(isAccountPath());
   if(isLandingPath(window.location.pathname))setLandingOpen(true);
   else if(isAccountPath())setLandingOpen(false);
  };
  window.addEventListener('popstate',syncPath);
  return()=>window.removeEventListener('popstate',syncPath);
 },[]);
 useEffect(()=>{
  const onBeforeInstall=(e:Event)=>{e.preventDefault();setInstallPrompt(e as BeforeInstallPromptEvent);};
  const onInstalled=()=>{setIsInstalled(true);setInstallPrompt(null);};
  window.addEventListener('beforeinstallprompt',onBeforeInstall);
  window.addEventListener('appinstalled',onInstalled);
  return()=>{
   window.removeEventListener('beforeinstallprompt',onBeforeInstall);
   window.removeEventListener('appinstalled',onInstalled);
  };
 },[]);
 const [trip,setTrip]=useState<Trip>(()=>readStorage('roam.active.guest',makeTrip()));
 const [savedTrips,setSavedTrips]=useState<Trip[]>([]),[day,setDay]=useState(1),[owner,setOwner]=useState<string|null>(null);
 const [country,setCountry]=useState(trip.country),[city,setCity]=useState(trip.city),[days,setDays]=useState(trip.days),[date,setDate]=useState(trip.startDate);
 const [result,setResult]=useState({country:trip.country,city:trip.city}),[filter,setFilter]=useState('all'),[category,setCategory]=useState('All experiences'),[sort,setSort]=useState('Recommended'),[mapView,setMapView]=useState(false);
 const {destinations,places,loading:discoveryLoading,notice:discoveryNotice,counts,loadLive}=useDiscovery(result);
 const [placeQuery,setPlaceQuery]=useState(''),[visibleCount,setVisibleCount]=useState(24);
 useEffect(()=>{setVisibleCount(24);},[result,filter,category,placeQuery,sort]);
 const flag=(name:string)=>{const code=destinations.find(d=>d.country===name||(name==='USA'&&d.country==='United States'))?.code;return code?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):flags[name]||'🌍';};
 const [detail,setDetail]=useState<Place|null>(null),[auth,setAuth]=useState<'login'|'signup'|null>(null),[help,setHelp]=useState(false),[newTrip,setNewTrip]=useState(false),[mobileMenu,setMobileMenu]=useState(false);
 const [directionsPlace,setDirectionsPlace]=useState<{place:Place;transport?:'transit'|'driving'|'walking';origin?:string;location?:RouteLocation}|null>(null);
 const [toast,setToast]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[sync,setSync]=useState('Saved on this device'),[confirmDelete,setConfirmDelete]=useState<Trip|null>(null);
 const [bookmarks,setBookmarks]=useState<string[]>(()=>readStorage('roam.bookmarks',[]));
 const [sharedTrip,setSharedTrip]=useState<SharedTripData|null>(null);
 const [shareModal,setShareModal]=useState<{trip:Trip;url:string}|null>(null);
 const [suggesting,setSuggesting]=useState(false);
 const [cardDays,setCardDays]=useState<Record<string,number>>({});
 useEffect(()=>{setCardDays({});},[day,trip.id]);
 const storageKey='roam.trips.'+(user?.id||'guest');
 const [cloudDirty,setCloudDirty]=useState(false);
 const pendingCloudDraft=useRef<Trip|null>(null);
 const activeTrip=useRef(trip);activeTrip.current=trip;
 const activeUser=useRef(user?.id);activeUser.current=user?.id;
 const deleting=useRef(new Set<string>());
 const openAuth=(kind:'login'|'signup')=>{
  if(!user&&isMeaningfulGuestDraft(trip)){pendingCloudDraft.current=trip;}
  setAuth(kind);
 };
 const openAccount=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(!accountOpen){window.history.pushState({fromRoam:true},'',accountPath);setAccountOpen(true);}
  setMobileMenu(false);
 };
 const openLanding=(event?:MouseEvent<HTMLButtonElement|HTMLAnchorElement>)=>{
  if(event){
   if('button' in event&&event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
  }
  if(!isLandingPath(window.location.pathname))window.history.pushState({fromRoam:true},'','/download');
  setAccountOpen(false);
  setSharedTrip(null);
  setLandingOpen(true);
  setMobileMenu(false);
  window.scrollTo(0,0);
 };
 const launchFromLanding=(selected?:{country:string;city:string})=>{
  dismissLandingForSession();
  setLandingOpen(false);
  if(isLandingPath(window.location.pathname))window.history.pushState(null,'','/');
  if(selected){
   setCountry(selected.country);
   setCity(selected.city);
   setResult(selected);
   setFilter('all');
   setCategory('All experiences');
   setPlaceQuery('');
  }
  setView('discover');
  window.scrollTo(0,0);
 };
 const goToView=(next:PlanningView,replace=false)=>{
  if(landingOpen){
   dismissLandingForSession();
   setLandingOpen(false);
  }
  if(accountOpen||sharedTrip||isLandingPath(window.location.pathname)||window.location.search.includes('share=')||window.location.hash.startsWith('#share=')){
   if(replace)window.history.replaceState(null,'','/');
   else window.history.pushState(null,'','/');
   setAccountOpen(false);
   setSharedTrip(null);
   window.scrollTo(0,0);
  }
  setView(next);
  setMobileMenu(false);
 };
 useEffect(()=>{
  let alive=true;
  const syncShareFromLocation=async()=>{
   const token=readShareTokenFromUrl(window.location);
   if(!token){if(alive)setSharedTrip(null);return;}
   const decoded=await decodeSharedTrip(token);
   if(!alive)return;
   if(decoded){
    setSharedTrip(decoded);
   }else{
    const cleaned=new URL(window.location.href);
    cleaned.searchParams.delete('share');
    if(cleaned.hash.startsWith('#share='))cleaned.hash='';
    window.history.replaceState(null,'',cleaned.pathname+cleaned.search+cleaned.hash);
    setSharedTrip(null);
    setToast('That shared itinerary link looks incomplete or expired.');
   }
  };
  void syncShareFromLocation();
  window.addEventListener('popstate',syncShareFromLocation);
  window.addEventListener('hashchange',syncShareFromLocation);
  return()=>{
   alive=false;
   window.removeEventListener('popstate',syncShareFromLocation);
   window.removeEventListener('hashchange',syncShareFromLocation);
  };
 },[]);
 const backToRoam=()=>{
  if(window.history.state?.fromRoam)window.history.back();
  else goToView('discover',true);
 };
 useEffect(()=>{
  let alive=true;let unsubscribe:(()=>void)|undefined;
  (async()=>{try{
   const config=await configure();if(!alive)return;setMode(config.mode);
   if(supabase){
    const listener=supabase.auth.onAuthStateChange((_event,session)=>{
     if(_event==='PASSWORD_RECOVERY'){setRecovering(true);window.history.replaceState({},'',window.location.pathname);}
     if(alive)setUser(session?{id:session.user.id,email:session.user.email||'',name:session.user.user_metadata.name||'Traveler'}:null);
    });unsubscribe=()=>listener.data.subscription.unsubscribe();
    const session=await getCurrentSession();
    if(session){const u=await getCurrentUser();if(alive&&u)setUser({id:u.id,email:u.email||'',name:u.user_metadata.name||'Traveler'});}
   }else{try{const {user:u}=await api<{user:User}>('/me');if(alive)setUser(u);}catch{/* Guests can explore. */}}
  }catch(err){if(alive)setError((err as Error).message);}finally{if(alive)setReady(true);}})();
  return()=>{alive=false;unsubscribe?.();};
 },[]);
 useEffect(()=>{
  if(!ready)return;
  let active=true;setOwner(null);setCloudDirty(false);
  if(user&&mode==='supabase'){
   setSavedTrips([]);setSync('Loading your account…');
   listTrips().then(trips=>{
    if(!active)return;
    const previous=readStorage<Trip|null>('roam.active.'+user.id,null);
    const draft=pendingCloudDraft.current;pendingCloudDraft.current=null;
    const mergedTrips=draft?[draft,...trips.filter(t=>t.id!==draft.id)]:trips;
    setSavedTrips(mergedTrips);
    const selected=draft||trips.find(t=>t.id===previous?.id)||trips[0];
    if(selected){setTrip(selected);setCountry(selected.country);setCity(selected.city);setDays(selected.days);setDate(selected.startDate);setDay(1);}
    if(draft){try{localStorage.removeItem('roam.active.guest');localStorage.removeItem('roam.trips.guest');}catch{/* Ignore unavailable storage. */}}
    setCloudDirty(Boolean(draft)||!selected);
    setOwner(storageKey);setSync(selected&&!draft?'Saved to your account':'Ready to save to your account');
   }).catch(err=>{if(active){setError(err.message);setSync('Unable to load your account — reload to retry');}});
  }else{
   const draft=user?pendingCloudDraft.current:null;
   if(user)pendingCloudDraft.current=null;
   const local=readStorage<Trip[]>(storageKey,[]);
   const initialSaved=draft?[draft,...local.filter(t=>t.id!==draft.id)]:local;
   setSavedTrips(initialSaved);
   const previous=readStorage<Trip|null>('roam.active.'+(user?.id||'guest'),null);
   const selected=draft||previous;
   if(selected){setTrip(selected);setCountry(selected.country);setCity(selected.city);setDays(selected.days);setDate(selected.startDate);setDay(1);}
   setOwner(storageKey);
   if(user){
    if(draft){
     try{localStorage.removeItem('roam.active.guest');localStorage.removeItem('roam.trips.guest');}catch{/* Ignore unavailable storage. */}
     if(draft.title.trim()){
      api<{trip:Trip}>('/trips/'+draft.id,{method:'PUT',body:JSON.stringify(draft)}).then(()=>{
       if(active&&activeTrip.current.id===draft.id)setSync('Saved to your account');
      }).catch(err=>{if(active)setError((err as Error).message);});
     }
    }
    api<{trips:Trip[]}>('/trips').then(({trips})=>{if(active)setSavedTrips(prev=>[...prev,...trips.filter(t=>!prev.some(c=>c.id===t.id))]);}).catch(err=>{if(active)setError(err.message);});
   }
  }
  return()=>{active=false;};
 },[user?.id,ready,storageKey,mode]);
 useEffect(()=>{
  if(!ready||owner!==storageKey)return;
  if(user&&mode==='supabase'){
   try{localStorage.setItem('roam.active.'+user.id,JSON.stringify({id:trip.id}));}catch{/* Cloud records remain authoritative. */}
   return;
  }
  try{
   localStorage.setItem('roam.active.'+(user?.id||'guest'),JSON.stringify(trip));
   const local=readStorage<Trip[]>(storageKey,[]);
   localStorage.setItem(storageKey,JSON.stringify([trip,...local.filter(t=>t.id!==trip.id)]));
   setSavedTrips(prev=>[trip,...prev.filter(t=>t.id!==trip.id)]);setSync('Saved on this device');
  }catch{setSync('Device storage unavailable — save to your account');}
 },[trip,ready,storageKey,user?.id,owner,mode]);
 useEffect(()=>{
  if(!ready||!user||mode!=='supabase'||owner!==storageKey||!cloudDirty||deleting.current.has(trip.id))return;
  if(!trip.title.trim()){setSync('Enter a title to save');return;}
  setSync('Saving to your account…');
  const userId=user.id;
  const timer=setTimeout(()=>{
   saveTrip(trip).then(()=>{
    if(activeUser.current!==userId||deleting.current.has(trip.id))return;
    setSavedTrips(prev=>[trip,...prev.filter(t=>t.id!==trip.id)]);
    if(activeTrip.current===trip){setCloudDirty(false);setSync('Saved to your account');}
   }).catch(err=>{
    if(activeUser.current===userId&&activeTrip.current===trip){setError(err.message);setSync('Not saved — use Save to account to retry');}
   });
  },800);
  return()=>clearTimeout(timer);
 },[trip,ready,user?.id,mode,owner,storageKey,cloudDirty]);
 useEffect(()=>{try{localStorage.setItem('roam.bookmarks',JSON.stringify(bookmarks));}catch{/* Nonessential preferences. */}},[bookmarks]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
 const results=useMemo(()=>places.filter(p=>p.country===result.country&&p.city===result.city&&(filter==='all'||(filter==='saved'?bookmarks.includes(p.id):p.kind===filter))&&(category==='All experiences'||p.category===category)&&(!placeQuery||`${p.name} ${p.description} ${p.category}`.toLocaleLowerCase().includes(placeQuery.toLocaleLowerCase()))).sort((a,b)=>sort==='Top rated'?(b.rating??-1)-(a.rating??-1):sort==='Name: A–Z'?a.name.localeCompare(b.name):0),[places,result,filter,category,sort,bookmarks,placeQuery]);
 const patch=(changes:Partial<Trip>)=>{setCloudDirty(true);setTrip(prev=>({...prev,...changes,updatedAt:new Date().toISOString()}));};
 const validDestination=()=>{if(!destinations.find(d=>d.country===country)?.cities.includes(city)){setToast('Choose a city from the location suggestions before searching.');return false;}return true;};
 const search=(e:FormEvent)=>{e.preventDefault();if(!validDestination())return;setResult({country,city});setFilter('all');setCategory('All experiences');setPlaceQuery('');setView('discover');if(!trip.stops.length){patch({country,city,days,startDate:date,title:`A little escape to ${city}`});setDay(1);}else if(trip.country===country){patch({days,startDate:date,stops:trip.stops.map(s=>s.day>days?{...s,day:days}:s)});setDay(Math.min(day,days));}setToast(`Your ${city} adventure starts here.`);};
 const addedOnDay=useMemo(()=>new Set(trip.stops.filter(s=>s.day===day).map(s=>s.placeId)),[trip.stops,day]);
 const add=(place:Place,targetDay=day)=>{if(place.country!==trip.country){setCountry(place.country);setCity(place.city);setNewTrip(true);setToast(`Start a ${place.city} trip to add this place. Your current trip is kept in My itineraries.`);return;}if(trip.stops.some(s=>s.placeId===place.id&&s.day===targetDay)){setToast(`Already on Day ${targetDay}. Make room for another discovery.`);return;}patch({stops:[...trip.stops,{id:crypto.randomUUID(),placeId:place.id,place,day:targetDay,time:'',notes:''}]});setToast(`${place.name} added to Day ${targetDay}.`);};
 const resolveCityCandidates=async(targetCountry:string,targetCity:string):Promise<Place[]>=>{
  const fromActive=places.filter(p=>p.country===targetCountry&&p.city===targetCity);
  const fromHandpicked=handpicked.filter(p=>p.country===targetCountry&&p.city===targetCity);
  const merged=[...fromActive,...fromHandpicked.filter(h=>!fromActive.some(a=>a.id===h.id))];
  if(merged.length>fromHandpicked.length||merged.length>=4)return merged;
  try{
   const data=await loadPlaces({country:targetCountry,city:targetCity});
   return [...merged,...data.places.filter(p=>!merged.some(m=>m.id===p.id))];
  }catch{return merged;}
 };
 const handleSuggestDay=async(targetDay=day)=>{
  if(suggesting)return;
  setSuggesting(true);
  try{
   const candidates=await resolveCityCandidates(trip.country,trip.city);
   const suggested=curateSuggestedStops({candidates,existingStops:trip.stops,day:targetDay,maxStops:4});
   if(!suggested.length){setToast(`No more new ${trip.city} discoveries available to suggest right now.`);return;}
   patch({stops:[...trip.stops,...suggested]});
   setDay(targetDay);
   setToast(`Added ${suggested.length} curated stops to Day ${targetDay}.`);
  }finally{setSuggesting(false);}
 };
 const handleAutoFillTrip=async()=>{
  if(suggesting)return;
  setSuggesting(true);
  try{
   const candidates=await resolveCityCandidates(trip.country,trip.city);
   const {stops,addedCount,daysFilled}=curateFullTripStops({candidates,trip,maxDays:5});
   if(!addedCount){setToast(`Could not find additional ${trip.city} stops to auto-fill.`);return;}
   patch({stops});
   setToast(`Planned ${addedCount} stops across ${daysFilled} ${daysFilled===1?'day':'days'} in ${trip.city}.`);
  }finally{setSuggesting(false);}
 };
 const copyShareUrl=async(shareUrl:string)=>{
  try{
   await navigator.clipboard?.writeText(shareUrl);
   setToast('Share link copied! Anyone with it can view or clone this trip.');
  }catch{
   setToast('Share link ready — copy it from the box.');
  }
 };
 const openShare=async(targetTrip=trip)=>{
  const token=await encodeSharedTrip(targetTrip,user?.name);
  const shareUrl=buildShareUrl(`${window.location.origin}/`,token);
  setShareModal({trip:targetTrip,url:shareUrl});
  try{await navigator.clipboard?.writeText(shareUrl);}catch{/* Clipboard access may be restricted. */}
 };
 const previewSharedTrip=async()=>{
  if(!shareModal)return;
  const token=readShareTokenFromUrl(new URL(shareModal.url));
  if(!token)return;
  const decoded=await decodeSharedTrip(token);
  if(!decoded)return;
  window.history.pushState(null,'',shareModal.url);
  setShareModal(null);
  setAccountOpen(false);
  setSharedTrip(decoded);
  window.scrollTo(0,0);
 };
 const exitSharedTrip=()=>{
  const cleaned=new URL(window.location.href);
  cleaned.searchParams.delete('share');
  if(cleaned.hash.startsWith('#share='))cleaned.hash='';
  window.history.replaceState(null,'',cleaned.pathname+cleaned.search+cleaned.hash);
  setSharedTrip(null);
  window.scrollTo(0,0);
 };
 const handleCloneSharedTrip=async(hydratedPlaces:Place[])=>{
  if(!sharedTrip)return;
  try{await flushCloudDraft();}catch(err){setError((err as Error).message);return;}
  const cloned=cloneSharedTrip(sharedTrip,hydratedPlaces);
  setCloudDirty(true);
  setTrip(cloned);
  setCountry(cloned.country);
  setCity(cloned.city);
  setDays(cloned.days);
  setDate(cloned.startDate);
  setDay(1);
  setResult({country:cloned.country,city:cloned.city});
  exitSharedTrip();
  setView('planner');
  setToast('Trip cloned to your itineraries — make it your own!');
 };
 const save=async()=>{
  if(!user){openAuth('signup');return;}
  if(mode==='supabase'&&owner!==storageKey){setError('Wait for your account to finish loading before saving.');return;}
  const snapshot=trip,userId=user.id;setBusy(true);setError('');
  try{
   if(mode==='supabase')await saveTrip(snapshot);else await api('/trips/'+snapshot.id,{method:'PUT',body:JSON.stringify(snapshot)});
   if(activeUser.current!==userId)return;
   setSavedTrips(prev=>[snapshot,...prev.filter(t=>t.id!==snapshot.id)]);
   if(activeTrip.current===snapshot){setCloudDirty(false);setSync('Saved to your account');}
   setToast('Trip saved. Your next adventure is waiting.');
  }catch(err){setError((err as Error).message);}finally{setBusy(false);}
 };
 const flushCloudDraft=async()=>{
  if(user&&mode==='supabase'&&cloudDirty&&owner===storageKey){
   await saveTrip(trip);
   setSavedTrips(prev=>[trip,...prev.filter(t=>t.id!==trip.id)]);
   setCloudDirty(false);
  }
 };
 const openTrip=async(t:Trip)=>{try{await flushCloudDraft();}catch(err){setError((err as Error).message);return;}setCloudDirty(false);setTrip(t);setCountry(t.country);setCity(t.city);setDays(t.days);setDate(t.startDate);setDay(1);setView('planner');};
 const startTrip=async(e:FormEvent)=>{e.preventDefault();if(!validDestination())return;try{await flushCloudDraft();}catch(err){setError((err as Error).message);return;}const t=makeTrip(country,city,days,date);setCloudDirty(true);setTrip(t);setDay(1);setResult({country,city});setFilter('all');setCategory('All experiences');setPlaceQuery('');setNewTrip(false);setView('discover');setToast('A fresh page for '+city+'. Let’s fill it with good things.');};
 const clearAccount=()=>{setCloudDirty(false);setUser(null);setTrip(makeTrip());setSavedTrips([]);goToView('discover',true);};
 const logout=async()=>{try{await flushCloudDraft();if(supabase)await signOut();else await api('/logout',{method:'POST'});clearAccount();setToast('You’re signed out. See you on the next adventure.');}catch(err){setError((err as Error).message);}};
 const removeTrip=async()=>{
  if(!confirmDelete)return;
  const id=confirmDelete.id;
  if(id!==trip.id){try{await flushCloudDraft();}catch(err){setError((err as Error).message);return;}}
  deleting.current.add(id);setCloudDirty(false);
  try{
   if(user){if(mode==='supabase')await deleteTrip(id);else await api('/trips/'+id,{method:'DELETE'});}
   const rest=savedTrips.filter(t=>t.id!==id);
   if(mode!=='supabase'||!user)localStorage.setItem(storageKey,JSON.stringify(rest));
   setSavedTrips(rest);if(trip.id===id)setTrip(rest[0]||makeTrip());
   setConfirmDelete(null);setToast('Trip deleted.');
  }catch(err){setError((err as Error).message);}finally{deleting.current.delete(id);}
 };
 const toggleBookmark=(id:string)=>setBookmarks(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 const selectCountry=(value:string)=>{const match=destinations.find(d=>d.country===value||(value==='USA'&&d.country==='United States'));const actualCountry=match?match.country:value;setCountry(actualCountry);setCity(match?.cities[0]||'');};
 const chooseDeparture=(value:string)=>{const length=inclusiveDays(date,value);if(length>=1&&length<=30)setDays(length);};
 const destinationFields=<><label className="field"><span>Country</span><select value={country} onChange={e=>selectCountry(e.target.value)}>{destinations.map(d=><option key={d.country} value={d.country}>{countryLabel(d.country)}</option>)}</select></label><label className="field"><span>Location</span><CityPicker cities={destinations.find(d=>d.country===country)?.cities||[]} value={city} onChange={setCity} label="New trip location"/></label><label className="field"><span>Arrival <small>(optional)</small></span><input aria-label="New trip arrival date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field"><span>Departure</span><input aria-label="New trip departure date" type="date" value={departureFor(date,days)} min={date||undefined} max={date?departureFor(date,30):undefined} disabled={!date} onChange={e=>chooseDeparture(e.target.value)}/></label><label className="field"><span>Trip length</span><input aria-label="New trip length" value={`${days} ${days===1?'day':'days'}`} readOnly/></label></>;

 return <div className="app-shell">
  <TravelBackground />
  <header className="header"><div className="header-inner"><a href="/" className="brand" onClick={e=>{e.preventDefault();goToView('discover');}} aria-label="Roam home"><span className="brand-icon"><Compass size={25} strokeWidth={2.2}/></span>roam<span className="brand-dot">.</span></a><nav className={mobileMenu?'nav mobile-open':'nav'} aria-label="Main navigation"><button className={!accountOpen&&!sharedTrip&&!landingOpen&&view==='discover'?'nav-link active':'nav-link'} onClick={()=>goToView('discover')}>Discover<span className="nav-dot"/></button><button className={!accountOpen&&!sharedTrip&&!landingOpen&&view!=='discover'?'nav-link active':'nav-link'} onClick={()=>goToView('trips')}>My itineraries</button><button className={landingOpen?'nav-link active':'nav-link'} onClick={openLanding}><Smartphone size={14}/>Get the App</button><button className="nav-link" onClick={()=>{setHelp(true);setMobileMenu(false);}}>How it works <ArrowDownLeft size={13}/></button></nav><div className="header-actions">{user?<><a href={accountPath} className="login-link account-nav-link" onClick={openAccount} aria-label="Account settings" aria-current={accountOpen?'page':undefined}><span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span><span>Hey, {user.name.split(' ')[0]}</span></a><button className="icon-btn" aria-label="Sign out" onClick={logout}><LogOut size={17}/></button></>:<><button className="login-link" onClick={()=>openAuth('login')}>Log in</button><button className="btn btn-dark signup-btn" onClick={()=>openAuth('signup')}>Let’s get going <ArrowUp className="diagonal" size={16}/></button></>}<button className="icon-btn mobile-toggle" aria-label="Toggle navigation" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={22}/></button></div></div></header>
  {error&&<div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
  <main className="main">
   {accountOpen?<AccountSettingsPage user={user} ready={ready} cloud={mode==='supabase'} onBack={backToRoam} onLogin={()=>openAuth('login')} onViewTrips={()=>goToView('trips')} onSignOut={logout} onDeleted={()=>{clearAccount();setToast('Your local account was deleted.');}}/>:sharedTrip?<SharedTripView shared={sharedTrip} flag={flag} onClone={handleCloneSharedTrip} onExit={exitSharedTrip} onCopyLink={async()=>{const shareUrl=readShareTokenFromUrl(window.location)?window.location.href:buildShareUrl(`${window.location.origin}/`,await encodeSharedTrip(cloneSharedTrip(sharedTrip),sharedTrip.sharedBy));void copyShareUrl(shareUrl);}} onDetail={setDetail}/>:landingOpen?<MobileLandingPage installPrompt={installPrompt} isInstalled={isInstalled} placeCount={counts.places} countryCount={counts.countries} cityCount={counts.cities} onLaunchApp={launchFromLanding} onClearInstallPrompt={()=>setInstallPrompt(null)}/>:<>
   {view==='discover'&&<>
    <section className="hero" aria-label="Discover your next destination"><HeroSlideshow/><div className="hero-shade"/><div className="hero-copy"><div className="eyebrow light"><span className="tiny-line"/>FOR THE WANDERERS. AND THE WONDERERS.</div><h1>Your next <span>somewhere.</span><svg className="hero-swoop" viewBox="0 0 400 18" aria-hidden="true"><path d="M4 14Q170 -5 395 10"/></svg></h1><p>Iconic sights. Secret corners. A trip that’s entirely you.<br/>Go a little further than the ordinary.</p><div className="hero-note"><span className="hero-avatars"><i>J</i><i>A</i><i>M</i></span><span>A world of possibilities. One beautiful plan.</span></div></div><div className="travel-stamp"><Globe2 size={25}/><span>TAKE THE<br/>SCENIC ROUTE</span><Plane size={19}/></div></section>
    <DestinationPlanner country={country} city={city} date={date} days={days} destinations={destinations}
      selectCountry={selectCountry} setCity={setCity} setDate={setDate} setDays={setDays} onSubmit={search}/>
    <div className="discovery-heading explore-heading">
     <div>
      <h2>Explore your adventure<span aria-hidden="true">.</span></h2>
      <p>Find iconic sights and hidden gems in {result.city}.</p>
     </div>
     <span className="destination-tag">{flag(result.country)} {result.city}, {result.country} <MapPin size={14}/></span>
    </div>
    <div className="discovery-grid">
    <section className="results-section" aria-label="Places to explore">
     <ExploreControls
      filter={filter} onFilter={setFilter} category={category} onCategory={setCategory}
      experienceCategories={experienceCategories} query={placeQuery} onQuery={setPlaceQuery}
      sort={sort} onSort={setSort} mapView={mapView} onToggleMap={()=>setMapView(value=>!value)}
      resultCount={results.length}
      featured={!mapView && filter==='all' && category==='All experiences' && !placeQuery.trim()
       ? results.find(place=>place.kind==='iconic') : undefined}
      onExplore={setDetail}
      day={day}
      isFeaturedAdded={(() => {
       const feat = !mapView && filter==='all' && category==='All experiences' && !placeQuery.trim()
        ? results.find(place=>place.kind==='iconic') : undefined;
       return feat ? addedOnDay.has(feat.id) : false;
      })()}
      onQuickAdd={p=>add(p,day)}
     />
     {mapView&&results.length>0&&<InteractiveMapPreview place={results[0]} all={results} day={day} addedPlaceIds={addedOnDay} onQuickAdd={p=>add(p,day)} onDetail={setDetail}/>}
     <div className={mapView?'places-grid compact-grid':'places-grid'}>{results.slice(0,visibleCount).map(place=>{
      const targetCardDay=Math.min(cardDays[place.id]??day,trip.days);
      const isAddedToCardDay=trip.stops.some(s=>s.placeId===place.id&&s.day===targetCardDay);
      return <article className="place-card" key={place.id}><div className="card-image-wrap"><button className="image-button" aria-label={`Explore ${place.name}`} onClick={()=>setDetail(place)}><PlacePhoto place={place}/></button><span className={`place-badge ${place.kind}`} >{place.kind==='hidden'?<Sparkles size={11}/>:<Star size={11}/>} {kindLabel(place)}</span><button className={`heart-btn ${bookmarks.includes(place.id)?'hearted':''}`} aria-label={`${bookmarks.includes(place.id)?'Unsave':'Save'} ${place.name}`} onClick={()=>toggleBookmark(place.id)}><Heart size={17} fill={bookmarks.includes(place.id)?'currentColor':'none'}/></button><span className="photo-location"><MapPin size={11}/>{place.city}, {place.country}</span><PhotoCredit place={place}/></div><div className="card-body"><div className="card-category">{place.category}<span title={place.rating===null?"Sourced place listing":"Roam editorial score, not a traveler review"}>{place.rating===null?<><Globe2 size={12}/> {placeSource(place).badge}</>:<><Star size={12} fill="currentColor"/> {place.rating.toFixed(1)}</>}</span></div><button className="card-title" onClick={()=>setDetail(place)}>{place.name}</button><p>{place.description}</p><SourceCredit place={place}/><div className="card-bottom"><span><Clock3 size={13}/>{place.duration}</span><div className="card-quick-actions">{trip.days>1&&place.country===trip.country&&<select className="card-day-select" aria-label={`Quick-add day for ${place.name}`} value={targetCardDay} onChange={e=>setCardDays(prev=>({...prev,[place.id]:Number(e.target.value)}))}>{Array.from({length:trip.days},(_,i)=><option key={i} value={i+1}>Day {i+1}</option>)}</select>}<button className={isAddedToCardDay?'add-btn added':'add-btn'} onClick={()=>add(place,targetCardDay)} aria-label={`Add ${place.name} to itinerary`}>{isAddedToCardDay?<Check size={14}/>:<Plus size={14}/>} {isAddedToCardDay?'Added':'Add to trip'}</button></div></div></div></article>;
     })}</div>
     <p className="coverage-notice">Coverage varies by destination. Start with Kyoto, Paris, Tokyo, or Sa Pa for established guide collections. Check venue details before visiting; geographic records do not confirm public access.</p>{discoveryLoading&&<div className="discovery-loading" role="status"><LoaderCircle className="spin" size={18}/><span>Finding more places in {result.city}… <small>Checking available travel sources. Stored places appear first.</small></span></div>}{discoveryNotice&&<p className="discovery-notice" role="status">{discoveryNotice}</p>}{results.length>visibleCount&&<button className="load-more-places" onClick={()=>setVisibleCount(n=>n+24)}>Show 24 more discoveries <span>{Math.min(visibleCount,results.length)} of {results.length}</span><ArrowDown size={15}/></button>}<div className="guide-discovery-actions">{!usesStaticDiscovery&&<button className="btn btn-outline" disabled={discoveryLoading} onClick={loadLive}><Globe2 size={15}/>{discoveryLoading?"Checking live guides…":"Find more in live city guides"}</button>}<a href={guideLink(result.city)} target="_blank" rel="noreferrer">Read the full city guide ↗</a></div>{!results.length&&!discoveryLoading&&<div className="empty-state"><Compass size={35}/><h3>A little room for discovery.</h3><p>{filter==='saved'?'Tap the heart on a place to keep it here.':'Try another filter to find your next favorite place.'}</p><button className="btn btn-yellow" onClick={()=>{setFilter('all');setCategory('All experiences');setPlaceQuery('');}}>Explore all places <ArrowRight size={16}/></button></div>}
     <div className="slow-note"><span className="mini-compass"><Compass size={23}/></span><div><strong>The best stories start with a little detour.</strong><p>Leave a little room for the unexpected. That’s where the good stuff happens.</p></div><span className="hand-arrow">↗</span></div>
    </section><aside className="trip-sidebar"><div className="trip-preview"><div className="preview-top"><span className="eyebrow">A LITTLE PLAN, A BIG ADVENTURE</span><span className="ticket-icon"><Plane size={18}/></span></div><h3>Your trip.<br/>Your kind of magic<span>.</span></h3><p>Collect the places that call to you.<br/>We’ll help connect the dots.</p><div className="mini-trip"><span className="mini-trip-icon"><MapPin size={19}/></span><div><strong>{[...new Set([trip.city,...trip.stops.map(s=>stopPlace(s).city)])].length>1?`${[...new Set([trip.city,...trip.stops.map(s=>stopPlace(s).city)])].length} cities` : trip.city}, {trip.country}</strong><span>{trip.days} days of possibilities</span></div><button className="icon-btn" aria-label="Start a new trip" onClick={()=>setNewTrip(true)}><MoreHorizontal size={19}/></button></div><div className="day-label">ADDING PLACES TO <span>DAY {day}</span></div><div className="day-strip">{Array.from({length:trip.days},(_,i)=><button key={i} className={day===i+1?'day-pill current':'day-pill'} onClick={()=>setDay(i+1)} aria-label={`Select Day ${i+1}`}>{i+1}</button>)}</div>{trip.stops.filter(s=>s.day===day).length?<div className="mini-stops">{trip.stops.filter(s=>s.day===day).map((stop,i)=>{const p=stopPlace(stop);const formatted=formatVisitTime(stop.time);return <div className="mini-stop" key={stop.id}><span>{i+1}</span><PlacePhoto place={p}/><div className="mini-stop-info"><strong>{p.name}{(formatted||stop.notes.trim())&&<span className="mini-stop-meta">{formatted&&<span>{formatted}</span>}{formatted&&stop.notes.trim()&&<span>·</span>}{stop.notes.trim()&&<span>Has note</span>}</span>}<a className="thumbnail-credit" href="/photo-credits.html" target="_blank" rel="noreferrer">Photo credits</a></strong></div><button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={()=>patch({stops:trip.stops.filter(s=>s.id!==stop.id)})}><X size={13}/></button></div>;})}</div>:<div className="empty-trip"><span className="dotted-path"/><span className="empty-map-icon"><MapPin size={28}/><Plus size={14}/></span><strong>Oh, the places you’ll go.</strong><p>Tap <b>+ Add to trip</b> on a place<br/>to start your story.</p><div className="suggest-day-bar"><button type="button" className="suggest-btn" disabled={suggesting} onClick={()=>handleSuggestDay(day)}><Sparkles size={14} aria-hidden="true"/>{suggesting?'Curating stops…':`Suggest Day ${day}`}</button>{trip.stops.length===0&&trip.days>1&&<button type="button" className="autofill-link" disabled={suggesting} onClick={handleAutoFillTrip}>Auto-fill {Math.min(trip.days,5)} days</button>}</div></div>}<div className="trip-count"><span><Bookmark size={14}/>{trip.stops.length} {trip.stops.length===1?'place':'places'} added</span><span>{trip.days} days <Sun size={14}/></span></div><button className="btn btn-dark full" onClick={()=>setView('planner')}>View my itinerary <ArrowRight size={17}/></button>{trip.stops.length>0&&<div className="sidebar-quick-actions"><button type="button" className="btn btn-outline" onClick={()=>openShare(trip)}><Share2 size={14} aria-hidden="true"/>Share trip</button></div>}{!user&&isMeaningfulGuestDraft(trip)&&<div className="guest-handoff-banner"><span>Draft saved here · Sync across devices anytime.</span><button type="button" onClick={()=>openAuth('signup')}>Sign up to sync</button></div>}<div className="autosave"><span/>Your ideas, kept safe on this device.</div></div><div className="travel-tip"><span className="tip-icon"><Sparkles size={21}/></span><div><strong>A little travel wisdom</strong><p>Mix the big sights with the small moments. Your favorite memory might be the one you didn’t plan.</p></div></div><div className="passport-mark"><Globe2 size={19}/><span>LESS SCROLLING. MORE EXPLORING.</span></div></aside></div>
   </>}
   {view==='trips'&&<section className="trips-page"><div className="page-heading"><div><div className="eyebrow"><span className="yellow-line"/> GOOD THINGS ON THE HORIZON</div><h1>Your next chapters<span>.</span></h1><p>Little plans for very big memories. Pick up where you left off.</p></div><button className="btn btn-yellow" onClick={()=>setNewTrip(true)}><Plus size={18}/>Plan a new adventure</button></div><div className="saved-trip-grid">{savedTrips.map(t=>{const tripPlace=t.stops[0]?.place||places.find(p=>p.city===t.city&&p.country===t.country);return <article className="saved-trip" key={t.id}>{tripPlace?<PlacePhoto place={tripPlace}/>:<Photo src={images.hero} alt={t.city}/>}<span className="saved-trip-days">{t.days} days</span><div><span className="eyebrow">{flag(t.country)} {t.city}, {t.country}</span><h3>{t.title}</h3><a className="thumbnail-credit" href="/photo-credits.html" target="_blank" rel="noreferrer">Photo credits</a><p>{t.stops.length} places · {t.startDate?`${formatDate(t.startDate)} – ${formatDate(departureFor(t.startDate,t.days))}`:'Dates to be dreamed of'}</p><div className="saved-trip-actions"><button className="text-btn" onClick={()=>openTrip(t)}>Open itinerary <ArrowRight size={16}/></button><div className="saved-trip-action-group"><button type="button" className="icon-btn" aria-label={`Share ${t.title}`} onClick={()=>openShare(t)}><Share2 size={16}/></button><button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={()=>setConfirmDelete(t)}><Trash2 size={16}/></button></div></div></div></article>})}<button className="new-trip-card" onClick={()=>setNewTrip(true)}><span><Plus size={26}/></span><h3>Where to next?</h3><p>The world is full of good ideas.</p></button></div><p className="storage-note">{user?'Use “Save to account” inside a trip to keep your plans across devices.':'Your trips are saved in this browser. Create an account to save them across devices.'}</p>{!user&&isMeaningfulGuestDraft(trip)&&<div className="guest-handoff-banner" style={{maxWidth:'520px',margin:'12px auto 0'}}><span>Your current draft will transfer automatically when you sign up.</span><button type="button" onClick={()=>openAuth('signup')}>Create free account</button></div>}</section>}
   {view==='planner'&&<Planner trip={trip} day={day} setDay={setDay} patch={patch} onBack={()=>setView('discover')} onSave={save} busy={busy} sync={sync} onDetail={setDetail} onSuggestDay={()=>handleSuggestDay(day)} onAutoFill={handleAutoFillTrip} suggesting={suggesting} onShare={()=>openShare(trip)} user={user} onOpenAuth={openAuth}/>}
   </>}
  </main>
  <footer className="footer"><a className="brand footer-brand" href="/" onClick={e=>{e.preventDefault();goToView('discover');}}><Compass size={22}/>roam<span className="brand-dot">.</span></a><span>Made for going places. And finding yourself along the way.</span><a href="/download" onClick={openLanding}>Get the App</a><a href="/credits.html" target="_blank" rel="noreferrer">Sources &amp; licenses</a><a href="/privacy.html" target="_blank" rel="noreferrer">Privacy</a><a href="/terms.html" target="_blank" rel="noreferrer">Terms</a><a href="/support.html" target="_blank" rel="noreferrer">Support & feedback</a><button onClick={()=>setHelp(true)}>A little help <ArrowUp className="diagonal" size={14}/></button><span className="footer-copyright">© {new Date().getFullYear()} Roam interface · Third-party content retains its licenses</span></footer>
  {toast&&<div className="toast" role="status"><span><Check size={16}/></span>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></button></div>}
  {recovering&&<Modal title="Reset password" onClose={()=>setRecovering(false)}><PasswordRecovery onClose={()=>setRecovering(false)}/></Modal>}
  {auth&&<AuthModal mode={mode} kind={auth} setKind={setAuth} draftInfo={!user&&isMeaningfulGuestDraft(trip)?{title:trip.title,count:trip.stops.length}:undefined} onClose={()=>setAuth(null)} onSuccess={u=>{setUser(u);setAuth(null);if(!accountOpen&&!sharedTrip)setView('discover');setToast(`Welcome ${u.name.split(' ')[0]}. Let’s go somewhere good.`);}}/>}
  {shareModal&&<ShareTripModal trip={shareModal.trip} url={shareModal.url} onClose={()=>setShareModal(null)} onCopy={()=>void copyShareUrl(shareModal.url)} onPreview={()=>{void previewSharedTrip();}}/>}
  {detail&&<PlaceDetail key={detail.id} place={detail} trip={trip} day={day} setDay={setDay} onAdd={()=>add(detail)} onDirections={(p,t,o,location)=>{setDirectionsPlace({place:p,transport:t,origin:o,location});setDetail(null);}} onClose={()=>setDetail(null)}/>}
   {directionsPlace&&<DirectionsPanel place={directionsPlace.place} trip={trip} initialTransport={directionsPlace.transport} initialOrigin={directionsPlace.origin} initialOriginLocation={directionsPlace.location} onClose={()=>setDirectionsPlace(null)} onBackToDetail={()=>{setDetail(directionsPlace.place);setDirectionsPlace(null);}}/>}
  {help&&<Modal title="How Roam works" onClose={()=>setHelp(false)}><div className="modal-heading-icon"><Compass size={28}/></div><div className="eyebrow">LESS PLANNING. MORE LIVING.</div><h2>A little plan.<br/>A world of possibility.</h2><div className="how-steps">{[['01','Find your somewhere','Choose a country, location, and up to 30 days for your adventure.'],['02','Follow your curiosity','Explore our curated collection of iconic spots and quieter discoveries. Save favorites with the heart.'],['03','Make it your own','Add places to a day. Open your itinerary to rearrange stops, set times, and add notes.'],['04','Connect the dots','Open a place for a map, practical transport advice, and walking, driving, or public transit directions.']].map(([n,title,text])=><div key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div><p className="fine-print">Explore {counts.countries} countries and territories, {counts.cities.toLocaleString()} cities and towns, and {counts.places.toLocaleString()} built-in places. Travel listings come from Wikivoyage, Overture Maps, GeoNames, and Wikidata, with additional discovery from OpenStreetMap where available. Coverage varies by city; geographic records do not confirm visitor access. Restaurant openings, hours, and prices can change; confirm with the venue. Times shown are planning suggestions. Transport advice is general; linked maps provide current routes. Cards without verified location photography show labeled, fictional AI atmosphere scenes. They do not depict the actual attraction.</p><button className="btn btn-yellow full" onClick={()=>setHelp(false)}>Let’s explore <ArrowRight size={17}/></button></Modal>}
  {newTrip&&<Modal title="Start a new adventure" onClose={()=>setNewTrip(false)}><div className="modal-heading-icon"><Plane size={27}/></div><div className="eyebrow">A FRESH PAGE IN YOUR PASSPORT</div><h2>Where’s your next<br/>somewhere?</h2><p className="modal-intro">Your current trip stays in My itineraries.</p><form onSubmit={startTrip} className="form-grid">{destinationFields}<button type="submit" className="btn btn-yellow full span-two">Start my adventure <ArrowRight size={17}/></button></form></Modal>}
  {confirmDelete&&<Modal title="Delete itinerary" onClose={()=>setConfirmDelete(null)}><div className="modal-heading-icon"><Trash2 size={26}/></div><h2>Let this trip go?</h2><p className="modal-intro">“{confirmDelete.title}” will be deleted from this device{user?' and your account':''}. This cannot be undone.</p><div className="flex gap-3"><button className="btn btn-outline" onClick={()=>setConfirmDelete(null)}>Keep my trip</button><button className="btn btn-dark" onClick={removeTrip}>Delete trip</button></div></Modal>}
 </div>;
}

function formatDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});}
function AuthModal({mode,kind,setKind,draftInfo,onClose,onSuccess}:{mode:string;kind:'login'|'signup';setKind:(kind:'login'|'signup')=>void;draftInfo?:{title:string;count:number};onClose:()=>void;onSuccess:(user:User)=>void}){
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setLoading(true);setError('');setMessage('');const form=new FormData(e.currentTarget);const email=String(form.get('email')),password=String(form.get('password')),name=String(form.get('name')||'');try{if(supabase){const data=kind==='signup'?await signUp(email,password,name):await signIn(email,password);if(!data.session){setMessage('Check your email to confirm your account, then come back to log in.');return;}onSuccess({id:data.user!.id,email:data.user!.email!,name:data.user!.user_metadata.name||'Traveler'});}else{const {user}=await api<{user:User}>(`/auth/${kind}`,{method:'POST',body:JSON.stringify({email,password,...(kind==='signup'?{name}:{})})});onSuccess(user);}}catch(err){setError((err as Error).message);}finally{setLoading(false);}};
 return <Modal title={kind==='signup'?'Create your Roam account':'Log in to Roam'} onClose={onClose}><div className="modal-heading-icon"><Compass size={28}/></div><div className="eyebrow">THE WORLD IS CALLING</div><h2>{kind==='signup'?'Good things start here.':'Welcome back, wanderer.'}</h2><p className="modal-intro">{kind==='signup'?'One account. A whole world of possibilities.':'Your next adventure is right where you left it.'}</p>{draftInfo&&<div className="auth-draft-notice"><Sparkles size={16} aria-hidden="true"/><span>Your draft <strong>“{draftInfo.title}”</strong> ({draftInfo.count} {draftInfo.count===1?'stop':'stops'}) will carry over into your account.</span></div>}{mode==='local'&&<div className="local-mode"><Globe2 size={15}/><span>Local demo · accounts and trips stay on this server.</span></div>}<form className="auth-form" onSubmit={submit}>{kind==='signup'&&<label className="field"><span>Your name</span><input name="name" autoComplete="name" placeholder="What should we call you?" required maxLength={80}/></label>}<label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" placeholder="you@somewhere.com" required maxLength={254}/></label><label className="field"><span>Password</span><input type="password" name="password" autoComplete={kind==='signup'?'new-password':'current-password'} placeholder="At least 8 characters" required minLength={8} maxLength={128}/></label>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="form-success" role="status">{message}</p>}<button type="submit" className="btn btn-yellow full" disabled={loading}>{loading?<LoaderCircle className="spin" size={18}/>:<>{kind==='signup'?'Create my account':'Let me in'}<ArrowRight size={17}/></>}</button></form>{kind==='login'&&<RecoveryRequest cloud={mode==='supabase'}/>}<p className="fine-print">By creating an account or using Roam, you agree to the <a href="/terms.html" target="_blank" rel="noreferrer">Terms</a>. Read how we handle your data in our <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy notice</a>.</p><div className="auth-switch">{kind==='signup'?'Already part of the adventure?':'New around here?'} <button onClick={()=>{setKind(kind==='signup'?'login':'signup');setError('');setMessage('');}}>{kind==='signup'?'Log in':'Create an account'}</button></div></Modal>;
}
function PlaceDetail({place,trip,day,setDay,onAdd,onDirections,onClose}:{place:Place;trip:Trip;day:number;setDay:(v:number)=>void;onAdd:()=>void;onDirections:(place:Place,transport:'transit'|'driving'|'walking',origin:string,location?:RouteLocation)=>void;onClose:()=>void}){
 const [transport,setTransport]=useState<'transit'|'driving'|'walking'>('transit'),[origin,setOrigin]=useState('');
 const [originLocation,setOriginLocation]=useState<RouteLocation>();
 const link=`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=${transport}${origin?`&origin=${encodeURIComponent(origin)}`:''}`;
 return <Modal title={place.name} onClose={onClose} wide><PlacePhoto className="detail-photo" place={place}/><PhotoCredit place={place} full/><div className="detail-content"><div className="eyebrow">{place.kind==='hidden'?<Sparkles size={14}/>:<Star size={14}/>} {place.kind==='hidden'?'A LITTLE OFF THE BEATEN PATH':place.kind==='local'?'A SOURCED LOCAL PLACE':'A CLASSIC FOR A REASON'} · {place.category}</div><h2>{place.name}</h2><span className="detail-location"><MapPin size={15}/>{place.city}, {place.country}{place.rating!==null&&<><Star size={14}/>{place.rating}</>}</span><p className="detail-description">{place.description}</p><GuideInformation place={place}/><div className="detail-facts"><div><Clock3 size={18}/><span>Make time for<strong>{place.duration}</strong></span></div><div><Sun size={18}/><span>Best enjoyed<strong>{place.bestTime}</strong></span></div><div><Bookmark size={18}/><span>Good to know<strong>{place.price}</strong></span></div></div><a className="venue-photos-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.city} ${place.country}`)}`} target="_blank" rel="noreferrer">View location photos on Maps ↗</a><h3 className="detail-subtitle"><Navigation size={18}/>Let’s get you there.</h3><InteractiveMapPreview place={place}/><div className="transport-tabs" role="group" aria-label="Transportation mode">{([['transit','Public transport',<TrainFront size={16}/>],['driving','Private vehicle',<Car size={16}/>],['walking','On foot',<Footprints size={16}/>]] as const).map(([value,label,icon])=><button className={transport===value?'selected':''} onClick={()=>setTransport(value)} key={value}>{icon}{label}</button>)}</div><p className="transport-advice">{transport==='transit'?place.transit:transport==='driving'?place.driving:'Explore at your own pace. Check the linked walking route for distance, terrain, and safe pedestrian access from your starting point.'}</p><StartingPoint country={place.country} city={place.city} excludeId={place.id} value={origin} onChange={(text, location)=>{setOrigin(text);setOriginLocation(location);}}/><div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap',marginTop:'16px'}}><button type="button" className="btn btn-yellow" onClick={()=>onDirections(place,transport,origin,originLocation)}><Navigation size={16}/>Get directions</button><a className="directions-link" href={link} target="_blank" rel="noreferrer" onClick={e=>{e.preventDefault();onDirections(place,transport,origin,originLocation);}}>Get {transport==='transit'?'public transport':transport==='driving'?'driving':'walking'} directions <ArrowUp className="diagonal" size={16}/></a></div><p className="fine-print">Verified directions appear when available. Otherwise, open Google Maps for current routes, travel times, and schedules.</p><div className="detail-add"><label className="field"><span>Add to your story</span><select aria-label="Choose itinerary day" value={day} onChange={e=>setDay(Number(e.target.value))}>{Array.from({length:trip.days},(_,i)=><option key={i} value={i+1}>Day {i+1} · {trip.country}</option>)}</select></label><button className="btn btn-yellow" onClick={onAdd}><Plus size={17}/>Add to my itinerary</button></div></div></Modal>;
}
function Planner({trip,day,setDay,patch,onBack,onSave,busy,sync,onDetail,onSuggestDay,onAutoFill,suggesting,onShare,user,onOpenAuth}:{trip:Trip;day:number;setDay:(day:number)=>void;patch:(p:Partial<Trip>)=>void;onBack:()=>void;onSave:()=>void;busy:boolean;sync:string;onDetail:(p:Place)=>void;onSuggestDay:()=>void;onAutoFill:()=>void;suggesting:boolean;onShare:()=>void;user:User|null;onOpenAuth:(kind:'login'|'signup')=>void}){
 const [drag,setDrag]=useState<string|null>(null),[showMap,setShowMap]=useState(false),[calendarOpen,setCalendarOpen]=useState(false);
 const stops=trip.stops.filter(s=>s.day===day);
 const move=(id:string,direction:number)=>{const index=trip.stops.findIndex(s=>s.id===id);const dayIndex=stops.findIndex(s=>s.id===id),other=stops[dayIndex+direction];if(!other)return;const next=[...trip.stops],otherIndex=next.findIndex(s=>s.id===other.id);[next[index],next[otherIndex]]=[next[otherIndex],next[index]];patch({stops:next});};
 const drop=(target:string)=>{if(!drag||drag===target)return;const next=[...trip.stops];const from=next.findIndex(s=>s.id===drag);const [item]=next.splice(from,1);const index=next.findIndex(s=>s.id===target);next.splice(index,0,item);patch({stops:next});setDrag(null);};
 const changeDays=(n:number)=>{patch({days:n,stops:trip.stops.map(s=>s.day>n?{...s,day:n}:s)});if(day>n)setDay(n);};
 const download=()=>{const lines=[trip.title,`${trip.city}, ${trip.country} · ${trip.days} days`,trip.startDate?`Arrival ${formatDate(trip.startDate)}\nDeparture ${formatDate(departureFor(trip.startDate,trip.days))}`:'',...Array.from({length:trip.days},(_,i)=>`\nDAY ${i+1}\n${trip.stops.filter(s=>s.day===i+1).map((s,j)=>{const p=stopPlace(s);return `${j+1}. ${s.time?`${s.time} — `:''}${p.name} (${p.city})\n   ${p.duration} · ${p.price}${s.notes?`\n   Notes: ${s.notes}`:''}\n   https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}\n   Source: ${placeSource(p).label} · ${p.source?.license||'Editorial listing'}\n   ${p.source?.url||'See Sources & licenses in Roam'}`;}).join('\n\n')||'Leave a little room for the unexpected.'}`)];const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`roam-${trip.city.toLowerCase()}-itinerary.txt`;a.click();URL.revokeObjectURL(url);};
 return <section className="planner-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/>Back to discovering</button><div className="page-heading"><div><div className="eyebrow"><span className="yellow-line"/> YOUR ADVENTURE, ON PAPER</div><input className="trip-title-input" aria-label="Trip title" value={trip.title} maxLength={100} onChange={e=>patch({title:e.target.value})}/><p><MapPin size={15}/>{[...new Set([trip.city,...trip.stops.map(s=>stopPlace(s).city)])].join(" → ")}, {trip.country} <span>·</span> {trip.stops.length} places to make memories</p></div><div className="planner-actions"><button className="btn btn-outline" onClick={download}><Download size={16}/>Export</button><button type="button" className="btn btn-outline" onClick={onShare}><Share2 size={16}/>Share trip</button><button className="btn btn-yellow" disabled={busy||!trip.title.trim()} onClick={onSave}>{busy?<LoaderCircle className="spin" size={16}/>:<Bookmark size={16}/>}Save to account</button><span className="save-status"><Check size={12}/>{sync}</span></div></div><div className="planner-settings planner-stay-settings"><StayPicker variant="itinerary" date={trip.startDate} days={trip.days} setDate={startDate=>patch({startDate})} setDays={changeDays} open={calendarOpen} onToggle={()=>setCalendarOpen(open=>!open)} onClose={()=>setCalendarOpen(false)}/><span>Shortening a trip moves later stops to the last day.</span></div>{!user&&isMeaningfulGuestDraft(trip)&&<div className="guest-handoff-banner" style={{marginBottom:'20px'}}><span>Draft saved on this device · Sign up to keep this itinerary synced across devices and share it easily.</span><button type="button" onClick={()=>onOpenAuth('signup')}>Sign up to sync</button></div>}<div className="planner-grid"><aside className="planner-days"><span className="eyebrow">THE CHAPTERS</span>{Array.from({length:trip.days},(_,i)=><button key={i} className={day===i+1?'planner-day active':'planner-day'} onClick={()=>setDay(i+1)}><span className="day-num">{String(i+1).padStart(2,'0')}</span><span><strong>Day {i+1}</strong><small>{trip.startDate?formatDate(new Date(new Date(`${trip.startDate}T12:00:00`).getTime()+i*86400000).toLocaleDateString('en-CA')):`${trip.stops.filter(s=>s.day===i+1).length} places to explore`}</small></span><ChevronRight size={15}/></button>)}</aside><div className="day-plan"><div className="day-plan-heading"><div><h2>Day {day}<span> · </span>Your kind of day.</h2><p>{stops.length?'Reorder with the handles or arrows. Make the day your own.':'A blank page. A whole lot of possibility.'}</p></div><div className="day-plan-actions">{stops.filter(s=>Boolean(s.time)).length>=2&&<button type="button" className="btn btn-outline" onClick={()=>patch({stops:sortDayStopsByTime(trip.stops,day)})}><ArrowUpDown size={15}/>Sort by time</button>}{stops.length<4&&<button type="button" className="suggest-btn" disabled={suggesting} onClick={onSuggestDay}><Sparkles size={15}/>{suggesting?'Curating…':stops.length?'Suggest more stops':'Suggest this day'}</button>}<button className="btn btn-outline" onClick={()=>setShowMap(!showMap)}><MapIcon size={15}/>{showMap?'Hide map':'Day map'}</button></div></div>{showMap&&stops.length>0&&<InteractiveMapPreview place={stopPlace(stops[0])} all={stops.map(stopPlace)} onDetail={onDetail}/>}<div className="itinerary-stops">{stops.map((stop,index)=>{const p=stopPlace(stop);const formatted=formatVisitTime(stop.time);const period=timePeriodLabel(stop.time);return <article key={stop.id} className={`itinerary-stop ${drag===stop.id?'dragging':''}`} onDragOver={e=>e.preventDefault()} onDrop={()=>drop(stop.id)}><span className="stop-number">{index+1}</span><div className="stop-top"><button className="drag-handle" aria-label={`Drag ${p.name} to reorder`} draggable onDragStart={e=>{setDrag(stop.id);e.dataTransfer.setData('text/plain',stop.id);e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>setDrag(null)}><GripVertical size={18}/></button><PlacePhoto place={p}/><div className="stop-summary"><a className="thumbnail-credit" href="/photo-credits.html" target="_blank" rel="noreferrer">Photo credits</a><span className="eyebrow">{formatted&&<span className="time-badge"><Clock3 size={11}/>{formatted}{period?` · ${period}`:''}</span>}{p.category} · {kindLabel(p)}</span><button onClick={()=>onDetail(p)}>{p.name}</button><span className="stop-duration"><Clock3 size={13}/>{p.duration} <span>·</span>{p.price}</span></div><div className="stop-buttons"><button className="icon-btn" aria-label={`Move ${p.name} up`} disabled={index===0} onClick={()=>move(stop.id,-1)}><ArrowUp size={15}/></button><button className="icon-btn" aria-label={`Move ${p.name} down`} disabled={index===stops.length-1} onClick={()=>move(stop.id,1)}><ArrowDown size={15}/></button><button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={()=>patch({stops:trip.stops.filter(s=>s.id!==stop.id)})}><Trash2 size={15}/></button></div></div><div className="stop-edit"><label><Clock3 size={14}/><input type="time" aria-label={`Visit time for ${p.name}`} value={stop.time} onChange={e=>patch({stops:trip.stops.map(s=>s.id===stop.id?{...s,time:e.target.value}:s)})}/></label><label>Move to<select aria-label={`Move ${p.name} to day`} value={stop.day} onChange={e=>patch({stops:trip.stops.map(s=>s.id===stop.id?{...s,day:Number(e.target.value)}:s)})}>{Array.from({length:trip.days},(_,i)=><option key={i} value={i+1}>Day {i+1}</option>)}</select></label><button className="text-btn" onClick={()=>onDetail(p)}><Navigation size={14}/>Map & directions</button></div><div className="time-presets" role="group" aria-label={`Time presets for ${p.name}`}><span className="time-presets-label">Time slot:</span>{TIME_SLOT_PRESETS.map(preset=><button key={preset.time} type="button" className={`time-chip ${stop.time===preset.time?'active':''}`} onClick={()=>patch({stops:trip.stops.map(s=>s.id===stop.id?{...s,time:preset.time}:s)})}>{preset.label}</button>)}{stop.time&&<button type="button" className="time-chip clear" onClick={()=>patch({stops:trip.stops.map(s=>s.id===stop.id?{...s,time:''}:s)})}>Clear</button>}</div><div className="note-starters" role="group" aria-label={`Note starters for ${p.name}`}><span className="note-starters-label">Quick note:</span>{NOTE_STARTERS.map(starter=><button key={starter} type="button" className="note-chip" onClick={()=>patch({stops:trip.stops.map(s=>s.id===stop.id?{...s,notes:appendNoteStarter(s.notes,starter)}:s)})}>+ {starter}</button>)}</div><textarea aria-label={`Notes for ${p.name}`} maxLength={1000} value={stop.notes} placeholder="A little note to your future self… tickets, a café nearby, anything." onChange={e=>patch({stops:trip.stops.map(s=>s.id===stop.id?{...s,notes:e.target.value}:s)})}/></article>;})}</div>{!stops.length&&<div className="empty-state planner-empty"><span><MapIcon size={42}/><Sparkles size={22}/></span><h3>Make room for a little wonder.</h3><p>Find the places you love, then add them to Day {day}.<br/>We’ll keep the details together.</p><div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'center'}}><button className="btn btn-yellow" onClick={onBack}><Plus size={17}/>Discover places</button><button type="button" className="suggest-btn" disabled={suggesting} onClick={onSuggestDay}><Sparkles size={15}/>{suggesting?'Curating stops…':'Suggest this day'}</button></div>{trip.stops.length===0&&trip.days>1&&<button type="button" className="autofill-link" style={{marginTop:'10px'}} disabled={suggesting} onClick={onAutoFill}>Auto-fill {Math.min(trip.days,5)} days</button>}</div>}{stops.length>0&&<button className="add-more" onClick={onBack}><Plus size={18}/>There’s room for one more discovery</button>}</div></div></section>;
}
export default App;
