export function GET() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const cloud = Boolean(url && key);

  return Response.json(
    {
      status: 'ok',
      mode: cloud ? 'supabase' : 'local',
      platform: 'vercel',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}
