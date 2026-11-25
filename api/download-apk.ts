const DEFAULT_UPSTREAM_APK_URL =
  'https://github.com/Reighnard-dev/Itinerary-app/releases/latest/download/roam-android.apk';

export async function GET() {
  const upstreamUrl = (process.env.ROAM_APK_UPSTREAM_URL || DEFAULT_UPSTREAM_APK_URL).trim();

  try {
    const upstream = await fetch(upstreamUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });

    if (!upstream.ok) {
      return Response.redirect(upstreamUrl, 302);
    }

    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="roam-android.apk"',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.redirect(upstreamUrl, 302);
  }
}
