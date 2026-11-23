import { useEffect, useId, useState } from 'react';
import type { Place } from '../shared/types';
import type { RouteLocation } from '../shared/routes';
import { loadPlaces } from './discovery-data';

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');

export default function StartingPoint({ city, country, excludeId, value, onChange }: {
  city: string;
  country: string;
  excludeId: string;
  value: string;
  onChange: (text: string, location?: RouteLocation) => void;
}) {
  const id = useId();
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadPlaces({ city, country }).then(({ places }) => {
      if (!cancelled) setPlaces(places);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [city, country, open]);

  const query = normalize(value.trim());
  const matches = open && query ? places
    .filter(place => place.city === city && place.country === country && place.id !== excludeId)
    .map(place => {
      const name = normalize(place.name);
      const transport = /\b(station|terminal|airport|gare|estacion|ga)\b/i.test(name);
      const kind = place.category === 'Hotels' ? 'Hotel' : transport ? 'Transport' : place.category;
      const rank = name.startsWith(query) ? 0 : name.includes(query) ? 2
        : normalize(place.address ?? '').includes(query) ? 4 : Infinity;
      return { place, kind, score: rank + (kind === 'Hotel' || transport ? 0 : 1) };
    })
    .filter(match => Number.isFinite(match.score))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6) : [];

  function choose(place: Place) {
    onChange(place.name, { name: place.name, address: place.address, lat: place.lat, lng: place.lng });
    setOpen(false);
    setActive(-1);
  }

  return <div className="starting-point">
    <label className="field">
      <span>Starting point <small>(optional)</small></span>
      <input
        role="combobox" aria-autocomplete="list" aria-expanded={matches.length > 0}
        aria-controls={matches.length ? id : undefined}
        aria-activedescendant={matches[active] ? `${id}-${active}` : undefined}
        autoComplete="off" value={value} maxLength={200}
        placeholder="Your hotel, station, or current address"
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1); }}
        onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={event => {
          if (!matches.length) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const next = event.key === 'ArrowDown' ? active + 1 : active <= 0 ? matches.length - 1 : active - 1;
            setActive(next % matches.length);
          } else if (event.key === 'Enter' && matches[active]) {
            event.preventDefault();
            choose(matches[active].place);
          } else if (event.key === 'Escape') {
            event.stopPropagation();
            setOpen(false);
            setActive(-1);
          }
        }}
      />
    </label>
    {matches.length > 0 && <ul className="starting-point-options" id={id} role="listbox" aria-label={`Starting points in ${city}`}>
      {matches.map(({ place, kind }, index) => <li key={place.id} id={`${id}-${index}`}
        role="option" aria-selected={active === index}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(place)}>
        <strong>{place.name}</strong>
        <small>{kind} · {place.address || `${city}, ${country}`}</small>
      </li>)}
    </ul>}
  </div>;
}
