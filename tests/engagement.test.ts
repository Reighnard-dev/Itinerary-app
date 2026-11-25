import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { places as handpicked } from '../shared/catalog';
import type { Place, Stop, Trip } from '../shared/types';
import { tripSchema } from '../server/validation';
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
  readShareTokenFromUrl,
  sortDayStopsByTime,
  timePeriodLabel,
} from '../src/engagement';

const kyotoPlaces = handpicked.filter(p => p.country === 'Japan' && p.city === 'Kyoto');

const mockGuidePlace: Place = {
  id: 'guide-jp-0123456789abcdef0123',
  name: 'Gion Tea House Lane',
  country: 'Japan',
  city: 'Kyoto',
  category: 'Culture',
  kind: 'local',
  description: 'Historic wooden machiya lane in eastern Kyoto.',
  image: '/images/photo-unavailable.svg',
  lat: 35.0037,
  lng: 135.775,
  rating: 4.7,
  duration: '1–2 hours',
  price: 'Free to walk',
  bestTime: 'Late afternoon',
  transit: 'Keihan Line to Gion-Shijo Station.',
  driving: 'Use central public parking.',
  source: {
    name: 'Wikivoyage contributors',
    url: 'https://en.wikivoyage.org/wiki/Kyoto',
    retrievedAt: '2026-10-01T00:00:00.000Z',
    license: 'CC BY-SA 4.0',
  },
};

const mockHotel: Place = {
  id: 'guide-jp-aaaaaaaaaaaaaaaaaaaa',
  name: 'Example Kyoto Hotel',
  country: 'Japan',
  city: 'Kyoto',
  category: 'Hotels',
  kind: 'local',
  description: 'A sample hotel entry.',
  image: '/images/photo-unavailable.svg',
  lat: 35.0,
  lng: 135.76,
  rating: 4.5,
  duration: 'Overnight',
  price: 'Varies',
  bestTime: 'Check-in',
  transit: 'Near Kyoto Station.',
  driving: 'Valet available.',
};

test('curateSuggestedStops builds balanced, non-hotel, deduplicated stops that pass tripSchema', () => {
  const existingStop: Stop = {
    id: randomUUID(),
    placeId: kyotoPlaces[0].id,
    day: 2,
    time: '',
    notes: '',
    place: kyotoPlaces[0],
  };

  const suggested = curateSuggestedStops({
    candidates: [mockHotel, ...kyotoPlaces, ...kyotoPlaces],
    existingStops: [existingStop],
    day: 1,
    maxStops: 4,
  });

  assert.equal(suggested.length, 4);
  assert.ok(suggested.every(s => s.place?.category !== 'Hotels'));
  assert.ok(suggested.every(s => s.placeId !== kyotoPlaces[0].id));
  assert.equal(new Set(suggested.map(s => s.placeId)).size, 4);
  assert.ok(suggested.some(s => s.place?.category === 'Food & drink' || s.place?.category === 'Restaurants'));
  assert.ok(suggested.every(s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) && s.notes.length > 0));

  const trip: Trip = {
    id: randomUUID(),
    title: 'Curated Kyoto',
    country: 'Japan',
    city: 'Kyoto',
    days: 3,
    startDate: '',
    stops: [existingStop, ...suggested],
    updatedAt: new Date().toISOString(),
  };

  const validation = tripSchema.safeParse(trip);
  assert.equal(validation.success, true, validation.success ? '' : validation.error.issues[0]?.message);
});

test('curateFullTripStops fills empty days up to maxDays without reusing places', () => {
  const day1Existing: Stop = {
    id: randomUUID(),
    placeId: kyotoPlaces[0].id,
    day: 1,
    time: '09:00',
    notes: 'Already planned',
    place: kyotoPlaces[0],
  };

  const baseTrip: Trip = {
    id: randomUUID(),
    title: 'Kyoto Stay',
    country: 'Japan',
    city: 'Kyoto',
    days: 4,
    startDate: '',
    stops: [day1Existing],
    updatedAt: new Date().toISOString(),
  };

  const { stops, addedCount, daysFilled } = curateFullTripStops({
    candidates: [mockGuidePlace, ...kyotoPlaces],
    trip: baseTrip,
    maxDays: 5,
  });

  assert.equal(daysFilled >= 2, true);
  assert.equal(addedCount > 0, true);
  assert.equal(stops.filter(s => s.day === 1).length, 1);
  assert.equal(new Set(stops.map(s => s.placeId)).size, stops.length);
});

test('encodeSharedTrip, decodeSharedTrip, and cloneSharedTrip round-trip handpicked and guide places', async () => {
  const trip: Trip = {
    id: randomUUID(),
    title: 'Shared Kyoto Notes',
    country: 'Japan',
    city: 'Kyoto',
    days: 2,
    startDate: '2026-11-10',
    stops: [
      {
        id: randomUUID(),
        placeId: kyotoPlaces[0].id,
        day: 1,
        time: '09:00',
        notes: 'Arrive early for photos',
        place: kyotoPlaces[0],
      },
      {
        id: randomUUID(),
        placeId: mockGuidePlace.id,
        day: 2,
        time: '15:30',
        notes: 'Evening stroll',
        place: mockGuidePlace,
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  const token = await encodeSharedTrip(trip, 'Alex');
  assert.ok(token.startsWith('z1.') || token.startsWith('j1.'));

  const decoded = await decodeSharedTrip(token);
  assert.ok(decoded);
  assert.equal(decoded.title, 'Shared Kyoto Notes');
  assert.equal(decoded.sharedBy, 'Alex');
  assert.equal(decoded.stops.length, 2);
  assert.equal(decoded.stops[0].place?.name, kyotoPlaces[0].name);
  assert.equal(decoded.stops[1].place?.name, mockGuidePlace.name);

  const cloned = cloneSharedTrip(decoded);
  assert.notEqual(cloned.id, trip.id);
  assert.notEqual(cloned.stops[0].id, trip.stops[0].id);
  assert.equal(cloned.stops[1].notes, 'Evening stroll');

  const validation = tripSchema.safeParse(cloned);
  assert.equal(validation.success, true, validation.success ? '' : validation.error.issues[0]?.message);

  assert.equal(await decodeSharedTrip('not-a-valid-token'), null);
  assert.equal(await decodeSharedTrip('z1.!!!invalid!!!'), null);
  assert.equal(await decodeSharedTrip('j1.' + Buffer.from('{"v":1,"t":"x","co":"Japan","ci":"Kyoto","d":0,"sd":"","s":[]}').toString('base64url')), null);
});

test('buildShareUrl and readShareTokenFromUrl handle query and hash tokens', () => {
  const shortUrl = buildShareUrl('https://roam.example/?share=old#share=old', 'z1.abc');
  assert.equal(shortUrl, 'https://roam.example/?share=z1.abc');
  const parsedShort = new URL(shortUrl);
  assert.equal(readShareTokenFromUrl(parsedShort), 'z1.abc');

  const longToken = 'z1.' + 'a'.repeat(3600);
  const longUrl = buildShareUrl('https://roam.example/', longToken);
  assert.ok(longUrl.startsWith('https://roam.example/#share='));
  const parsedLong = new URL(longUrl);
  assert.equal(readShareTokenFromUrl(parsedLong), longToken);
});

test('sortDayStopsByTime sorts only targetDay chronologically with untimed last', () => {
  const stops: Stop[] = [
    { id: '1', placeId: 'p1', day: 1, time: '', notes: '' },
    { id: '2', placeId: 'p2', day: 1, time: '15:30', notes: '' },
    { id: '3', placeId: 'p3', day: 2, time: '18:30', notes: '' },
    { id: '4', placeId: 'p4', day: 1, time: '09:00', notes: '' },
    { id: '5', placeId: 'p5', day: 2, time: '08:00', notes: '' },
  ];

  const sorted = sortDayStopsByTime(stops, 1);
  assert.deepEqual(
    sorted.filter(s => s.day === 1).map(s => s.id),
    ['4', '2', '1'],
  );
  assert.deepEqual(
    sorted.filter(s => s.day === 2).map(s => s.id),
    ['3', '5'],
  );
});

test('formatVisitTime, timePeriodLabel, appendNoteStarter, and isMeaningfulGuestDraft behave as expected', () => {
  assert.equal(formatVisitTime('09:00'), '9:00 AM');
  assert.equal(formatVisitTime('12:30'), '12:30 PM');
  assert.equal(formatVisitTime('15:30'), '3:30 PM');
  assert.equal(formatVisitTime('00:05'), '12:05 AM');
  assert.equal(formatVisitTime(''), '');

  assert.equal(timePeriodLabel('09:00'), 'Morning');
  assert.equal(timePeriodLabel('12:30'), 'Midday');
  assert.equal(timePeriodLabel('15:30'), 'Afternoon');
  assert.equal(timePeriodLabel('18:30'), 'Evening');
  assert.equal(timePeriodLabel('03:00'), 'Early');

  assert.equal(appendNoteStarter('', 'Book tickets ahead'), 'Book tickets ahead');
  assert.equal(
    appendNoteStarter('Arrive early', 'Book tickets ahead'),
    'Arrive early · Book tickets ahead',
  );
  assert.equal(
    appendNoteStarter('arrive early · Spot for photos', 'Arrive early'),
    'arrive early · Spot for photos',
  );

  const emptyDraft: Trip = {
    id: randomUUID(),
    title: 'A little escape to Kyoto',
    country: 'Japan',
    city: 'Kyoto',
    days: 5,
    startDate: '',
    stops: [],
    updatedAt: new Date().toISOString(),
  };
  assert.equal(isMeaningfulGuestDraft(emptyDraft), false);
  assert.equal(isMeaningfulGuestDraft({ ...emptyDraft, startDate: '2026-12-01' }), true);
  assert.equal(isMeaningfulGuestDraft({ ...emptyDraft, title: 'Springtime Kyoto' }), true);
  assert.equal(
    isMeaningfulGuestDraft({
      ...emptyDraft,
      stops: [{ id: randomUUID(), placeId: kyotoPlaces[0].id, day: 1, time: '', notes: '' }],
    }),
    true,
  );
});
