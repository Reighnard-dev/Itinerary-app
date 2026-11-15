import {useEffect, useId, useRef, useState} from 'react';
import type {CSSProperties, FormEvent, ReactNode} from 'react';
import {ArrowRight, CalendarDays, Check, ChevronDown, Globe2, MapPin, Plane, Search, X} from 'lucide-react';
import type {CityArtwork, Destination, DestinationPhoto} from '../shared/types';
import {loadArtwork} from './discovery-data';
import {StayPicker} from './StayPicker';
import './destination-planner.css';

const popular = ['Philippines', 'France', 'Italy', 'Spain', 'Greece', 'Japan'];
const suggestedCities: Record<string, string[]> = {
  Philippines: ['Manila', 'Cebu', 'Davao'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice'],
  Japan: ['Kyoto', 'Tokyo', 'Osaka'],
};
const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const unique = (values: string[]) => [...new Set(values)];
const photoCredit = (photo: DestinationPhoto) => '/photo-credits.html#' + photo.url.split('/').at(-1);

function Visual({name, photo, coordinate, code, city}: {
  name: string; photo?: DestinationPhoto; coordinate?: CityArtwork; code?: string; city?: boolean;
}) {
  const [brokenUrl, setBrokenUrl] = useState('');
  let seed = 0;
  for (const character of code ?? name) seed = (Math.imul(seed, 31) + character.codePointAt(0)!) >>> 0;
  const mapStyle = {
    '--map-hue': 141 + (seed % 58),
    '--map-x': `${30 + (seed % 53)}%`,
    '--map-y': `${-12 + ((seed >>> 8) % 70)}%`,
  } as CSSProperties;
  const coordinates = coordinate && `${Math.abs(coordinate.lat).toFixed(2)}°${coordinate.lat < 0 ? 'S' : 'N'} · ${Math.abs(coordinate.lng).toFixed(2)}°${coordinate.lng < 0 ? 'W' : 'E'}`;
  return <span className="destination-visual" data-artwork={photo && brokenUrl !== photo.url ? 'photo' : 'map'}>
    <span className="destination-map" style={mapStyle} aria-hidden="true">
      {city ? <MapPin size={36}/> : <Globe2 size={44}/>}
      {coordinates && <small>{coordinates}</small>}
      {!city && (code || name.slice(0, 2).toUpperCase())}
    </span>
    {photo && brokenUrl !== photo.url && <img src={photo.url} alt="" title={photo.title}
      decoding="async" onError={() => setBrokenUrl(photo.url)}/>}
  </span>;
}

interface Choice {name: string; code?: string; photo?: DestinationPhoto; coordinate?: CityArtwork}
function PlacePicker({kind, current, choices, featured, open, onToggle, onClose, onChoose}: {
  kind: 'country' | 'city'; current: Choice; choices: Choice[]; featured: Choice[];
  open: boolean; onToggle: () => void; onClose: () => void; onChoose: (name: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const isCity = kind === 'city';
  const text = isCity ? 'Pick your city' : 'Choose your destination';
  const search = fold(query.trim());
  const matches = search ? choices.filter(choice => fold(choice.name).includes(search) ||
    fold(choice.code ?? '') === search).sort((a, b) =>
      Number(!fold(a.name).startsWith(search)) - Number(!fold(b.name).startsWith(search))) : choices;
  function choose(name: string) {
    onChoose(name);
    onClose();
    trigger.current?.focus();
  }
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  return <section className="destination-step" onKeyDown={event => {
    if (open && event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      trigger.current?.focus();
    }
  }}>
    <div className="destination-step-title">{isCity ? <MapPin/> : <Globe2/>}{text}</div>
    <button className="destination-tile destination-trigger" type="button" ref={trigger}
      aria-label={`${isCity ? 'Choose city' : 'Choose country'}: ${current.name}`} aria-expanded={open}
      aria-controls={open ? id : undefined} disabled={!choices.length}
      onClick={() => {setQuery(''); onToggle();}}>
      <Visual {...current} city={isCity}/>
      <span className="destination-tile-label">{current.code && <small>{current.code}</small>}{current.name}</span>
      <span className="destination-chevron"><ChevronDown size={17}/></span>
    </button>
    <div className="destination-credit">
      {current.photo && <a href={photoCredit(current.photo)} title={current.photo.title}>Photo credit</a>}
    </div>
    {open && <div className="destination-popover" id={id} role="region" aria-label={text}>
      <div className="destination-popover-head">
        <strong>{isCity ? 'Cities & towns' : 'Countries & territories'}</strong>
        <button className="icon-btn" type="button" aria-label={`Close ${kind} picker`}
          onClick={() => {onClose(); trigger.current?.focus();}}><X size={17}/></button>
      </div>
      <label className="destination-search"><Search size={17}/>
        <input ref={input} type="search" aria-label={isCity ? 'Search cities' : 'Search countries'}
          placeholder={isCity ? 'Search by city or town' : 'Search by country or code'} value={query}
          onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (search && matches[0]) choose(matches.find(choice => fold(choice.name) === search)?.name ?? matches[0].name);
          }}/>
      </label>
      {!search && featured.length > 0 && <>
        <div className="destination-kicker">{isCity ? 'Explore these cities' : 'Popular destinations'}</div>
        <div className="destination-featured">
          {featured.map(choice => <div key={choice.name}>
            <button className="destination-tile" type="button" aria-label={choice.name}
              aria-pressed={choice.name === current.name} onClick={() => choose(choice.name)}>
              <Visual {...choice} city={isCity}/>
              <span className="destination-tile-label">{choice.name}</span>
              {choice.name === current.name && <span className="destination-chevron"><Check size={15}/></span>}
            </button>
            {choice.photo && <a className="destination-featured-credit" href={photoCredit(choice.photo)}
              aria-label={`Photo credit for ${choice.name}`}>Photo credit</a>}
          </div>)}
        </div>
      </>}
      <div className="destination-kicker" role="status">{matches.length.toLocaleString()} {isCity ? 'cities & towns' : 'countries & territories'}</div>
      <div className="destination-options">
        {matches.slice(0, 50).map(choice => <button key={choice.name} type="button"
          aria-label={choice.name} aria-pressed={choice.name === current.name} onClick={() => choose(choice.name)}>
          {choice.code && <small>{choice.code}</small>}
          <span>{choice.name}</span>{choice.name === current.name && <Check size={15}/>}
        </button>)}
        {!matches.length && <p>No matches. Try another spelling.</p>}
        {matches.length > 50 && <p>Keep typing to narrow the results.</p>}
      </div>
    </div>}
  </section>;
}

interface Props {
  country: string; city: string; date: string; days: number; destinations: Destination[];
  selectCountry: (country: string) => void; setCity: (city: string) => void;
  setDate: (date: string) => void; setDays: (days: number) => void; onSubmit: (event: FormEvent) => void;
}
export default function DestinationPlanner({
  country, city, date, days, destinations, selectCountry, setCity, setDate, setDays, onSubmit,
}: Props) {
  const [open, setOpen] = useState<'country' | 'city' | 'date' | null>(null);
  const [artwork, setArtwork] = useState<{country: string; cities: Record<string, CityArtwork>}>();
  const form = useRef<HTMLFormElement>(null);
  const selectedCountry = destinations.find(item => item.country === country || (country === 'USA' && item.code === 'US'));
  const countryName = selectedCountry?.country ?? country;
  const cityArtwork = artwork?.country === countryName ? artwork.cities : undefined;
  useEffect(() => {
    if (!selectedCountry?.code) return;
    const controller = new AbortController();
    loadArtwork(countryName, selectedCountry.code, controller.signal).then(data => {
        if (!controller.signal.aborted) setArtwork({country:countryName, cities:data.cities});
      }).catch(() => { /* Selection works with map artwork if photos are unavailable. */ });
    return () => controller.abort();
  }, [countryName, selectedCountry?.code]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (!form.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [open]);

  function countryChoice(item: Destination): Choice {
    return {name:item.country, code:item.code, photo:item.photo};
  }
  function cityChoice(name: string): Choice {
    const coordinate = cityArtwork && Object.hasOwn(cityArtwork, name) ? cityArtwork[name] : undefined;
    return {name, coordinate, photo:coordinate?.photo};
  }
  const cities = selectedCountry?.cities ?? [];
  const featuredCities = unique([city, ...(suggestedCities[countryName] ?? []), ...cities.slice(0, 4)])
    .filter(name => name && cities.includes(name)).slice(0, 4);
  const featuredCountries = unique([...popular.slice(0, 3), countryName, ...popular])
    .flatMap(name => destinations.filter(item => item.country === name)).slice(0, 4);
  const close = () => setOpen(null);
  const toggle = (picker: typeof open) => setOpen(current => current === picker ? null : picker);
  const arrow: ReactNode = <ArrowRight className="destination-flow-arrow" size={21} aria-hidden="true"/>;

  return <form ref={form} className="destination-planner" aria-label="Plan your adventure" onSubmit={event => {
    close();
    onSubmit(event);
  }}>
    <PlacePicker kind="country" choices={destinations.map(countryChoice)} featured={featuredCountries.map(countryChoice)}
      current={selectedCountry ? countryChoice(selectedCountry) : {name:countryName}}
      open={open === 'country'} onToggle={() => toggle('country')} onClose={close} onChoose={name => {
        if (name !== countryName) selectCountry(name);
      }}/>
    {arrow}
    <PlacePicker kind="city" choices={cities.map(name => ({name}))} featured={featuredCities.map(cityChoice)}
      current={cityChoice(city || 'Choose a city')}
      open={open === 'city'} onToggle={() => toggle('city')} onClose={close} onChoose={setCity}/>
    {arrow}
    <StayPicker date={date} days={days} setDate={setDate} setDays={setDays} open={open === 'date'}
      onToggle={() => toggle('date')} onClose={close}/>
    <button className="btn btn-yellow destination-submit" type="submit">
      <Plane size={19}/>Find my adventure<ArrowRight size={17}/>
    </button>
  </form>;
}
