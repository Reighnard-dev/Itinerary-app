export function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const cloud = Boolean(supabaseUrl && supabaseAnonKey);

  return Response.json(
    {
      mode: cloud ? 'supabase' : 'local',
      supabaseUrl,
      supabaseAnonKey,
      supportEmail: process.env.SUPPORT_EMAIL || 'roamtravelsupport30@gmail.com',
      hasRoutesKey:
        process.env.ENABLE_PAID_ROUTES === 'true' &&
        Boolean(process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}
