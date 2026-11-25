import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Eye,
  Map as MapIcon,
  MapPin,
  Share2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { places as handpicked } from '../shared/catalog';
import type { Place, Trip } from '../shared/types';
import { loadPlaces } from './discovery-data';
import {
  formatVisitTime,
  timePeriodLabel,
  type SharedTripData,
} from './engagement';
import InteractiveMapPreview from './InteractiveMapPreview';
import Modal from './Modal';
import PlacePhoto from './PlacePhoto';
import { departureFor } from './stay-dates';

const handpickedById = new Map(handpicked.map(place => [place.id, place]));

function formatReadableDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SharedTripView({
  shared,
  flag,
  onClone,
  onExit,
  onCopyLink,
  onDetail,
}: {
  shared: SharedTripData;
  flag: (country: string) => string;
  onClone: (hydratedPlaces: Place[]) => void;
  onExit: () => void;
  onCopyLink: () => void;
  onDetail: (place: Place) => void;
}) {
  const [hydratedPlaces, setHydratedPlaces] = useState<Place[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [copied, setCopied] = useState(false);

  const needsHydration = useMemo(
    () => shared.stops.some(stop => !stop.place && !handpickedById.has(stop.placeId)),
    [shared],
  );

  useEffect(() => {
    if (!needsHydration) return;
    let active = true;
    loadPlaces({ country: shared.country, city: shared.city })
      .then(({ places }) => {
        if (active) setHydratedPlaces(places);
      })
      .catch(() => {
        /* Keep available stop details when offline or rate limited. */
      });
    return () => {
      active = false;
    };
  }, [needsHydration, shared.country, shared.city]);

  const hydratedById = useMemo(
    () => new Map(hydratedPlaces.map(place => [place.id, place])),
    [hydratedPlaces],
  );

  const resolveStopPlace = (stop: SharedTripData['stops'][number]): Place | undefined =>
    stop.place || handpickedById.get(stop.placeId) || hydratedById.get(stop.placeId);

  const allResolvedPlaces = useMemo(
    () =>
      shared.stops
        .map(resolveStopPlace)
        .filter((place): place is Place => Boolean(place)),
    [shared.stops, hydratedById],
  );

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="shared-trip-page" aria-label="Shared read-only itinerary">
      <button type="button" className="back-link" onClick={onExit}>
        <ArrowLeft size={16} /> Back to Roam
      </button>

      <div className="shared-banner">
        <div className="shared-banner-top">
          <span className="eyebrow">
            <span className="yellow-line" /> SHARED ROAM ITINERARY
          </span>
          <div className="shared-badges">
            <span className="shared-pill">
              <Eye size={13} aria-hidden="true" /> Read-only view
            </span>
            {shared.sharedBy && (
              <span className="shared-pill shared-by-pill">
                <UserCheck size={13} aria-hidden="true" /> Shared by {shared.sharedBy}
              </span>
            )}
          </div>
        </div>

        <div className="shared-banner-main">
          <div>
            <h1>{shared.title}</h1>
            <p className="shared-meta">
              <span>
                <MapPin size={15} aria-hidden="true" /> {flag(shared.country)} {shared.city},{' '}
                {shared.country}
              </span>
              <span>·</span>
              <span>
                <CalendarDays size={15} aria-hidden="true" /> {shared.days}{' '}
                {shared.days === 1 ? 'day' : 'days'}
                {shared.startDate
                  ? ` (${formatReadableDate(shared.startDate)} – ${formatReadableDate(
                      departureFor(shared.startDate, shared.days),
                    )})`
                  : ''}
              </span>
              <span>·</span>
              <span>
                {shared.stops.length} {shared.stops.length === 1 ? 'stop' : 'stops'}
              </span>
            </p>
          </div>

          <div className="shared-actions">
            <button
              type="button"
              className="btn btn-yellow"
              onClick={() => onClone(hydratedPlaces)}
            >
              <Copy size={16} aria-hidden="true" /> Clone to my trips
            </button>
            <button type="button" className="btn btn-outline" onClick={handleCopy}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
              {copied ? 'Link copied!' : 'Copy share link'}
            </button>
            {allResolvedPlaces.length > 0 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowMap(value => !value)}
              >
                <MapIcon size={16} aria-hidden="true" />
                {showMap ? 'Hide map' : 'Trip map'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showMap && allResolvedPlaces.length > 0 && (
        <div className="shared-map-wrap">
          <InteractiveMapPreview
            place={allResolvedPlaces[0]}
            all={allResolvedPlaces}
            onDetail={onDetail}
          />
        </div>
      )}

      <div className="shared-days-list">
        {Array.from({ length: shared.days }, (_, index) => {
          const dayNum = index + 1;
          const dayStops = shared.stops.filter(stop => stop.day === dayNum);
          return (
            <div className="shared-day-section" key={dayNum}>
              <div className="shared-day-header">
                <span className="day-num">{String(dayNum).padStart(2, '0')}</span>
                <div>
                  <h2>Day {dayNum}</h2>
                  <p>
                    {dayStops.length} {dayStops.length === 1 ? 'planned stop' : 'planned stops'}
                  </p>
                </div>
              </div>

              {dayStops.length ? (
                <div className="shared-stops-grid">
                  {dayStops.map((stop, stopIdx) => {
                    const place = resolveStopPlace(stop);
                    const formattedTime = formatVisitTime(stop.time);
                    const period = timePeriodLabel(stop.time);

                    if (!place) {
                      return (
                        <article className="shared-stop-card" key={stop.id}>
                          <span className="shared-stop-index">{stopIdx + 1}</span>
                          <div className="shared-stop-body">
                            {formattedTime && (
                              <span className="time-badge">
                                <Clock3 size={12} aria-hidden="true" /> {formattedTime}
                                {period ? ` · ${period}` : ''}
                              </span>
                            )}
                            <h3>{stop.placeId}</h3>
                            {stop.notes && <p className="shared-stop-notes">{stop.notes}</p>}
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article className="shared-stop-card" key={stop.id}>
                        <span className="shared-stop-index">{stopIdx + 1}</span>
                        <div className="shared-stop-photo">
                          <PlacePhoto place={place} />
                          <a
                            className="thumbnail-credit"
                            href="/photo-credits.html"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Photo credits
                          </a>
                        </div>
                        <div className="shared-stop-body">
                          <div className="shared-stop-topmeta">
                            <span className="eyebrow">{place.category}</span>
                            {formattedTime && (
                              <span className="time-badge">
                                <Clock3 size={12} aria-hidden="true" /> {formattedTime}
                                {period ? ` · ${period}` : ''}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="shared-stop-title"
                            onClick={() => onDetail(place)}
                          >
                            {place.name}
                          </button>
                          <p className="shared-stop-facts">
                            <Clock3 size={13} aria-hidden="true" /> {place.duration} · {place.price}
                          </p>
                          {stop.notes && <p className="shared-stop-notes">{stop.notes}</p>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="shared-day-empty">
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Open day — room for spontaneous discoveries.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ShareTripModal({
  trip,
  url,
  onClose,
  onCopy,
  onPreview,
}: {
  trip: Trip;
  url: string;
  onClose: () => void;
  onCopy: () => void;
  onPreview: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal title="Share your itinerary" onClose={onClose}>
      <div className="modal-heading-icon">
        <Share2 size={26} />
      </div>
      <div className="eyebrow">BRING FRIENDS ALONG</div>
      <h2>Share your itinerary.</h2>
      <p className="modal-intro">
        Anyone with this read-only link can browse <strong>{trip.title}</strong> ({trip.city},{' '}
        {trip.country} · {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}) and clone
        a copy into their own Roam planner.
      </p>
      <div className="share-url-box">
        <label className="field">
          <span>Shareable trip link</span>
          <input
            aria-label="Shareable trip link"
            type="text"
            readOnly
            value={url}
            onFocus={e => e.currentTarget.select()}
          />
        </label>
      </div>
      <div className="share-modal-actions">
        <button type="button" className="btn btn-yellow full" onClick={handleCopy}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Link copied!' : 'Copy share link'}
        </button>
        <button type="button" className="btn btn-outline full" onClick={onPreview}>
          <Eye size={16} aria-hidden="true" /> Preview read-only page
        </button>
      </div>
      <p className="fine-print">
        The link encodes your trip snapshot right in the URL — no personal email or private account
        data is exposed.
      </p>
    </Modal>
  );
}
