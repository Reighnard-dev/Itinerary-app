import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {publicImage} from '../server/public-image-fetch.js';
import type {Place} from '../shared/types.js';
const places:Place[]=JSON.parse(readFileSync('shared/sapa-places.json','utf8'));
const guide:Place[]=JSON.parse(readFileSync('data/sapa/guide-places.json','utf8'));
const congSource='https://congcaphe.com/store-detail/lao-cai/362/cong-caphe-sa-pa';
const response=await fetch(congSource,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Cafe source unavailable');const html=await response.text();writeFileSync('data/sapa/cong-source.html',html);const $=load(html);
const congImages=$('img').toArray().map(e=>$(e).attr('src')||$(e).attr('data-src')||'').filter(src=>src.includes('cong-news.appwifi.com')&&/\.jpg$/i.test(src));
console.log('Cafe images',congImages);
const specs=[{name:'Cong Caphe',image:congImages[0],source:congSource,author:'Cộng Cà Phê official Sa Pa branch website'}, {name:'Hoa Tam Vegetarian Restaurant',image:'https://cdn.worldtravelambitions.com/images/hoa-tam-vegetarian-restaurant-sapa-vietnam.jpg',source:'https://worldtravelambitions.com/blog/sapa-town-family-holiday-recommendations/',author:'World Travel Ambitions venue photograph'}];
for(const spec of specs){const p=guide.find(p=>p.name===spec.name);if(!p||!spec.image)throw Error('Missing venue or photo '+spec.name);const bytes=await publicImage(new URL(spec.image,congSource).href);const file='/images/places/'+createHash('sha256').update(spec.image).digest('hex').slice(0,24)+'.jpg';writeFileSync('public'+file,bytes);p.photo={url:file,title:p.name+' — venue photograph',sourceUrl:spec.source,author:spec.author,license:'Source website — rights retained',licenseUrl:spec.source,match:'Named Sa Pa venue photograph on linked source page',provider:'web'};p.image='/illustrations/dining.svg';p.duration='1–2 hours';p.bestTime='Confirm current opening hours';p.price='Check current menu prices';delete p.hours;
 if(p.name==='Cong Caphe'){p.description='A café at 37 Xuan Vien in central Sa Pa serving coffee and other drinks. Its official branch page provides current contact details and hours.';p.website=congSource;p.source={name:'Cộng Cà Phê official branch directory',url:congSource,retrievedAt:new Date().toISOString()};}
 else{p.description='A Vietnamese vegetarian restaurant on Tue Tinh, offering a place to stop for a meat-free meal near central Sa Pa. Confirm dietary requirements and current hours with the restaurant.';p.address='12, alley 20 Tue Tinh, Sa Pa';}
 const index=places.findIndex(row=>row.id===p.id);if(index>=0)places[index]=p;else places.push(p);
}
writeFileSync('shared/sapa-places.json',JSON.stringify(places,null,2)+'\n');console.log('Saved',places.length,'Sa Pa places');
