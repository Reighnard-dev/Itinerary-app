import { places as handpicked } from '../shared/catalog';
import type { Place, Stop, Trip } from '../shared/types';

export const TIME_SLOT_PRESETS = [
  { label: 'Morning', time: '09:00' },
  { label: 'Midday', time: '12:30' },
  { label: 'Afternoon', time: '15:30' },
  { label: 'Evening', time: '18:30' },
] as const;

export const NOTE_STARTERS = [
  'Book tickets ahead',
  'Check opening hours',
  'Arrive early',
  'Spot for photos',
] as const;

const VALID_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SHARE_TOKEN_LENGTH = 32_000;
const MAX_DECOMPRESSED_BYTES = 150_000;
const MAX_QUERY_URL_LENGTH = 3_500;

const handpickedById = new Map(handpicked.map(place => [place.id, place]));

export function formatVisitTime(time: string): string {
  if (!VALID_TIME_RE.test(time)) return '';
  const [hourStr, minuteStr] = time.split(':');
  const hour24 = Number(hourStr);
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minuteStr} ${suffix}`;
}

export function timePeriodLabel(time: string): string {
  if (!VALID_TIME_RE.test(time)) return '';
  const hour = Number(time.slice(0, 2));
  if (hour <= 4) return 'Early';
  if (hour <= 11) return 'Morning';
  if (hour <= 13) return 'Midday';
  if (hour <= 16) return 'Afternoon';
  return 'Evening';
}

export function sortDayStopsByTime(stops: Stop[], targetDay: number): Stop[] {
  const dayIndices: number[] = [];
  const dayStops: Stop[] = [];
  stops.forEach((stop, index) => {
    if (stop.day === targetDay) {
      dayIndices.push(index);
      dayStops.push(stop);
    }
  });
  if (dayStops.length < 2) return stops;

  const timed = dayStops
    .map((stop, index) => ({ stop, index }))
    .filter(({ stop }) => VALID_TIME_RE.test(stop.time))
    .sort((a, b) => a.stop.time.localeCompare(b.stop.time) || a.index - b.index)
    .map(({ stop }) => stop);

  const untimed = dayStops.filter(stop => !VALID_TIME_RE.test(stop.time));
  const sortedDayStops = [...timed, ...untimed];

  const next = [...stops];
  dayIndices.forEach((slotIndex, i) => {
    next[slotIndex] = sortedDayStops[i];
  });
  return next;
}

export function appendNoteStarter(current: string, starter: string): string {
  const trimmedStarter = starter.trim();
  if (!trimmedStarter) return current;
  if (current.toLocaleLowerCase().includes(trimmedStarter.toLocaleLowerCase())) {
    return current;
  }
  const trimmedCurrent = current.trim();
  const combined = trimmedCurrent ? `${trimmedCurrent} · ${trimmedStarter}` : trimmedStarter;
  return combined.slice(0, 1000);
}

export function isMeaningfulGuestDraft(trip: Trip): boolean {
  if (trip.stops.length > 0 || Boolean(trip.startDate)) return true;
  const trimmedTitle = trip.title.trim();
  return Boolean(trimmedTitle) && trimmedTitle !== `A little escape to ${trip.city}`;
}

function isFoodPlace(place: Place): boolean {
  return place.category === 'Food & drink' || place.category === 'Restaurants';
}

function isOutdoorOrHidden(place: Place): boolean {
  return (
    place.kind === 'hidden' ||
    place.category === 'Parks & gardens' ||
    place.category === 'Nature' ||
    place.category === 'Activities' ||
    place.category === 'Adventure'
  );
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function noteForSlotTime(time: string): string {
  switch (time) {
    case '09:00':
      return 'Morning highlight — check opening hours.';
    case '12:30':
      return 'Midday break for local flavors.';
    case '15:30':
      return 'Afternoon discovery — leave room to wander.';
    case '18:30':
      return 'Golden hour & evening atmosphere.';
    default:
      return 'Afternoon discovery — leave room to wander.';
  }
}

export function curateSuggestedStops({
  candidates,
  existingStops,
  day,
  maxStops = 4,
}: {
  candidates: Place[];
  existingStops: Stop[];
  day: number;
  maxStops?: number;
}): Stop[] {
  const existingPlaceIds = new Set(existingStops.map(stop => stop.placeId));
  const uniquePool: Place[] = [];
  const seenIds = new Set<string>();

  for (const place of candidates) {
    if (seenIds.has(place.id) || existingPlaceIds.has(place.id) || place.category === 'Hotels') {
      continue;
    }
    seenIds.add(place.id);
    uniquePool.push(place);
  }
  if (!uniquePool.length) return [];

  const existingDayCount = existingStops.filter(stop => stop.day === day).length;
  const needed = Math.min(maxStops, Math.max(1, 4 - existingDayCount), uniquePool.length);

  const byScore = (a: Place, b: Place) => {
    const aPhoto = a.photo ? 1 : 0;
    const bPhoto = b.photo ? 1 : 0;
    return (b.rating ?? 0) - (a.rating ?? 0) || bPhoto - aPhoto;
  };

  const anchor =
    uniquePool.filter(p => p.kind === 'iconic' && !isFoodPlace(p)).sort(byScore)[0] ||
    uniquePool.filter(p => !isFoodPlace(p)).sort(byScore)[0] ||
    uniquePool[0];

  const picked: Place[] = [anchor];
  const pickedIds = new Set<string>([anchor.id]);

  const proximityRank = (p: Place) => haversineKm(anchor, p) - (p.rating ?? 4.2) * 0.6;

  if (picked.length < needed) {
    const foodSpot = uniquePool
      .filter(p => !pickedIds.has(p.id) && isFoodPlace(p))
      .sort((a, b) => proximityRank(a) - proximityRank(b))[0];
    if (foodSpot) {
      picked.push(foodSpot);
      pickedIds.add(foodSpot.id);
    }
  }

  if (picked.length < needed) {
    const discoverySpot = uniquePool
      .filter(p => !pickedIds.has(p.id) && isOutdoorOrHidden(p) && !isFoodPlace(p))
      .sort((a, b) => {
        const aHidden = a.kind === 'hidden' ? -1.5 : 0;
        const bHidden = b.kind === 'hidden' ? -1.5 : 0;
        return proximityRank(a) + aHidden - (proximityRank(b) + bHidden);
      })[0];
    if (discoverySpot) {
      picked.push(discoverySpot);
      pickedIds.add(discoverySpot.id);
    }
  }

  while (picked.length < needed) {
    const hasFood = picked.some(isFoodPlace);
    const nextSpot = uniquePool
      .filter(p => !pickedIds.has(p.id))
      .sort((a, b) => {
        const aFoodPenalty = hasFood && isFoodPlace(a) ? 10 : 0;
        const bFoodPenalty = hasFood && isFoodPlace(b) ? 10 : 0;
        return proximityRank(a) + aFoodPenalty - (proximityRank(b) + bFoodPenalty);
      })[0];
    if (!nextSpot) break;
    picked.push(nextSpot);
    pickedIds.add(nextSpot.id);
  }

  const foodPicked = picked.filter(isFoodPlace);
  const sightseeingPicked = picked.filter(p => !isFoodPlace(p));

  const orderedSightseeing: Place[] = [];
  if (sightseeingPicked.length) {
    const remaining = [...sightseeingPicked];
    const startIdx = remaining.findIndex(p => p.id === anchor.id);
    let current = remaining.splice(startIdx >= 0 ? startIdx : 0, 1)[0];
    orderedSightseeing.push(current);
    while (remaining.length) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = haversineKm(current, remaining[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      current = remaining.splice(nearestIdx, 1)[0];
      orderedSightseeing.push(current);
    }
  }

  const usedTimes = new Set(
    existingStops.filter(stop => stop.day === day && VALID_TIME_RE.test(stop.time)).map(stop => stop.time),
  );
  const availableSlots = TIME_SLOT_PRESETS.map(preset => preset.time).filter(time => !usedTimes.has(time));

  const slotItems: { place: Place; time: string }[] = [];
  const remainingSlots = [...availableSlots];

  if (orderedSightseeing.length && foodPicked.length) {
    const first = orderedSightseeing.shift()!;
    const firstSlot = remainingSlots.shift() ?? '';
    slotItems.push({ place: first, time: firstSlot });

    const preferredFoodSlot = remainingSlots.includes('12:30')
      ? '12:30'
      : remainingSlots.includes('18:30')
        ? '18:30'
        : remainingSlots[0] ?? '';
    if (preferredFoodSlot) {
      const idx = remainingSlots.indexOf(preferredFoodSlot);
      if (idx >= 0) remainingSlots.splice(idx, 1);
    }
    const food = foodPicked.shift()!;
    slotItems.push({ place: food, time: preferredFoodSlot });

    for (const spot of [...orderedSightseeing, ...foodPicked]) {
      slotItems.push({ place: spot, time: remainingSlots.shift() ?? '' });
    }
  } else {
    for (const spot of [...orderedSightseeing, ...foodPicked]) {
      slotItems.push({ place: spot, time: remainingSlots.shift() ?? '' });
    }
  }

  return slotItems.map(({ place, time }) => ({
    id: crypto.randomUUID(),
    placeId: place.id,
    day,
    time,
    notes: noteForSlotTime(time),
    place,
  }));
}

export function curateFullTripStops({
  candidates,
  trip,
  maxDays = 5,
}: {
  candidates: Place[];
  trip: Trip;
  maxDays?: number;
}): { stops: Stop[]; addedCount: number; daysFilled: number } {
  const limit = Math.min(trip.days, maxDays);
  let accumulatedStops = [...trip.stops];
  let addedCount = 0;
  let daysFilled = 0;

  for (let d = 1; d <= limit; d++) {
    if (accumulatedStops.some(stop => stop.day === d)) continue;
    const suggested = curateSuggestedStops({
      candidates,
      existingStops: accumulatedStops,
      day: d,
      maxStops: 4,
    });
    if (!suggested.length) break;
    accumulatedStops = [...accumulatedStops, ...suggested];
    addedCount += suggested.length;
    daysFilled++;
  }

  return { stops: accumulatedStops, addedCount, daysFilled };
}

export interface SharedTripData {
  title: string;
  country: string;
  city: string;
  days: number;
  startDate: string;
  sharedBy?: string;
  stops: Stop[];
}

interface WireStop {
  p: string;
  d: number;
  t?: string;
  n?: string;
}

interface WireTrip {
  v: 1;
  t: string;
  co: string;
  ci: string;
  d: number;
  sd: string;
  by?: string;
  s: WireStop[];
  pl?: Record<string, Place>;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function compressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new CompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    void writer.write(copy).then(() => writer.close(), () => undefined);
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const stream = new DecompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    void writer.write(copy).then(() => writer.close(), () => undefined);
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_DECOMPRESSED_BYTES) {
          void reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  } catch {
    return null;
  }
}

export async function encodeSharedTrip(trip: Trip, sharedBy?: string): Promise<string> {
  const customPlaces: Record<string, Place> = {};
  const wireStops: WireStop[] = trip.stops.slice(0, 100).map(stop => {
    if (stop.place && !handpickedById.has(stop.placeId)) {
      customPlaces[stop.placeId] = stop.place;
    }
    return {
      p: stop.placeId,
      d: stop.day,
      ...(stop.time ? { t: stop.time } : {}),
      ...(stop.notes ? { n: stop.notes.slice(0, 1000) } : {}),
    };
  });

  const payload: WireTrip = {
    v: 1,
    t: trip.title.trim().slice(0, 100) || `A little escape to ${trip.city}`,
    co: trip.country,
    ci: trip.city,
    d: Math.min(30, Math.max(1, Math.trunc(trip.days))),
    sd: VALID_DATE_RE.test(trip.startDate) ? trip.startDate : '',
    ...(sharedBy?.trim() ? { by: sharedBy.trim().slice(0, 80) } : {}),
    s: wireStops,
    ...(Object.keys(customPlaces).length ? { pl: customPlaces } : {}),
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await compressDeflateRaw(jsonBytes);
  if (compressed) {
    return `z1.${toBase64Url(compressed)}`;
  }
  return `j1.${toBase64Url(jsonBytes)}`;
}

function isValidPlaceSnapshot(value: unknown, expectedId: string): value is Place {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    p.id === expectedId &&
    typeof p.name === 'string' &&
    p.name.trim().length > 0 &&
    p.name.length <= 160 &&
    typeof p.country === 'string' &&
    p.country.length > 0 &&
    p.country.length <= 120 &&
    typeof p.city === 'string' &&
    p.city.length > 0 &&
    p.city.length <= 200 &&
    typeof p.category === 'string' &&
    (p.kind === 'iconic' || p.kind === 'hidden' || p.kind === 'local') &&
    typeof p.description === 'string' &&
    typeof p.image === 'string' &&
    typeof p.lat === 'number' &&
    Number.isFinite(p.lat) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lng) &&
    p.lng >= -180 &&
    p.lng <= 180 &&
    (p.rating === null || (typeof p.rating === 'number' && Number.isFinite(p.rating) && p.rating >= 0 && p.rating <= 5)) &&
    typeof p.duration === 'string' &&
    typeof p.price === 'string' &&
    typeof p.bestTime === 'string' &&
    typeof p.transit === 'string' &&
    typeof p.driving === 'string'
  );
}

export async function decodeSharedTrip(token: string): Promise<SharedTripData | null> {
  if (!token || typeof token !== 'string' || token.length > MAX_SHARE_TOKEN_LENGTH) {
    return null;
  }

  let jsonBytes: Uint8Array | null = null;
  if (token.startsWith('z1.')) {
    const raw = fromBase64Url(token.slice(3));
    if (!raw) return null;
    jsonBytes = await decompressDeflateRaw(raw);
  } else if (token.startsWith('j1.')) {
    const raw = fromBase64Url(token.slice(3));
    if (!raw || raw.byteLength > MAX_DECOMPRESSED_BYTES) return null;
    jsonBytes = raw;
  } else {
    return null;
  }

  if (!jsonBytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(jsonBytes));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const wire = parsed as Record<string, unknown>;
  if (wire.v !== 1) return null;
  if (typeof wire.t !== 'string' || wire.t.trim().length < 1 || wire.t.trim().length > 100) return null;
  if (typeof wire.co !== 'string' || wire.co.trim().length < 1 || wire.co.length > 120) return null;
  if (typeof wire.ci !== 'string' || wire.ci.trim().length < 1 || wire.ci.length > 200) return null;
  if (typeof wire.d !== 'number' || !Number.isInteger(wire.d) || wire.d < 1 || wire.d > 30) return null;
  if (typeof wire.sd !== 'string' || (wire.sd !== '' && !VALID_DATE_RE.test(wire.sd))) return null;
  if (wire.by !== undefined && (typeof wire.by !== 'string' || wire.by.length > 80)) return null;
  if (!Array.isArray(wire.s) || wire.s.length > 100) return null;

  const placeMap =
    wire.pl && typeof wire.pl === 'object' && !Array.isArray(wire.pl)
      ? (wire.pl as Record<string, unknown>)
      : {};

  const stops: Stop[] = [];
  for (const item of wire.s) {
    if (!item || typeof item !== 'object') return null;
    const rawStop = item as Record<string, unknown>;
    if (typeof rawStop.p !== 'string' || !rawStop.p || rawStop.p.length > 100) return null;
    if (
      typeof rawStop.d !== 'number' ||
      !Number.isInteger(rawStop.d) ||
      rawStop.d < 1 ||
      rawStop.d > wire.d
    ) {
      return null;
    }
    const time = rawStop.t === undefined ? '' : rawStop.t;
    if (typeof time !== 'string' || (time !== '' && !VALID_TIME_RE.test(time))) return null;
    const notes = rawStop.n === undefined ? '' : rawStop.n;
    if (typeof notes !== 'string' || notes.length > 1000) return null;

    const candidatePlace = placeMap[rawStop.p];
    const resolvedPlace = isValidPlaceSnapshot(candidatePlace, rawStop.p)
      ? candidatePlace
      : handpickedById.get(rawStop.p);

    stops.push({
      id: crypto.randomUUID(),
      placeId: rawStop.p,
      day: rawStop.d,
      time,
      notes,
      ...(resolvedPlace ? { place: resolvedPlace } : {}),
    });
  }

  return {
    title: wire.t.trim(),
    country: wire.co,
    city: wire.ci,
    days: wire.d,
    startDate: wire.sd,
    ...(typeof wire.by === 'string' && wire.by.trim() ? { sharedBy: wire.by.trim() } : {}),
    stops,
  };
}

export function buildShareUrl(baseHref: string, token: string): string {
  const parsed = new URL(baseHref);
  parsed.searchParams.delete('share');
  if (parsed.hash.startsWith('#share=')) {
    parsed.hash = '';
  }
  const cleanSearch = parsed.searchParams.toString();
  const basePath = `${parsed.origin}${parsed.pathname}${cleanSearch ? `?${cleanSearch}` : ''}`;
  const querySeparator = cleanSearch ? '&' : '?';
  const queryUrl = `${basePath}${querySeparator}share=${token}`;
  if (queryUrl.length <= MAX_QUERY_URL_LENGTH) {
    return queryUrl;
  }
  return `${basePath}#share=${token}`;
}

export function readShareTokenFromUrl(loc: { search: string; hash: string }): string | null {
  const fromSearch = new URLSearchParams(loc.search).get('share');
  if (fromSearch) return fromSearch;
  if (loc.hash.startsWith('#share=')) {
    try {
      return decodeURIComponent(loc.hash.slice(7));
    } catch {
      return loc.hash.slice(7);
    }
  }
  return null;
}

export function cloneSharedTrip(shared: SharedTripData, extraPlaces: Place[] = []): Trip {
  const extraById = new Map(extraPlaces.map(place => [place.id, place]));
  return {
    id: crypto.randomUUID(),
    title: shared.title,
    country: shared.country,
    city: shared.city,
    days: shared.days,
    startDate: shared.startDate,
    stops: shared.stops.map(stop => {
      const place = stop.place || handpickedById.get(stop.placeId) || extraById.get(stop.placeId);
      return {
        id: crypto.randomUUID(),
        placeId: stop.placeId,
        day: stop.day,
        time: stop.time,
        notes: stop.notes,
        ...(place ? { place } : {}),
      };
    }),
    updatedAt: new Date().toISOString(),
  };
}
