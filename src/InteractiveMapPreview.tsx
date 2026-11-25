import { useState } from 'react';
import { ArrowUp, Check, Clock3, MapPin, Plus, Star } from 'lucide-react';
import type { Place } from '../shared/types';
import PlacePhoto from './PlacePhoto';

interface InteractiveMapPreviewProps {
  place: Place;
  all?: Place[];
  day?: number;
  addedPlaceIds?: Set<string>;
  onQuickAdd?: (place: Place) => void;
  onDetail?: (place: Place) => void;
}

export default function InteractiveMapPreview({
  place,
  all,
  day,
  addedPlaceIds,
  onQuickAdd,
  onDetail,
}: InteractiveMapPreviewProps) {
  const nearby = all?.length ? all : [place];
  const [selectedId, setSelectedId] = useState(place.id);
  const selected = nearby.find(item => item.id === selectedId) ?? place;
  const visiblePins = nearby.slice(0, 16);

  const minLat = Math.min(...nearby.map(p => p.lat)) - 0.015;
  const maxLat = Math.max(...nearby.map(p => p.lat)) + 0.015;
  const minLng = Math.min(...nearby.map(p => p.lng)) - 0.02;
  const maxLng = Math.max(...nearby.map(p => p.lng)) + 0.02;

  const osmEmbedHost = 'https://www.openstreetmap.org';
  const src = `${osmEmbedHost}/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${selected.lat},${selected.lng}`;
  const fullMapUrl = `${osmEmbedHost}/?mlat=${selected.lat}&mlon=${selected.lng}#map=15/${selected.lat}/${selected.lng}`;

  const isAdded = Boolean(addedPlaceIds?.has(selected.id));

  return (
    <div className="interactive-map-shell">
      <div className="map-wrap">
        <iframe
          title={`Map of ${selected.city}: ${selected.name}`}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <a href={fullMapUrl} target="_blank" rel="noreferrer">
          Open full map <ArrowUp className="diagonal" size={13} />
        </a>
        {all && (
          <p>
            Pinned on {selected.name}. Select a place below to move the map pin
            {onQuickAdd && day ? ` or add directly to Day ${day}.` : '.'}
          </p>
        )}
      </div>

      {all && visiblePins.length > 0 && (
        <div className="map-interactive-panel">
          <div className="map-pins-bar" role="group" aria-label="Map place pins">
            {visiblePins.map((item, idx) => {
              const active = item.id === selected.id;
              const added = Boolean(addedPlaceIds?.has(item.id));
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`map-pin-chip ${active ? 'active' : ''} ${added ? 'added' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="map-pin-num">{idx + 1}</span>
                  <span className="map-pin-name">{item.name}</span>
                  {added && <Check size={12} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="map-selected-card">
            <div className="map-selected-photo">
              <PlacePhoto place={selected} />
            </div>
            <div className="map-selected-body">
              <div className="map-selected-meta">
                <span>{selected.category}</span>
                {selected.rating !== null && (
                  <span className="map-selected-rating">
                    <Star size={12} fill="currentColor" aria-hidden="true" /> {selected.rating.toFixed(1)}
                  </span>
                )}
                <a
                  className="thumbnail-credit"
                  href="/photo-credits.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Photo credits
                </a>
              </div>
              <h4>{selected.name}</h4>
              <div className="map-selected-sub">
                <span>
                  <MapPin size={12} aria-hidden="true" /> {selected.city}
                </span>
                <span>
                  <Clock3 size={12} aria-hidden="true" /> {selected.duration}
                </span>
              </div>
            </div>
            <div className="map-selected-actions">
              {onDetail && (
                <button
                  type="button"
                  className="btn btn-outline map-pin-detail-btn"
                  onClick={() => onDetail(selected)}
                >
                  Details
                </button>
              )}
              {onQuickAdd && day && (
                <button
                  type="button"
                  className={`map-pin-add-btn ${isAdded ? 'added' : ''}`}
                  aria-label={`Quick add ${selected.name} from map to Day ${day}`}
                  onClick={() => onQuickAdd(selected)}
                >
                  {isAdded ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  {isAdded ? `On Day ${day}` : `+ Day ${day}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
