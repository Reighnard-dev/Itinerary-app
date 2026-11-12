import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('discover, sign up, organize, save, restore, and export an itinerary',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your next somewhere.'})).toBeVisible();
 await expect(page.locator('.place-card')).toHaveCount(24);
 await page.getByRole('button',{name:'Hidden gems',exact:true}).click();await expect(page.locator('.place-card')).toHaveCount(2);
 await page.getByRole('button',{name:'All places',exact:true}).click();
 await page.getByRole('button',{name:'Save Fushimi Inari Shrine',exact:true}).click();await expect(page.getByRole('button',{name:'Unsave Fushimi Inari Shrine'})).toBeVisible();
 await page.getByRole('button',{name:'Add Fushimi Inari Shrine to itinerary'}).click();
 await page.getByRole('button',{name:'Add Arashiyama Bamboo Grove to itinerary'}).click();
 await page.getByRole('button',{name:'View my itinerary'}).click();await expect(page.locator('.itinerary-stop')).toHaveCount(2);
 await page.getByRole('button',{name:'Move Arashiyama Bamboo Grove up'}).click();await expect(page.locator('.itinerary-stop').first()).toContainText('Arashiyama Bamboo Grove');
 await page.getByLabel('Trip title',{exact:true}).fill('My beautiful Kyoto escape');
 await page.getByLabel('Notes for Arashiyama Bamboo Grove').fill('Bring the camera and find a quiet café.');
 await page.getByLabel('Visit time for Arashiyama Bamboo Grove').fill('08:00');
 await page.getByLabel('Move Fushimi Inari Shrine to day').selectOption('2');await expect(page.locator('.itinerary-stop')).toHaveCount(1);
 await page.getByRole('button',{name:'Day 2',exact:false}).click();await expect(page.locator('.itinerary-stop')).toHaveCount(1);await expect(page.locator('.itinerary-stop')).toContainText('Fushimi Inari Shrine');
 await page.getByRole('button',{name:'Save to account',exact:true}).click();
 const modal=page.getByRole('dialog');await modal.getByLabel('Your name').fill('Alex Wanderer');await modal.getByLabel('Email address').fill(`alex-${randomUUID()}@example.com`);await modal.getByLabel('Password',{exact:true}).fill('MyAdventure123!');
 await modal.getByRole('button',{name:'Create my account'}).click();await expect(modal).not.toBeVisible();
 await page.getByRole('button',{name:'My itineraries',exact:true}).click();await page.getByRole('button',{name:'Open itinerary'}).filter({visible:true}).first().click();
 await expect(page.getByLabel('Trip title',{exact:true})).toHaveValue('My beautiful Kyoto escape');
 await page.getByRole('button',{name:'Save to account',exact:true}).click();await expect(page.locator('.save-status')).toContainText('Saved to your account');
 await page.reload();await page.getByRole('button',{name:'My itineraries',exact:true}).click();await page.getByRole('button',{name:'Open itinerary'}).first().click();
 await expect(page.getByLabel('Trip title',{exact:true})).toHaveValue('My beautiful Kyoto escape');
 await page.getByRole('button',{name:'Day 1',exact:false}).click();await expect(page.getByLabel('Notes for Arashiyama Bamboo Grove')).toHaveValue('Bring the camera and find a quiet café.');
 await page.getByRole('button',{name:'Map & directions'}).click();await expect(page.getByRole('dialog').getByRole('heading',{name:'Arashiyama Bamboo Grove'})).toBeVisible();
 await page.getByRole('button',{name:'Private vehicle'}).click();await page.getByLabel('Starting point').fill('Kyoto Station');await expect(page.getByRole('link',{name:'Get driving directions'})).toHaveAttribute('href',/travelmode=driving&origin=Kyoto%20Station/);
 await page.getByRole('button',{name:'Close dialog'}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();expect((await download).suggestedFilename()).toBe('roam-kyoto-itinerary.txt');
 await page.getByRole('button',{name:'Sign out'}).click();await expect(page.getByRole('button',{name:'Log in',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('country search, map, mobile layout, and trip shortening work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByLabel('Country',{exact:true}).selectOption('France');await expect(page.getByLabel('Location',{exact:true})).toHaveValue('Paris');
 await page.getByLabel('Number of days').selectOption('3');await page.getByRole('button',{name:'Find my adventure'}).click();
 await expect(page.locator('.place-card')).toHaveCount(24);await expect(page.locator('.destination-tag')).toContainText('Paris, France');
 await page.getByRole('button',{name:'Map view',exact:true}).click();await expect(page.locator('iframe')).toHaveAttribute('title',/Map of Paris/);
 await page.getByRole('button',{name:'Select Day 3',exact:true}).click();await page.getByRole('button',{name:'Add Eiffel Tower to itinerary'}).click();
 await page.getByRole('button',{name:'View my itinerary'}).click();await page.getByLabel('Itinerary duration').selectOption('1');await expect(page.locator('.itinerary-stop')).toContainText('Eiffel Tower');
 await page.getByRole('button',{name:'Remove Eiffel Tower',exact:true}).click();await expect(page.getByRole('heading',{name:'Make room for a little wonder.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/mobile-planner.png',fullPage:true});
});

test('API enforces authentication, validates trips, and isolates account data',async({playwright,baseURL})=>{
 const a=await playwright.request.newContext({baseURL}),b=await playwright.request.newContext({baseURL}),guest=await playwright.request.newContext({baseURL});
 expect((await guest.get('/api/trips')).status()).toBe(401);
 const email=`owner-${randomUUID()}@example.com`,password='SecretAdventure123!';
 expect((await a.post('/api/auth/signup',{data:{email,password,name:'Owner'}})).status()).toBe(201);
 expect((await b.post('/api/auth/signup',{data:{email:`other-${randomUUID()}@example.com`,password,name:'Other'}})).status()).toBe(201);
 const trip={id:randomUUID(),title:'Protected trip',country:'Japan',city:'Kyoto',days:2,startDate:'',stops:[{id:randomUUID(),placeId:'kyoto-1',day:1,time:'',notes:'Private note'}]};
 expect((await a.put(`/api/trips/${trip.id}`,{data:trip})).status()).toBe(200);
 expect((await b.get('/api/trips')).status()).toBe(200);expect((await (await b.get('/api/trips')).json()).trips).toEqual([]);
 expect((await b.put(`/api/trips/${trip.id}`,{data:{...trip,title:'Hijacked'}})).status()).toBe(404);
 await b.delete(`/api/trips/${trip.id}`);expect((await (await a.get('/api/trips')).json()).trips[0].title).toBe('Protected trip');
 expect((await a.put(`/api/trips/${trip.id}`,{data:{...trip,days:0}})).status()).toBe(400);
 await a.post('/api/logout');expect((await a.get('/api/trips')).status()).toBe(401);
 expect((await a.post('/api/auth/login',{data:{email,password:'wrongpassword'}})).status()).toBe(401);
 expect((await a.post('/api/auth/login',{data:{email,password}})).status()).toBe(200);
 expect((await (await a.get('/api/trips')).json()).trips[0].stops[0].notes).toBe('Private note');
 await a.delete(`/api/trips/${trip.id}`);expect((await (await a.get('/api/trips')).json()).trips).toEqual([]);
 await Promise.all([a.dispose(),b.dispose(),guest.dispose()]);
});
