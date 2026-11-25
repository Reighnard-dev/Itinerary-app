import iconBase64 from '../public/icons/icon-192.png';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin =
    requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1'
      ? 'https://roam-itinerary.vercel.app'
      : requestUrl.origin;
  const appUrl = `${origin}/?source=pwa`;

  const cleanIconBase64 = String(iconBase64).replace(/\s+/g, '');

  const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>Icon</key>
      <data>${cleanIconBase64}</data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>Roam</string>
      <key>PayloadDescription</key>
      <string>Installs the Roam Travel Itinerary Planner app shortcut on your Home Screen.</string>
      <key>PayloadDisplayName</key>
      <string>Roam</string>
      <key>PayloadIdentifier</key>
      <string>com.roam.itinerary.webclip</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>7E6A9C3B-4A12-4F55-9D2B-3F88E1A7C201</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${escapeXml(appUrl)}</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Install Roam — Travel Itinerary Planner directly onto your iPhone or iPad Home Screen.</string>
  <key>PayloadDisplayName</key>
  <string>Roam Travel App</string>
  <key>PayloadIdentifier</key>
  <string>com.roam.itinerary.profile</string>
  <key>PayloadOrganization</key>
  <string>Roam</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>9B2D4E10-7C88-4A91-B6C4-12F0E8D4A902</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;

  return new Response(mobileconfig, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Roam.mobileconfig"',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
