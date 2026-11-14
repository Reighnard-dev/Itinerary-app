import {selectCountry, selectCity} from './destination-picker';
import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import type {Place} from '../../shared/types';

test('worldwide city selection, restaurants, parks, pagination, and sources work',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await selectCountry(page,'Singapore');await page.getByRole('button',{name:'Find my adventure'}).click();await expect(page.locator('.place-card')).toHaveCount(24);
 await page.getByRole('button',{name:/Restaurants$/}).click();await expect(page.locator('.place-card').first().locator('.card-category')).toContainText('Restaurants');
 const name=(await page.locator('.place-card').first().locator('.card-title').innerText()).trim();await page.locator('.place-card').first().locator('.card-title').click();
 await expect(page.locator('.guide-information')).toContainText('Wikivoyage contributors');await expect(page.locator('.guide-information a').first()).toHaveAttribute('href',/en.wikivoyage.org/);await page.getByRole('button',{name:'Close dialog'}).click();
 await page.locator('.place-card').first().locator('.add-btn').click();await page.getByRole('button',{name:'View my itinerary'}).click();await expect(page.locator('.itinerary-stop')).toContainText(name);
 await page.getByLabel(`Notes for ${name}`).fill('Reserve a table before we go.');await page.reload();await page.getByRole('button',{name:'My itineraries',exact:true}).click();await page.getByRole('button',{name:'Open itinerary'}).first().click();await expect(page.getByLabel(`Notes for ${name}`)).toHaveValue('Reserve a table before we go.');
 await page.getByRole('button',{name:'Back to discovering'}).click();await page.getByRole('button',{name:'Parks & gardens',exact:true}).click();await expect(page.locator('.place-card').first().locator('.card-category')).toContainText('Parks & gardens');
 await page.getByRole('button',{name:'Everything',exact:true}).click();await expect(page.locator('.place-card')).toHaveCount(24);await page.getByRole('button',{name:/Show 24 more/}).click();await expect(page.locator('.place-card')).toHaveCount(48);
 await page.getByLabel('Find a place',{exact:true}).fill('no-such-place-12345');await expect(page.locator('.place-card')).toHaveCount(0);await page.getByLabel('Find a place',{exact:true}).fill('');await expect(page.locator('.place-card')).toHaveCount(24);
 expect(errors).toEqual([]);
});

test('a country itinerary can include multiple cities without replacing its existing places',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Add Fushimi Inari Shrine to itinerary'}).click();
 await selectCity(page,'Osaka');await page.getByRole('button',{name:'Find my adventure'}).click();await expect(page.locator('.destination-tag')).toContainText('Osaka');await expect(page.locator('.place-card')).toHaveCount(24);
 const name=(await page.locator('.place-card').first().locator('.card-title').innerText()).trim();await page.locator('.place-card').first().locator('.add-btn').click();await expect(page.getByRole('dialog')).not.toBeVisible();await page.getByRole('button',{name:'View my itinerary'}).click();
 await expect(page.locator('.itinerary-stop')).toHaveCount(2);await expect(page.locator('.planner-page .page-heading')).toContainText('Kyoto → Osaka');await page.reload();await page.getByRole('button',{name:'My itineraries',exact:true}).click();await page.getByRole('button',{name:'Open itinerary'}).first().click();await expect(page.locator('.itinerary-stop')).toContainText(['Fushimi Inari Shrine',name]);
});

test('unseeded cities load live listings, saved snapshots persist in SQL, and provider failures are clear',async({page,request})=>{
 // Oslo is now bundled. Isolate the empty catalog response to continue testing
 // first-time live discovery rather than depending on a real coverage gap.
 await page.route('**/api/places?**',route=>new URL(route.request().url()).searchParams.get('country')==='Norway'?route.fulfill({json:{places:[]}}):route.continue());
 const point:Place={id:'guide-no-0123456789abcdef0123',name:'Akershus Fortress',country:'Norway',city:'Oslo',category:'Culture',kind:'iconic',description:'A historic fortress above Oslo’s waterfront.',image:'/illustrations/culture.svg',lat:59.9076,lng:10.7369,rating:null,duration:'1–2 hours',price:'Check current prices',bestTime:'Check venue hours',transit:'Check current transit directions.',driving:'Use designated parking.',source:{name:'Wikivoyage contributors',url:'https://en.wikivoyage.org/wiki/Oslo#See',retrievedAt:'2026-11-11T00:00:00.000Z',license:'CC BY-SA 4.0'}};
 await page.route('**/api/explore?**',route=>route.fulfill({json:{places:[point],sourcePages:[point.source!.url],cached:false,fetchedAt:point.source!.retrievedAt}}));await page.goto('/');await selectCountry(page,'Norway');await page.getByRole('button',{name:'Find my adventure'}).click();await expect(page.locator('.place-card')).toHaveCount(1);await page.getByRole('button',{name:'Add Akershus Fortress to itinerary'}).click();await page.getByRole('button',{name:'View my itinerary'}).click();await expect(page.locator('.itinerary-stop')).toContainText('Akershus Fortress');
 const signup=await request.post('/api/auth/signup',{data:{email:`live-${randomUUID()}@example.com`,password:'MyAdventure123!',name:'Live Traveler'}});expect(signup.status()).toBe(201);
 const trip={id:randomUUID(),title:'Oslo from a live guide',country:'Norway',city:'Oslo',days:2,startDate:'',stops:[{id:randomUUID(),placeId:point.id,place:point,day:1,time:'10:00',notes:'Saved snapshot.'}]};expect((await request.put(`/api/trips/${trip.id}`,{data:trip})).status()).toBe(200);const saved=(await(await request.get('/api/trips')).json()).trips.find((t:{id:string})=>t.id===trip.id);expect(saved.stops[0].place.name).toBe('Akershus Fortress');
 await page.unroute('**/api/explore?**');await page.route('**/api/explore?**',route=>route.fulfill({status:503,json:{error:'The live travel guide is temporarily unavailable.'}}));await page.getByRole('button',{name:'Back to discovering'}).click();await page.getByRole('button',{name:'Find more in live city guides'}).click();await expect(page.locator('.discovery-notice')).toContainText('temporarily unavailable');await expect(page.getByRole('button',{name:'View my itinerary'})).toBeEnabled();
});

test('expanded country listings expose dining, parks, and correct source licenses',async({page})=>{
 await page.goto('/');
 await selectCountry(page,'Barbados');await page.getByRole('button',{name:'Find my adventure'}).click();
 await expect(page.locator('.destination-tag')).toContainText('Bridgetown');await expect(page.locator('.place-card').first()).toBeVisible();
 await page.getByRole('button',{name:/Restaurants$/}).click();await expect(page.locator('.place-card').first().locator('.card-category')).toContainText('Restaurants');
 await page.getByRole('button',{name:'Parks & gardens',exact:true}).click();await expect(page.locator('.place-card').first().locator('.card-category')).toContainText('Parks & gardens');
 await page.locator('.place-card').first().locator('.card-title').click();await expect(page.locator('.guide-information')).toContainText(/Wikivoyage|GeoNames|OpenStreetMap/);
 await page.screenshot({path:'test-results/barbados-expanded-detail.png',fullPage:true});
});

test('a smaller mapped city keeps its source credits on mobile and in an itinerary',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await selectCountry(page,'Belgium');
 await selectCity(page,'Aalter','Aalter');
 await page.getByRole('button',{name:'Find my adventure'}).click();await page.getByRole('button',{name:/Restaurants$/}).click();
 const card=page.locator('.place-card').first();await expect(card.locator('.card-source')).toContainText('Overture Maps');
 await expect(card.locator('.card-source a').last()).toHaveAttribute('href','/licenses/overture-places.txt');
 const name=(await card.locator('.card-title').innerText()).trim();await card.locator('.card-title').click();
 await expect(page.locator('.guide-information')).toContainText('Overture Maps Foundation');
 await page.getByRole('button',{name:'Close dialog'}).click();await card.locator('.add-btn').click();
 await page.getByRole('button',{name:'View my itinerary'}).click();await expect(page.locator('.itinerary-stop')).toContainText(name);
 await page.reload();await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('button',{name:'My itineraries',exact:true}).click();await page.getByRole('button',{name:'Open itinerary'}).first().click();
 await expect(page.locator('.itinerary-stop')).toContainText(name);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('mobile city autocomplete and invalid city selection do not overflow or erase a trip',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await selectCountry(page,'Australia');await selectCity(page,'Melbourne','Melb');await page.getByRole('button',{name:'Find my adventure'}).click();await expect(page.locator('.destination-tag')).toContainText('Melbourne');await expect(page.locator('.place-card')).toHaveCount(24);
 await page.getByRole('button',{name:/Restaurants$/}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Choose city: Melbourne'}).click();const search=page.getByRole('searchbox',{name:'Search cities'});await search.fill('Definitely not a city');await expect(page.getByText('No matches. Try another spelling.')).toBeVisible();await search.press('Escape');await expect(page.getByRole('button',{name:'Choose city: Melbourne'})).toBeFocused();await expect(page.locator('.destination-tag')).toContainText('Melbourne');
 await page.screenshot({path:'test-results/mobile-expanded-discovery.png',fullPage:true});
});
