import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Compass, MapPin, Minus, Plus, RotateCcw } from 'lucide-react';
import type { LatLng, RouteLocation, RouteOption, TravelMode } from '../shared/routes';

interface DirectionsMapProps {
  origin: RouteLocation | null;
  destination: RouteLocation;
  route: RouteOption | null;
  travelMode: TravelMode;
  googleMapsUrl: string;
}

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.google?.maps) return Promise.resolve();
  if (window.__googleMapsLoadingPromise) return window.__googleMapsLoadingPromise;

  window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-roam-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-roam-google-maps', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

export default function DirectionsMap({
  origin,
  destination,
  route,
  travelMode,
  googleMapsUrl,
}: DirectionsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const googleMapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  // Attempt to load Google Maps JS API if key is present
  useEffect(() => {
    if (!apiKey) return;
    let mounted = true;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (mounted && window.google?.maps) {
          setGoogleMapsReady(true);
        }
      })
      .catch((err) => {
        console.warn('Google Maps JS API load failed, using interactive preview:', err.message);
        if (mounted) setGoogleMapsError(true);
      });

    return () => {
      mounted = false;
    };
  }, [apiKey]);

  // Render Google Map when ready
  useEffect(() => {
    if (!googleMapsReady || !mapContainerRef.current || !window.google?.maps) return;

    if (!googleMapInstanceRef.current) {
      // Roam editorial styling: warm, subtle, elegant
      const roamMapStyles = [
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d8e5df' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#fbf9f4' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#faeed2' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5eee0' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#74776a' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#88897f' }] },
      ];

      googleMapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        zoom: 14,
        center: { lat: destination.lat, lng: destination.lng },
        styles: roamMapStyles,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
    }

    const map = googleMapInstanceRef.current;

    // Clear previous markers and polyline
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const bounds = new window.google.maps.LatLngBounds();

    // Destination Marker (Gold Roam Pin)
    const dLat = destination.lat ?? 0;
    const dLng = destination.lng ?? 0;
    const destLatLng = new window.google.maps.LatLng(dLat, dLng);
    bounds.extend(destLatLng);
    const destMarker = new window.google.maps.Marker({
      position: destLatLng,
      map,
      title: destination.name || 'Destination',
      label: {
        text: 'B',
        color: '#262923',
        fontWeight: '700',
        fontSize: '12px',
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: '#f5cf43',
        fillOpacity: 1,
        strokeColor: '#262923',
        strokeWeight: 2,
      },
    });
    markersRef.current.push(destMarker);

    // Origin Marker (Forest Green Pin)
    if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
      const originLatLng = new window.google.maps.LatLng(origin.lat, origin.lng);
      bounds.extend(originLatLng);
      const originMarker = new window.google.maps.Marker({
        position: originLatLng,
        map,
        title: origin.name || origin.address || 'Starting point',
        label: {
          text: 'A',
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '12px',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#22422d',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(originMarker);
    }

    // Polyline
    if (route && route.path && route.path.length > 0) {
      const pathPoints = route.path.map((p) => {
        const pt = new window.google.maps.LatLng(p.lat, p.lng);
        bounds.extend(pt);
        return pt;
      });

      const strokeColor =
        travelMode === 'TRANSIT' ? '#3d5a80' : travelMode === 'DRIVE' ? '#b45309' : '#22422d';

      polylineRef.current = new window.google.maps.Polyline({
        path: pathPoints,
        geodesic: true,
        strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      });

      // Transit stop markers along the route
      if (travelMode === 'TRANSIT' && route.steps) {
        route.steps.forEach((step) => {
          if (step.transitDetails) {
            // intermediate stops or lines if coordinates exist
          }
        });
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [googleMapsReady, destination, origin, route, travelMode]);

  // Compute bounding box for fallback preview
  const points: LatLng[] = [];
  if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
    points.push({ lat: destination.lat, lng: destination.lng });
  }
  if (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number') {
    points.push({ lat: origin.lat, lng: origin.lng });
  }
  if (route && route.path && route.path.length > 0) {
    points.push(...route.path);
  }

  const fallbackLat = destination.lat ?? 0;
  const fallbackLng = destination.lng ?? 0;
  const lats = points.length ? points.map((p) => p.lat) : [fallbackLat];
  const lngs = points.length ? points.map((p) => p.lng) : [fallbackLng];

  const minLat = Math.min(...lats) - 0.012 / zoomLevel;
  const maxLat = Math.max(...lats) + 0.012 / zoomLevel;
  const minLng = Math.min(...lngs) - 0.015 / zoomLevel;
  const maxLng = Math.max(...lngs) + 0.015 / zoomLevel;

  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${fallbackLat},${fallbackLng}`;

  const hasGoogleMap = googleMapsReady && !googleMapsError && Boolean(apiKey);

  return (
    <div className="directions-map-wrapper">
      {hasGoogleMap ? (
        <div
          ref={mapContainerRef}
          className="directions-google-map"
          role="region"
          aria-label={`Interactive Google Map route to ${destination.name || 'destination'}`}
        />
      ) : (
        <div className="directions-preview-map">
          <iframe
            title={`Route map to ${destination.name || 'landmark'}`}
            src={osmSrc}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="directions-iframe"
          />
          <div className="map-preview-badge">
            <Compass size={13} />
            <span>Map preview</span>
          </div>

          <div className="map-zoom-controls" role="group" aria-label="Map zoom controls">
            <button
              type="button"
              className="map-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="map-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              className="map-zoom-btn"
              onClick={() => setZoomLevel(1)}
              aria-label="Reset zoom"
              title="Reset view"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="directions-map-footer">
        <span className="directions-pin-legend">
          <span className="legend-pin origin-pin" title="Starting point">
            A
          </span>
          <span className="legend-text">{origin?.name || origin?.address || 'Origin'}</span>
          <span className="legend-arrow">→</span>
          <span className="legend-pin dest-pin" title="Destination">
            B
          </span>
          <span className="legend-text">{destination.name || 'Destination'}</span>
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="map-external-link"
          aria-label="Open route in Google Maps"
        >
          Open full map <ArrowUp className="diagonal" size={12} />
        </a>
      </div>
    </div>
  );
}
