import { test, expect } from '@playwright/test';
import type { Trip } from '../../shared/types';

test('cloud auth, autosave, reload, stop edits and deletion use Supabase', async ({ page }) => {
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'cloud-test@example.com', user_metadata: { name: 'Cloud Traveler' }, app_metadata: {}, created_at: new Date().toISOString() };
 const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'test'].join('.');
 const session = { access_token: jwt, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user };
 const trips = new Map<string, Trip>();
 let saves = 0, failSave = false;
 const recoveryRequests: { email: string; redirect: string | null }[] = [];
 await page.route('https://*.supabase.co/**', async route => {
  const url = new URL(route.request().url()), method = route.request().method();
  const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  if (url.pathname === '/auth/v1/token' || url.pathname === '/auth/v1/signup') return json(session);
  if (url.pathname === '/auth/v1/user') return json(user);
  if (url.pathname === '/auth/v1/logout') return json({});
  if (url.pathname === '/auth/v1/recover') {
   recoveryRequests.push({ email: route.request().postDataJSON().email, redirect: url.searchParams.get('redirect_to') });
   return json({});
  }
  if (url.pathname === '/rest/v1/rpc/save_itinerary') {
   if (failSave) return json({ message: 'Simulated save failure', code: '42501' }, 403);
   const { trip } = route.request().postDataJSON();
   trips.set(trip.id, trip); saves++;
   return route.fulfill({ status: 204 });
  }
  if (url.pathname === '/rest/v1/trips') return json([]);
  if (url.pathname === '/rest/v1/itineraries') {
   const id = url.searchParams.get('id')?.replace('eq.', '');
   if (method === 'DELETE') { trips.delete(id!); return json({ id }); }
   if (id) return json(trips.has(id) ? { id } : null);
   return json([...trips.values()].map(trip => ({ id: trip.id, user_id: user.id, title: trip.title, country: trip.country,
    city: trip.city, days: trip.days, start_date: trip.startDate || null, created_at: trip.updatedAt, updated_at: trip.updatedAt })));
  }
  if (url.pathname === '/rest/v1/itinerary_items') return json([...trips.values()].flatMap(trip => trip.stops.map((stop, position) => ({
   id: stop.id, itinerary_id: trip.id, place_id: stop.placeId, day: stop.day, time: stop.time, notes: stop.notes,
   position, place: stop.place || null, created_at: trip.updatedAt, updated_at: trip.updatedAt,
  }))));
  throw new Error('Unexpected Supabase request: ' + method + ' ' + url.pathname);
 });
 await page.goto('/');
 await page.getByRole('button', { name: 'Add Fushimi Inari Shrine to itinerary' }).click();
 await page.getByRole('button', { name: 'View my itinerary' }).click();
 await page.getByLabel('Trip title', { exact: true }).fill('Cloud-backed Kyoto');
 await page.getByRole('button', { name: 'Save to account', exact: true }).click();
 const modal = page.getByRole('dialog');
 await modal.getByLabel('Your name').fill('Cloud Traveler');
 await modal.getByLabel('Email address').fill(user.email);
 await modal.getByLabel('Password', { exact: true }).fill('CloudAdventure123!');
 await modal.getByRole('button', { name: 'Create my account' }).click();
 await expect(modal).not.toBeVisible();
 await page.getByRole('link', { name: 'Account settings' }).click();
 await expect(page.getByRole('region', { name: 'Profile' })).toContainText(user.email);
 await expect(page.getByText('Delete this local account', { exact: true })).toHaveCount(0);
 await page.getByRole('button', { name: 'Send password reset link' }).click();
 await expect(page.getByText('Check your inbox for your reset link.', { exact: false })).toBeVisible();
 expect(recoveryRequests).toEqual([{ email: user.email, redirect: 'http://127.0.0.1:3102/?recovery=1' }]);
 await page.goBack();
 await page.getByRole('button', { name: 'View my itinerary' }).click();
 await expect(page.locator('.save-status')).toContainText('Saved to your account');
 expect([...trips.values()][0].title).toBe('Cloud-backed Kyoto');
 await page.getByLabel('Notes for Fushimi Inari Shrine').fill('A note saved in Supabase');
 await page.getByLabel('Visit time for Fushimi Inari Shrine').fill('09:30');
 await expect.poll(() => [...trips.values()][0].stops[0].time).toBe('09:30');
 // Clear device drafts: restore must come from cloud rows, not browser trip storage.
 await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('roam.')) localStorage.removeItem(key); });
 await page.reload();
 await page.getByRole('button', { name: 'My itineraries', exact: true }).click();
 await page.getByRole('button', { name: 'Open itinerary' }).first().click();
 await expect(page.getByLabel('Trip title', { exact: true })).toHaveValue('Cloud-backed Kyoto');
 await expect(page.getByLabel('Notes for Fushimi Inari Shrine')).toHaveValue('A note saved in Supabase');
 await expect(page.getByLabel('Visit time for Fushimi Inari Shrine')).toHaveValue('09:30');
 failSave = true;
 await page.getByLabel('Trip title', { exact: true }).fill('Retry this cloud edit');
 await expect(page.locator('.save-status')).toContainText('Not saved');
 failSave = false;
 await page.getByRole('button', { name: 'Save to account', exact: true }).click();
 await expect(page.locator('.save-status')).toContainText('Saved to your account');
 await page.getByRole('button', { name: 'Remove Fushimi Inari Shrine', exact: true }).click();
 await expect.poll(() => [...trips.values()][0].stops.length).toBe(0);
 await page.getByRole('button', { name: 'Sign out' }).click();
 await page.getByRole('button', { name: 'Log in', exact: true }).click();
 await page.getByRole('dialog').getByLabel('Email address').fill(user.email);
 await page.getByRole('dialog').getByLabel('Password', { exact: true }).fill('CloudAdventure123!');
 await page.getByRole('dialog').getByRole('button', { name: 'Let me in', exact: true }).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button', { name: 'My itineraries', exact: true }).click();
 await page.getByRole('button', { name: 'Delete Retry this cloud edit' }).first().click();
 await page.getByRole('dialog').getByRole('button', { name: /Delete/ }).click();
 await expect.poll(() => trips.size).toBe(0);
 expect(saves).toBeGreaterThan(2);
 expect(errors).toEqual([]);
});



test('cloud recovery sends the right redirect and accepts a new password from a recovery link',async({page})=>{
 const user={id:'22222222-2222-4222-8222-222222222222',aud:'authenticated',role:'authenticated',email:'recover@example.com',user_metadata:{name:'Recovery'},app_metadata:{},created_at:new Date().toISOString()};
 const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
 let recover:any=null,updated:any=null;
 await page.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
  if(url.pathname.endsWith('/recover')){recover={...req.postDataJSON(),redirect:url.searchParams.get('redirect_to')};return route.fulfill({json:{}});}
  if(url.pathname.endsWith('/user')){if(req.method()==='PUT')updated=req.postDataJSON();return route.fulfill({json:user});}
  return route.fulfill({json:url.pathname.includes('/rest/')?[]:{}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Log in',exact:true}).click();await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await page.getByLabel('Recovery email').fill(user.email);await page.getByRole('button',{name:'Send recovery link',exact:true}).click();
 await expect(page.getByText('If an account exists for this email,',{exact:false})).toBeVisible();
 expect(recover.email).toBe(user.email);expect(recover.redirect).toBe('http://127.0.0.1:3102/?recovery=1');
 await page.goto('/?recovery=1#access_token='+token+'&refresh_token=recovery-token&expires_in=3600&token_type=bearer&type=recovery');
 await expect(page.getByRole('heading',{name:'Choose a new password'})).toBeVisible();
 await page.getByLabel('New password',{exact:true}).fill('NewVacation123!');await page.getByRole('button',{name:'Update password',exact:true}).click();
 await expect(page.getByText('Password updated. Sign in with your new password.')).toBeVisible();expect(updated.password).toBe('NewVacation123!');
});
