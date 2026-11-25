import { z } from 'zod';
import { computePreviewRoute, requestGoogleRoutes } from '../server/routes-service.js';

const routeLocation = z
  .object({
    lat: z.number().finite().min(-90).max(90).optional(),
    lng: z.number().finite().min(-180).max(180).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    address: z.string().trim().min(1).max(300).optional(),
  })
  .refine(
    (v) =>
      (v.lat !== undefined && v.lng !== undefined) ||
      (v.lat === undefined && v.lng === undefined && Boolean(v.name || v.address))
  );

const routeInput = z.object({
  origin: routeLocation,
  destination: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    name: z.string().max(200).optional(),
  }),
  travelMode: z.enum(['TRANSIT', 'DRIVE', 'WALK']),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = routeInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Choose a valid origin, destination, and travel mode.' },
      { status: 400 }
    );
  }

  const { origin, destination, travelMode } = parsed.data;
  const apiKey =
    process.env.ENABLE_PAID_ROUTES === 'true'
      ? process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
      : '';

  if (apiKey) {
    const result = await requestGoogleRoutes(origin || {}, destination, travelMode, apiKey);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }

  const preview = computePreviewRoute(origin || {}, destination, travelMode);
  return Response.json(preview, { headers: { 'Cache-Control': 'no-store' } });
}
