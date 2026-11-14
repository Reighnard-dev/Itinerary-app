import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodePolyline,
  encodePolyline,
  formatDistance,
  formatDuration,
  formatTime,
  haversineDistance,
} from '../shared/routes.js';
import { computePreviewRoute, requestGoogleRoutes } from '../server/routes-service.js';

test('haversineDistance correctly calculates spherical distance between two points', () => {
  // Kyoto Station (34.9858, 135.7588) to Fushimi Inari (34.9671, 135.7727) ~2.4km
  const kyotoStation = { lat: 34.9858, lng: 135.7588 };
  const fushimiInari = { lat: 34.9671, lng: 135.7727 };
  const dist = haversineDistance(kyotoStation, fushimiInari);
  assert.ok(dist > 2000 && dist < 3000, `Expected distance around 2.4km, got ${dist}`);
});

test('polyline encode and decode round-trip preserves coordinates', () => {
  const points = [
    { lat: 35.0116, lng: 135.7681 },
    { lat: 35.0125, lng: 135.771 },
    { lat: 35.015, lng: 135.775 },
  ];
  const encoded = encodePolyline(points);
  assert.ok(typeof encoded === 'string' && encoded.length > 0);
  const decoded = decodePolyline(encoded);
  assert.equal(decoded.length, points.length);
  for (let i = 0; i < points.length; i++) {
    assert.ok(Math.abs(decoded[i].lat - points[i].lat) < 0.0001);
    assert.ok(Math.abs(decoded[i].lng - points[i].lng) < 0.0001);
  }
});

test('formatting utilities produce clear human-readable strings', () => {
  assert.equal(formatDistance(450), '450 m');
  assert.equal(formatDistance(1800), '1.8 km');
  assert.equal(formatDistance(14200), '14 km');

  assert.equal(formatDuration(45), '< 1 min');
  assert.equal(formatDuration(300), '5 mins');
  assert.equal(formatDuration(3600), '1 hr');
  assert.equal(formatDuration(5400), '1 hr 30 mins');

  assert.equal(formatTime(''), '');
  assert.ok(formatTime('2026-11-15T09:30:00Z').length > 0);
});

test('computePreviewRoute calculates walking and driving preview routes without crashing', () => {
  const origin = { lat: 34.9858, lng: 135.7588, name: 'Kyoto Station' };
  const destination = { lat: 34.9671, lng: 135.7727, name: 'Fushimi Inari Shrine' };

  // Walking
  const walkRoute = computePreviewRoute(origin, destination, 'WALK');
  assert.equal(walkRoute.ok, true);
  assert.equal(walkRoute.hasApiKey, false);
  assert.equal(walkRoute.provider, 'roam-preview');
  assert.equal(walkRoute.routes.length, 1);
  assert.ok(walkRoute.routes[0].distanceMeters > 0);
  assert.ok(walkRoute.routes[0].durationSeconds > 0);
  assert.ok(walkRoute.routes[0].steps.length >= 3);
  assert.equal(walkRoute.routes[0].steps[0].travelMode, 'WALK');

  // Driving
  const driveRoute = computePreviewRoute(origin, destination, 'DRIVE');
  assert.equal(driveRoute.ok, true);
  assert.equal(driveRoute.routes[0].steps[0].travelMode, 'DRIVE');
  assert.ok(driveRoute.routes[0].durationSeconds < walkRoute.routes[0].durationSeconds);
});

test('computePreviewRoute for public transit strictly refuses to fabricate transit schedules', () => {
  const origin = { lat: 34.9858, lng: 135.7588, name: 'Kyoto Station' };
  const destination = { lat: 34.9671, lng: 135.7727, name: 'Fushimi Inari Shrine' };

  const transitRoute = computePreviewRoute(origin, destination, 'TRANSIT');
  assert.equal(transitRoute.ok, true);
  assert.equal(transitRoute.transitUnavailable, true);
  assert.equal(transitRoute.routes.length, 0);
  assert.equal(transitRoute.message, 'Live transit details are unavailable for this location.');
});

test('requestGoogleRoutes handles transit details when mock Google response is provided', async () => {
  // Override global fetch temporarily to simulate Google Routes API transit response
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          routes: [
            {
              duration: '900s',
              distanceMeters: 2800,
              description: 'Nara Line',
              polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
              legs: [
                {
                  steps: [
                    {
                      travelMode: 'WALK',
                      navigationInstruction: { instructions: 'Walk to Kyoto Station platform' },
                      distanceMeters: 150,
                      staticDuration: '120s',
                    },
                    {
                      travelMode: 'TRANSIT',
                      staticDuration: '600s',
                      distanceMeters: 2500,
                      transitDetails: {
                        stopDetails: {
                          departureStop: { name: 'Kyoto Station' },
                          departureTime: '2026-11-15T09:30:00Z',
                          arrivalStop: { name: 'Inari Station' },
                          arrivalTime: '2026-11-15T09:40:00Z',
                        },
                        transitLine: {
                          name: 'JR Nara Line',
                          nameShort: 'D',
                          color: '#8b4513',
                          vehicle: { type: 'TRAIN', name: { text: 'Train' } },
                        },
                        stopCount: 2,
                        headsign: 'Nara',
                      },
                    },
                    {
                      travelMode: 'WALK',
                      navigationInstruction: { instructions: 'Walk to Fushimi Inari entrance' },
                      distanceMeters: 150,
                      staticDuration: '180s',
                    },
                  ],
                },
              ],
              travelAdvisory: {
                transitFare: { currencyCode: 'JPY', units: '150' },
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const origin = { lat: 34.9858, lng: 135.7588, name: 'Kyoto Station' };
    const destination = { lat: 34.9671, lng: 135.7727, name: 'Fushimi Inari Shrine' };
    const res = await requestGoogleRoutes(origin, destination, 'TRANSIT', 'dummy-key');

    assert.equal(res.ok, true);
    assert.equal(res.routes.length, 1);
    const rt = res.routes[0];
    assert.equal(rt.durationSeconds, 900);
    assert.equal(rt.distanceMeters, 2800);
    assert.equal(rt.transfersCount, 0); // 1 transit step = 0 transfers
    assert.equal(rt.transitFare?.amount, '150');
    assert.equal(rt.transitFare?.currencyCode, 'JPY');

    const transitStep = rt.steps.find((s) => s.travelMode === 'TRANSIT');
    assert.ok(transitStep);
    assert.equal(transitStep?.transitDetails?.lineName, 'JR Nara Line');
    assert.equal(transitStep?.transitDetails?.departureStop, 'Kyoto Station');
    assert.equal(transitStep?.transitDetails?.arrivalStop, 'Inari Station');
    assert.equal(transitStep?.transitDetails?.stopCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestGoogleRoutes handles unsupported transit or zero results cleanly', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ routes: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const origin = { lat: 34.9858, lng: 135.7588 };
    const destination = { lat: 34.9671, lng: 135.7727 };
    const res = await requestGoogleRoutes(origin, destination, 'TRANSIT', 'dummy-key');

    assert.equal(res.ok, true);
    assert.equal(res.transitUnavailable, true);
    assert.equal(res.routes.length, 0);
    assert.equal(res.message, 'Live transit details are unavailable for this location.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
