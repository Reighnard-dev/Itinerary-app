import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Building,
  Bus,
  Car,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Footprints,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Sparkles,
  TrainFront,
  TramFront,
  X,
} from 'lucide-react';
import type { Place, Stop, Trip } from '../shared/types';
import type {
  RouteLocation,
  RouteOption,
  RouteResponse,
  RouteStep,
  TravelMode,
} from '../shared/routes';
import { formatDistance, formatDuration, formatTime } from '../shared/routes';
import { api } from './api';
import DirectionsMap from './DirectionsMap';
import PlacePhoto from './PlacePhoto';

interface DirectionsPanelProps {
  place: Place;
  trip: Trip;
  initialTransport?: 'transit' | 'driving' | 'walking';
  initialOrigin?: string;
  onClose: () => void;
  onBackToDetail?: () => void;
}

type OriginType = 'current' | 'hotel' | 'custom';

export default function DirectionsPanel({
  place,
  trip,
  initialTransport = 'transit',
  initialOrigin = '',
  onClose,
  onBackToDetail,
}: DirectionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Travel Mode state: 'WALK' | 'DRIVE' | 'TRANSIT'
  const [travelMode, setTravelMode] = useState<TravelMode>(() => {
    if (initialTransport === 'driving') return 'DRIVE';
    if (initialTransport === 'walking') return 'WALK';
    return 'TRANSIT';
  });

  // Origin selection state
  const [originType, setOriginType] = useState<OriginType>(() => {
    return initialOrigin ? 'custom' : 'hotel';
  });

  const [customOrigin, setCustomOrigin] = useState(initialOrigin);
  const [submittedOriginText, setSubmittedOriginText] = useState(initialOrigin);

  // Geolocation state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Find hotel/accommodation stops in the user's trip
  const accommodationStops = useMemo(() => {
    return trip.stops.filter((s) => {
      const p = s.place;
      if (!p) return false;
      const isHotelCat = p.category === 'Hotels';
      const isHotelName = /hotel|inn|resort|hostel|lodge|suites|stay/i.test(p.name);
      return isHotelCat || isHotelName;
    });
  }, [trip.stops]);

  // Selected hotel stop ID (defaults to first hotel if found, or first stop in trip)
  const [selectedStopId, setSelectedStopId] = useState<string>(() => {
    if (accommodationStops.length > 0) return accommodationStops[0].id;
    if (trip.stops.length > 0) return trip.stops[0].id;
    return '';
  });

  // Routing state
  const [routeResponse, setRouteResponse] = useState<RouteResponse | null>(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Destination object
  const destination: RouteLocation = useMemo(
    () => ({
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      address: place.address || `${place.city}, ${place.country}`,
    }),
    [place]
  );

  // Active Origin object
  const activeOrigin: RouteLocation | null = useMemo(() => {
    if (originType === 'current') {
      if (currentCoords) {
        return {
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          name: 'Current location',
          address: 'Current browser location',
        };
      }
      return null;
    }

    if (originType === 'hotel') {
      const stop = trip.stops.find((s) => s.id === selectedStopId);
      if (stop && stop.place) {
        return {
          lat: stop.place.lat,
          lng: stop.place.lng,
          name: stop.place.name,
          address: stop.place.address || `${stop.place.city}, ${stop.place.country}`,
        };
      }
      // If no stops, fallback to city center
      return {
        name: `${place.city} accommodation`,
        address: `${place.city}, ${place.country}`,
      };
    }

    if (originType === 'custom') {
      const text = submittedOriginText.trim();
      if (!text) return null;
      return {
        name: text,
        address: text,
      };
    }

    return null;
  }, [originType, currentCoords, selectedStopId, trip.stops, submittedOriginText, place.city, place.country]);

  // Handle Geolocation request only when clicked
  const requestCurrentLocation = () => {
    setOriginType('current');
    setGeoError('');
    if (currentCoords) return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please enter your location manually.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'Current location',
        });
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access was denied. You can enter an address manually or choose a saved hotel.');
        } else if (err.code === err.TIMEOUT) {
          setGeoError('Locating request timed out. Please enter your location manually.');
        } else {
          setGeoError('Unable to determine your current location. Please enter your starting point manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Construct Google Maps URL for fallback
  const googleMapsUrl = useMemo(() => {
    const destParam = `${place.lat},${place.lng}`;
    const modeParam =
      travelMode === 'TRANSIT' ? 'transit' : travelMode === 'DRIVE' ? 'driving' : 'walking';

    let originParam = '';
    if (activeOrigin) {
      if (activeOrigin.lat !== undefined && activeOrigin.lng !== undefined) {
        originParam = `&origin=${activeOrigin.lat},${activeOrigin.lng}`;
      } else if (activeOrigin.address || activeOrigin.name) {
        originParam = `&origin=${encodeURIComponent(activeOrigin.address || activeOrigin.name || '')}`;
      }
    } else if (customOrigin.trim()) {
      originParam = `&origin=${encodeURIComponent(customOrigin.trim())}`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${destParam}&travelmode=${modeParam}${originParam}`;
  }, [place.lat, place.lng, travelMode, activeOrigin, customOrigin]);

  // Fetch routes when activeOrigin, destination, or travelMode changes
  useEffect(() => {
    if (!activeOrigin) {
      setRouteResponse(null);
      setFetchError('');
      return;
    }

    let active = true;
    setLoading(true);
    setFetchError('');

    api<RouteResponse>('/routes', {
      method: 'POST',
      body: JSON.stringify({
        origin: activeOrigin,
        destination,
        travelMode,
      }),
    })
      .then((res) => {
        if (!active) return;
        setRouteResponse(res);
        setActiveRouteIndex(0);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('Route request error:', err.message);
        setFetchError('Unable to calculate directions for this route. Check the starting point or open Google Maps.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeOrigin, destination, travelMode]);

  // Keyboard navigation & accessibility (Escape to close)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeRoute: RouteOption | null = routeResponse?.routes?.[activeRouteIndex] || null;

  return (
    <aside
      ref={panelRef}
      className="directions-panel"
      role="dialog"
      aria-modal="false"
      aria-label={`Directions to ${place.name}`}
    >
      {/* Panel Header */}
      <header className="directions-header">
        <div className="directions-header-top">
          {onBackToDetail && (
            <button
              type="button"
              className="directions-back-btn"
              onClick={onBackToDetail}
              aria-label="Back to landmark details"
            >
              <ArrowLeft size={15} />
              <span>Back to landmark</span>
            </button>
          )}
          <button
            type="button"
            className="icon-btn directions-close-btn"
            onClick={onClose}
            aria-label="Close directions panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="directions-destination-card">
          <div className="directions-destination-thumb">
            <PlacePhoto place={place} />
          </div>
          <div className="directions-destination-meta">
            <span className="eyebrow">
              <Compass size={11} /> {place.city.toUpperCase()} · DIRECTIONS
            </span>
            <h2 className="directions-destination-title">{place.name}</h2>
            <p className="directions-destination-address">
              <MapPin size={13} /> {place.address || `${place.city}, ${place.country}`}
            </p>
          </div>
        </div>
      </header>

      {/* Interactive Map Area */}
      <div className="directions-map-section">
        <DirectionsMap
          origin={activeOrigin}
          destination={destination}
          route={activeRoute}
          travelMode={travelMode}
          googleMapsUrl={googleMapsUrl}
        />
      </div>

      {/* Main Content Area */}
      <div className="directions-body">
        {/* Origin Selector */}
        <section className="directions-origin-section" aria-label="Starting point selector">
          <label className="directions-section-label">
            <span>Starting point</span>
          </label>

          <div className="origin-tabs" role="radiogroup" aria-label="Choose starting point type">
            <button
              type="button"
              className={`origin-tab ${originType === 'hotel' ? 'active' : ''}`}
              onClick={() => {
                setOriginType('hotel');
                setGeoError('');
              }}
              role="radio"
              aria-checked={originType === 'hotel'}
            >
              <Building size={14} />
              <span>Accommodation</span>
            </button>

            <button
              type="button"
              className={`origin-tab ${originType === 'current' ? 'active' : ''}`}
              onClick={requestCurrentLocation}
              role="radio"
              aria-checked={originType === 'current'}
            >
              <LocateFixed size={14} />
              <span>Current location</span>
            </button>

            <button
              type="button"
              className={`origin-tab ${originType === 'custom' ? 'active' : ''}`}
              onClick={() => {
                setOriginType('custom');
                setGeoError('');
              }}
              role="radio"
              aria-checked={originType === 'custom'}
            >
              <Search size={14} />
              <span>Custom address</span>
            </button>
          </div>

          {/* Hotel Origin Content */}
          {originType === 'hotel' && (
            <div className="origin-content-box">
              {trip.stops.length > 0 ? (
                <label className="field">
                  <span>Choose accommodation or saved stop</span>
                  <select
                    value={selectedStopId}
                    onChange={(e) => setSelectedStopId(e.target.value)}
                    aria-label="Select itinerary accommodation"
                  >
                    {accommodationStops.length > 0 ? (
                      <optgroup label="Accommodations in trip">
                        {accommodationStops.map((s) => (
                          <option key={s.id} value={s.id}>
                            🏨 {s.place?.name} (Day {s.day})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    <optgroup label="Other trip stops">
                      {trip.stops.map((s) => (
                        <option key={s.id} value={s.id}>
                          Day {s.day} · {s.place?.name || 'Saved stop'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              ) : (
                <div className="origin-notice">
                  <Info size={15} />
                  <div>
                    <p>No hotel or stops saved to this itinerary yet.</p>
                    <p className="notice-sub">
                      You can enter your accommodation manually or use current GPS location.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Location Content */}
          {originType === 'current' && (
            <div className="origin-content-box">
              {geoLoading && (
                <div className="geo-status-loading">
                  <LoaderCircle className="spin" size={16} />
                  <span>Requesting GPS position from your browser…</span>
                </div>
              )}

              {geoError && (
                <div className="geo-status-error" role="alert">
                  <AlertCircle size={16} />
                  <div>
                    <p>{geoError}</p>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setOriginType('custom')}
                    >
                      Enter address manually →
                    </button>
                  </div>
                </div>
              )}

              {!geoLoading && !geoError && currentCoords && (
                <div className="geo-status-success">
                  <Check size={16} />
                  <span>
                    Current location ({currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)})
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={requestCurrentLocation}
                    title="Refresh current location"
                    aria-label="Refresh current location"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom Address Content */}
          {originType === 'custom' && (
            <div className="origin-content-box">
              <form
                className="custom-origin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmittedOriginText(customOrigin);
                }}
              >
                <div className="custom-input-wrap">
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder={`e.g. ${place.city} Station, hotel, or street`}
                    maxLength={200}
                    aria-label="Starting address or landmark"
                  />
                  <button
                    type="submit"
                    className="btn btn-yellow custom-apply-btn"
                    disabled={!customOrigin.trim()}
                  >
                    Set origin
                  </button>
                </div>
              </form>

              {/* Quick location chips for destination city */}
              <div className="quick-origins-chips" role="group" aria-label="Quick starting points">
                <span className="chips-label">Quick options:</span>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    setCustomOrigin(`${place.city} Station`);
                    setSubmittedOriginText(`${place.city} Station`);
                  }}
                >
                  {place.city} Station
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    setCustomOrigin(`Central ${place.city}`);
                    setSubmittedOriginText(`Central ${place.city}`);
                  }}
                >
                  City center
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Travel Mode Tabs */}
        <section className="directions-modes-section" aria-label="Travel mode selection">
          <label className="directions-section-label">
            <span>Mode of transport</span>
          </label>

          <div className="transport-tabs" role="tablist" aria-label="Transport modes">
            <button
              type="button"
              className={travelMode === 'TRANSIT' ? 'selected' : ''}
              onClick={() => setTravelMode('TRANSIT')}
              role="tab"
              aria-selected={travelMode === 'TRANSIT'}
            >
              <TrainFront size={16} />
              <span>Public transit</span>
              {travelMode === 'TRANSIT' && activeRoute && (
                <span className="tab-duration-badge">{activeRoute.durationText}</span>
              )}
            </button>

            <button
              type="button"
              className={travelMode === 'DRIVE' ? 'selected' : ''}
              onClick={() => setTravelMode('DRIVE')}
              role="tab"
              aria-selected={travelMode === 'DRIVE'}
            >
              <Car size={16} />
              <span>Driving</span>
              {travelMode === 'DRIVE' && activeRoute && (
                <span className="tab-duration-badge">{activeRoute.durationText}</span>
              )}
            </button>

            <button
              type="button"
              className={travelMode === 'WALK' ? 'selected' : ''}
              onClick={() => setTravelMode('WALK')}
              role="tab"
              aria-selected={travelMode === 'WALK'}
            >
              <Footprints size={16} />
              <span>Walking</span>
              {travelMode === 'WALK' && activeRoute && (
                <span className="tab-duration-badge">{activeRoute.durationText}</span>
              )}
            </button>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="directions-loading-state" role="status">
            <LoaderCircle className="spin" size={24} />
            <p>
              Calculating route to {place.name}…
              <small>
                {travelMode === 'TRANSIT'
                  ? 'Requesting transit connections…'
                  : 'Computing travel time and distance…'}
              </small>
            </p>
          </div>
        )}

        {/* Error State */}
        {fetchError && !loading && (
          <div className="directions-error-card" role="alert">
            <AlertCircle size={20} />
            <div>
              <strong>Could not compute route</strong>
              <p>{fetchError}</p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-yellow"
                style={{ marginTop: '10px' }}
              >
                Open in Google Maps <ArrowUp className="diagonal" size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Empty State when no origin specified */}
        {!activeOrigin && !loading && (
          <div className="directions-empty-state">
            <Navigation size={28} />
            <p>Select your starting point above to calculate route previews to {place.name}.</p>
          </div>
        )}

        {/* Public Transit Unavailable / Unsupported State */}
        {travelMode === 'TRANSIT' && routeResponse?.transitUnavailable && !loading && (
          <div className="transit-unavailable-card">
            <div className="transit-notice-header">
              <Bus size={20} />
              <strong>Live transit details are unavailable for this location.</strong>
            </div>
            <p className="transit-notice-desc">
              Published bus lines, subway timetables, and live arrival times for this route require
              local transit data. Google Maps provides real-time arrivals and delay notices.
            </p>

            {place.transit && (
              <div className="roam-transit-advice">
                <span className="advice-label">Roam curated transport advice:</span>
                <p>{place.transit}</p>
              </div>
            )}

            <div className="transit-fallback-action">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-yellow full"
              >
                <TrainFront size={16} />
                <span>Open in Google Maps for live transit</span>
                <ArrowUp className="diagonal" size={15} />
              </a>
            </div>
          </div>
        )}

        {/* Route Summary & Alternative Routes */}
        {activeRoute && !loading && (
          <section className="route-results-section" aria-label="Route summary and instructions">
            {/* Route Alternative Tabs if multiple routes available */}
            {routeResponse && routeResponse.routes.length > 1 && (
              <div className="route-options-selector">
                <span className="route-options-label">Available routes:</span>
                <div className="route-options-list">
                  {routeResponse.routes.map((rt, idx) => (
                    <button
                      key={rt.id}
                      type="button"
                      className={`route-option-chip ${activeRouteIndex === idx ? 'selected' : ''}`}
                      onClick={() => setActiveRouteIndex(idx)}
                    >
                      <span className="route-opt-time">{rt.durationText}</span>
                      <span className="route-opt-dist">{rt.distanceText}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Route Summary Banner */}
            <div className="route-summary-card">
              <div className="route-time-distance">
                <div className="time-badge">
                  <Clock3 size={18} />
                  <span className="time-value">{activeRoute.durationText}</span>
                </div>
                <span className="dist-value">{activeRoute.distanceText}</span>
              </div>

              <p className="route-summary-title">{activeRoute.summary}</p>

              {/* Transit Details Summary if applicable */}
              {travelMode === 'TRANSIT' && (
                <div className="transit-highlights">
                  <span className="transit-transfers">
                    {activeRoute.transfersCount === 0
                      ? 'Direct journey'
                      : `${activeRoute.transfersCount} transfer${activeRoute.transfersCount > 1 ? 's' : ''}`}
                  </span>
                  {activeRoute.transitFare && (
                    <span className="transit-fare">
                      Fare: {activeRoute.transitFare.currencyCode} {activeRoute.transitFare.amount}
                    </span>
                  )}
                  <span className="transit-schedule-badge">
                    <Info size={11} /> Timetable schedule
                  </span>
                </div>
              )}
            </div>

            {/* Step-by-Step Instructions */}
            {activeRoute.steps && activeRoute.steps.length > 0 && (
              <div className="route-steps-container">
                <h3 className="route-steps-heading">
                  <span>Step-by-step instructions</span>
                  <small>{activeRoute.steps.length} steps</small>
                </h3>

                <ol className="route-steps-list">
                  {activeRoute.steps.map((step, sIdx) => {
                    const isTransit = step.travelMode === 'TRANSIT' && step.transitDetails;
                    const td = step.transitDetails;

                    return (
                      <li key={step.id} className={`route-step-item ${isTransit ? 'transit-step' : ''}`}>
                        <div className="step-icon-wrap">
                          {isTransit ? (
                            td?.vehicleType === 'SUBWAY' ? (
                              <TrainFront size={16} />
                            ) : td?.vehicleType === 'TRAM' ? (
                              <TramFront size={16} />
                            ) : td?.vehicleType === 'BUS' ? (
                              <Bus size={16} />
                            ) : (
                              <TrainFront size={16} />
                            )
                          ) : step.travelMode === 'DRIVE' ? (
                            <Car size={15} />
                          ) : (
                            <Footprints size={15} />
                          )}
                        </div>

                        <div className="step-content">
                          <p className="step-instruction">{step.instruction}</p>

                          {isTransit && td && (
                            <div className="step-transit-card">
                              <div
                                className="transit-line-badge"
                                style={{
                                  backgroundColor: td.lineColor || '#22422d',
                                  color: td.lineTextColor || '#ffffff',
                                }}
                              >
                                {td.lineShortName || td.lineName}
                              </div>

                              <div className="transit-stops-info">
                                <div className="stop-point departure">
                                  <span className="stop-name">{td.departureStop}</span>
                                  {td.departureTime && (
                                    <span className="stop-time">
                                      Departs: {formatTime(td.departureTime)}
                                    </span>
                                  )}
                                </div>

                                <div className="stop-route-line">
                                  <span className="stop-count">
                                    {td.stopCount ? `${td.stopCount} stops` : 'In transit'}
                                    {td.headsign ? ` · toward ${td.headsign}` : ''}
                                  </span>
                                </div>

                                <div className="stop-point arrival">
                                  <span className="stop-name">{td.arrivalStop}</span>
                                  {td.arrivalTime && (
                                    <span className="stop-time">
                                      Arrives: {formatTime(td.arrivalTime)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="step-meta">
                            <span>{step.distanceText}</span>
                            <span>·</span>
                            <span>{step.durationText}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        )}

        {/* Editorial transport advice preserved from Roam catalog */}
        {travelMode !== 'TRANSIT' && (
          <div className="roam-editorial-box">
            <span className="editorial-label">Roam travel guidance</span>
            <p>
              {travelMode === 'DRIVE'
                ? place.driving
                : 'Pedestrian routes in historical quarters can include steps, cobblestones, and temple grounds. Take your time to explore along the way.'}
            </p>
          </div>
        )}

        {/* Secondary Google Maps Fallback Button (Always Available) */}
        <div className="directions-fallback-footer">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline full google-maps-fallback-btn"
            aria-label="Open in Google Maps"
          >
            <span>Open in Google Maps</span>
            <ArrowUp className="diagonal" size={15} />
          </a>
          <p className="directions-disclaimer">
            Route timings, road traffic, and public transport schedules vary. Check current
            disruptions with transit authorities before travel.
          </p>
        </div>
      </div>
    </aside>
  );
}
