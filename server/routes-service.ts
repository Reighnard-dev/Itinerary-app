import type {
  LatLng,
  RouteLocation,
  RouteOption,
  RouteResponse,
  RouteStep,
  TravelMode,
} from '../shared/routes.js';
import {
  decodePolyline,
  encodePolyline,
  formatDistance,
  formatDuration,
  haversineDistance,
} from '../shared/routes.js';

interface GoogleTransitStop {
  name?: string;
  location?: { latLng?: { latitude?: number; longitude?: number } };
}

interface GoogleStopDetails {
  arrivalStop?: GoogleTransitStop;
  arrivalTime?: string;
  departureStop?: GoogleTransitStop;
  departureTime?: string;
}

interface GoogleTransitLine {
  name?: string;
  nameShort?: string;
  color?: string;
  textColor?: string;
  vehicle?: {
    name?: { text?: string };
    type?: string;
    iconUri?: string;
  };
  agencies?: Array<{ name?: string; uri?: string; phone?: string }>;
}

interface GoogleTransitDetails {
  stopDetails?: GoogleStopDetails;
  transitLine?: GoogleTransitLine;
  headsign?: string;
  stopCount?: number;
}

interface GoogleRouteStep {
  distanceMeters?: number;
  staticDuration?: string;
  polyline?: { encodedPolyline?: string };
  navigationInstruction?: { instructions?: string; maneuver?: string };
  travelMode?: string;
  transitDetails?: GoogleTransitDetails;
}

interface GoogleRouteLeg {
  duration?: string;
  distanceMeters?: number;
  steps?: GoogleRouteStep[];
}

interface GoogleRoute {
  duration?: string;
  distanceMeters?: number;
  description?: string;
  polyline?: { encodedPolyline?: string };
  legs?: GoogleRouteLeg[];
  travelAdvisory?: {
    transitFare?: {
      currencyCode?: string;
      units?: string;
      nanos?: number;
    };
  };
  routeLabels?: string[];
}

interface GoogleComputeRoutesResponse {
  routes?: GoogleRoute[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/^(\d+(?:\.\d+)?)s?$/);
  if (match) {
    return Math.round(parseFloat(match[1]));
  }
  return 0;
}

export function computePreviewRoute(
  origin: RouteLocation,
  destination: RouteLocation,
  travelMode: TravelMode
): RouteResponse {
  return {
    ok: true, provider: 'roam-preview', hasApiKey: false, travelMode, routes: [],
    ...(travelMode === 'TRANSIT' ? {transitUnavailable: true} : {}),
    message: travelMode === 'TRANSIT' ? 'Live transit details are unavailable for this location.' : 'Live directions are unavailable. Open Google Maps for a verified route, distance, and travel time.',
  };
}

export async function requestGoogleRoutes(
  origin: RouteLocation,
  destination: RouteLocation,
  travelMode: TravelMode,
  apiKey: string,
  signal?: AbortSignal
): Promise<RouteResponse> {
  const originObject =
    origin.lat !== undefined && origin.lng !== undefined
      ? { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } }
      : { address: origin.address || origin.name || 'Origin' };

  const destObject = {
    location: { latLng: { latitude: destination.lat ?? 0, longitude: destination.lng ?? 0 } },
  };

  const body: Record<string, unknown> = {
    origin: originObject,
    destination: destObject,
    travelMode: travelMode === 'TRANSIT' ? 'TRANSIT' : travelMode === 'DRIVE' ? 'DRIVE' : 'WALK',
    languageCode: 'en-US',
    units: 'METRIC',
  };

  if (travelMode !== 'TRANSIT') {
    body.computeAlternativeRoutes = true;
    if (travelMode === 'DRIVE') {
      body.routingPreference = 'TRAFFIC_AWARE';
    }
  } else {
    // In Routes API v2, computeAlternativeRoutes is unsupported for TRANSIT
    body.transitPreferences = {
      routingPreference: 'LESS_WALKING',
    };
  }

  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.description',
    'routes.polyline.encodedPolyline',
    'routes.legs',
    'routes.travelAdvisory.transitFare',
    'routes.routeLabels',
  ].join(',');

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errJson: GoogleComputeRoutesResponse | null = null;
      try {
        errJson = JSON.parse(errText);
      } catch {
        // Not JSON
      }

      console.warn('Google Routes API response status:', res.status, errJson?.error?.message || errText);

      // If transit routing is not supported or no transit route found
      if (travelMode === 'TRANSIT') {
        return {
          ok: true,
          provider: 'google-routes-api',
          hasApiKey: true,
          travelMode: 'TRANSIT',
          routes: [],
          transitUnavailable: true,
          message: 'Live transit details are unavailable for this location.',
        };
      }

      return {
        ok: false,
        provider: 'google-routes-api',
        hasApiKey: true,
        travelMode,
        routes: [],
        error: errJson?.error?.status || 'ROUTING_FAILED',
        message: errJson?.error?.message || 'Unable to calculate route with Google Routes API.',
      };
    }

    const data = (await res.json()) as GoogleComputeRoutesResponse;

    if (!data.routes || data.routes.length === 0) {
      if (travelMode === 'TRANSIT') {
        return {
          ok: true,
          provider: 'google-routes-api',
          hasApiKey: true,
          travelMode: 'TRANSIT',
          routes: [],
          transitUnavailable: true,
          message: 'Live transit details are unavailable for this location.',
        };
      }
      return {
        ok: false,
        provider: 'google-routes-api',
        hasApiKey: true,
        travelMode,
        routes: [],
        error: 'ZERO_RESULTS',
        message: 'No route found between these locations.',
      };
    }

    const routes: RouteOption[] = data.routes.map((route, idx) => {
      const durationSeconds = parseDurationSeconds(route.duration);
      const distanceMeters = route.distanceMeters || 0;
      const encodedPolyline = route.polyline?.encodedPolyline || '';
      const path = decodePolyline(encodedPolyline);

      let transitStepsCount = 0;
      let walkingSeconds = 0;

      const steps: RouteStep[] = [];
      const leg = route.legs?.[0];

      if (leg?.steps) {
        leg.steps.forEach((step, sIdx) => {
          const stepDuration = parseDurationSeconds(step.staticDuration);
          const stepDistance = step.distanceMeters || 0;
          const stepTravelMode: TravelMode =
            step.travelMode === 'TRANSIT'
              ? 'TRANSIT'
              : step.travelMode === 'DRIVE'
              ? 'DRIVE'
              : 'WALK';

          if (stepTravelMode === 'TRANSIT') {
            transitStepsCount++;
          } else if (stepTravelMode === 'WALK') {
            walkingSeconds += stepDuration;
          }

          let transitDetails = undefined;
          if (step.transitDetails) {
            const td = step.transitDetails;
            transitDetails = {
              lineName: td.transitLine?.name || 'Transit line',
              lineShortName: td.transitLine?.nameShort,
              lineColor: td.transitLine?.color,
              lineTextColor: td.transitLine?.textColor,
              vehicleType: td.transitLine?.vehicle?.type || 'TRANSIT',
              vehicleName: td.transitLine?.vehicle?.name?.text,
              departureStop: td.stopDetails?.departureStop?.name || 'Departure stop',
              departureTime: td.stopDetails?.departureTime,
              arrivalStop: td.stopDetails?.arrivalStop?.name || 'Arrival stop',
              arrivalTime: td.stopDetails?.arrivalTime,
              stopCount: td.stopCount,
              headsign: td.headsign,
              agencyName: td.transitLine?.agencies?.[0]?.name,
              isLive: false,
            };
          }

          const defaultInstruction =
            stepTravelMode === 'TRANSIT'
              ? `Board ${transitDetails?.lineName || 'transit'}`
              : stepTravelMode === 'DRIVE'
              ? 'Follow the road'
              : 'Walk along the route';

          steps.push({
            id: `step-${idx}-${sIdx}`,
            travelMode: stepTravelMode,
            instruction: step.navigationInstruction?.instructions || defaultInstruction,
            distanceMeters: stepDistance,
            distanceText: formatDistance(stepDistance),
            durationSeconds: stepDuration,
            durationText: formatDuration(stepDuration),
            transitDetails,
          });
        });
      }

      let transitFare = undefined;
      if (route.travelAdvisory?.transitFare) {
        const fare = route.travelAdvisory.transitFare;
        const units = fare.units || '0';
        const nanos = fare.nanos ? (fare.nanos / 1e9).toFixed(2).slice(1) : '';
        transitFare = {
          currencyCode: fare.currencyCode || '',
          amount: `${units}${nanos}`,
        };
      }

      return {
        id: `google-route-${idx}`,
        summary: route.description || (travelMode === 'TRANSIT' ? 'Transit route' : `Route ${idx + 1}`),
        distanceMeters,
        distanceText: formatDistance(distanceMeters),
        durationSeconds,
        durationText: formatDuration(durationSeconds),
        encodedPolyline,
        path,
        steps,
        transfersCount: Math.max(0, transitStepsCount - 1),
        walkingDurationSeconds: walkingSeconds,
        transitFare,
        isRecommended: idx === 0,
        routeLabels: route.routeLabels,
      };
    });

    return {
      ok: true,
      provider: 'google-routes-api',
      hasApiKey: true,
      travelMode,
      routes,
      transitUnavailable: travelMode === 'TRANSIT' && routes.length === 0,
    };
  } catch (fetchErr) {
    console.error('Google Routes API fetch error:', (fetchErr as Error).message);
    if (travelMode === 'TRANSIT') {
      return {
        ok: true,
        provider: 'google-routes-api',
        hasApiKey: true,
        travelMode: 'TRANSIT',
        routes: [],
        transitUnavailable: true,
        message: 'Live transit details are unavailable for this location.',
      };
    }
    return {
      ok: false,
      provider: 'google-routes-api',
      hasApiKey: true,
      travelMode,
      routes: [],
      error: 'NETWORK_ERROR',
      message: 'Failed to contact Google Routes API.',
    };
  }
}
