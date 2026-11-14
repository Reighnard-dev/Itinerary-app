export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteLocation {
  lat?: number;
  lng?: number;
  address?: string;
  name?: string;
}

export type TravelMode = 'WALK' | 'DRIVE' | 'TRANSIT';

export interface TransitVehicle {
  name?: string;
  type: string;
  iconUri?: string;
}

export interface TransitDetails {
  lineName: string;
  lineShortName?: string;
  lineColor?: string;
  lineTextColor?: string;
  vehicleType: string;
  vehicleName?: string;
  departureStop: string;
  departureTime?: string;
  arrivalStop: string;
  arrivalTime?: string;
  stopCount?: number;
  headsign?: string;
  agencyName?: string;
  isLive?: boolean;
}

export interface RouteStep {
  id: string;
  travelMode: TravelMode;
  instruction: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  transitDetails?: TransitDetails;
}

export interface RouteOption {
  id: string;
  summary: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  encodedPolyline?: string;
  path: LatLng[];
  steps: RouteStep[];
  transfersCount: number;
  walkingDurationSeconds?: number;
  transitFare?: {
    currencyCode: string;
    amount: string;
  };
  isRecommended?: boolean;
  routeLabels?: string[];
}

export interface RouteResponse {
  ok: boolean;
  provider: 'google-routes-api' | 'roam-preview';
  hasApiKey: boolean;
  travelMode: TravelMode;
  routes: RouteOption[];
  transitUnavailable?: boolean;
  message?: string;
  error?: string;
}

export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: Math.round((lat / 1e5) * 1e6) / 1e6,
      lng: Math.round((lng / 1e5) * 1e6) / 1e6,
    });
  }
  return points;
}

export function encodePolyline(points: LatLng[]): string {
  if (!points.length) return '';
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    const dLat = lat - prevLat;
    const dLng = lng - prevLng;
    prevLat = lat;
    prevLng = lng;

    result += encodeNumber(dLat) + encodeNumber(dLng);
  }
  return result;
}

function encodeNumber(num: number): string {
  let sgnNum = num < 0 ? ~(num << 1) : num << 1;
  let encoded = '';
  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }
  encoded += String.fromCharCode(sgnNum + 63);
  return encoded;
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000; // meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '< 1 min';
  }
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) {
    return `${totalMins} min${totalMins > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (mins === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr ${mins} min${mins > 1 ? 's' : ''}`;
}

export function formatTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}
