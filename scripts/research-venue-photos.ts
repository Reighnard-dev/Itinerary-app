import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import http from 'node:http';
import https from 'node:https';
import {load} from 'cheerio';
import {places as originals} from '../shared/catalog.js';
import type {Place,PlaceImage} from '../shared/types.js';
import {isNearby,normalName} from '../server/photo-search.js';

const places:Place[]=[...originals,...JSON.parse(readFileSync('shared/expanded-places.json','utf8'))];
const output:Record<string,PlaceImage>=existsSync('shared/venue-photo-candidates.json')?JSON.parse(readFileSync('shared/venue-photo-candidates.json','utf8')):{};
const existing:Record<string,PlaceImage>=JSON.parse(readFileSync('shared/place-images.json','utf8'));
mkdirSync('data/sources/venues',{recursive:true});mkdirSync('public/images/places',{recursive:true});
const blockedSites=/(^|\.)(facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|booking\.com|tripadvisor\.[a-z.]+|google\.[a-z.]+|maps\.app\.goo\.gl|youtu\.be|youtube\.com|wikipedia\.org|wikivoyage\.org)$/i;
function publicAddress(address:string){if(isIP(address)===4){const n=address.split('.').map(Number);return n[0]>0&&n[0]!==10&&n[0]!==127&&n[0]<224&&!(n[0]===169&&n[1]===254)&&!(n[0]===192&&(n[1]===168||n[1]===0))&&!(n[0]===172&&n[1]>=16&&n[1]<=31)&&!(n[0]===100&&n[1]>=64&&n[1]<=127)&&!(n[0]===198&&(n[1]===18||n[1]===19));}return /^[23]/i.test(address)&&!address.toLowerCase().startsWith('2001:db8:');}
interface Result {url:string;type:string;body:Buffer}
async function request(urlString:string,maxBytes:number,redirects=0):Promise<Result>{
 const url=new URL(urlString);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port)||isIP(url.hostname)||url.hostname==='localhost'||/\.(local|internal|lan|home)$/i.test(url.hostname))throw new Error('Non-public URL');
 const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('Non-public address');
 return new Promise((resolve,reject)=>{
  const transport=url.protocol==='https:'?https:http;
  const req=transport.get(url,{headers:{'User-Agent':'RoamItinerary/1.0 (http://localhost:3001; public venue photograph research)','Accept':'text/html,image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.1'},lookup:((_host:string,options:any,callback:any)=>{if(options?.all)callback(null,addresses);else callback(null,addresses[0].address,addresses[0].family);}) as any},res=>{
   if(res.statusCode&&res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();if(redirects>=3)return reject(new Error('Too many redirects'));request(new URL(res.headers.location,url).href,maxBytes,redirects+1).then(resolve,reject);return;}
   if(res.statusCode!==200){res.resume();reject(new Error(`HTTP ${res.statusCode}`));return;}
   if(Number(res.headers['content-length']||0)>maxBytes){res.destroy();reject(new Error('Asset too large'));return;}
   const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>maxBytes){res.destroy();reject(new Error('Asset too large'));}else chunks.push(chunk);});res.on('end',()=>resolve({url:url.href,type:String(res.headers['content-type']||''),body:Buffer.concat(chunks)}));res.on('error',reject);
  });req.setTimeout(7000,()=>req.destroy(new Error('Timed out')));req.on('error',reject);
 });
}
function parseCoordinates(text:string):{lat:number;lon:number}[]{const output:{lat:number;lon:number}[]=[];for(const item of text.matchAll(/"latitude"\s*:\s*"?(-?[\d.]+)"?\s*[,}][\s\S]{0,100}?"longitude"\s*:\s*"?(-?[\d.]+)/g))output.push({lat:Number(item[1]),lon:Number(item[2])});return output;}
async function research(place:Place){
 if(!place.website||existing[place.id]||output[place.id])return;
 const hash=createHash('sha256').update(place.id+place.website).digest('hex');const marker=`data/sources/venues/${hash}.json`;if(existsSync(marker))return;
 let status='No exact venue photograph found';
 try{
  const original=new URL(place.website);if(blockedSites.test(original.hostname))return;
  const page=await request(original.href,1500000);if(!page.type.includes('text/html'))return;const doc=load(page.body.toString('utf8'));
  const name=normalName(place.name.replace(/\([^)]*\)/g,'').replace(/^the /i,''));if(name.length<5)return;
  const heading=normalName([doc('title').first().text(),doc('h1').first().text(),doc('meta[property="og:title"]').attr('content')||''].join(' '));
  if(!heading.includes(name))return;
  const html=page.body.toString('utf8');const coordinates=parseCoordinates(html);doc('script,style,noscript').remove();const body=normalName(doc('body').text());const city=normalName(place.city.replace(/ city$/i,''));
  const near=isNearby(place,coordinates,2);if(!near&&!body.includes(city))return;
  const possibilities:{url:string;alt:string;score:number}[]=[];
  doc('img[src],img[data-src]').each((_i,img)=>{const item=doc(img);const alt=item.attr('alt')||item.attr('title')||'';const src=item.attr('data-src')||item.attr('src')||'';if(!src||src.startsWith('data:'))return;const label=normalName(alt+' '+src);
   if(/\b(logo|icon|avatar|sprite|menu|dish|dishes|dessert|pizza|cocktail|burger|salad|noodles|sushi|poster|advertisement|map)\b/.test(label))return;
   const venueWords=/\b(interior|exterior|facade|terrace|dining room|building|courtyard|entrance|storefront|our space)\b/.test(normalName(alt));
   if(!venueWords||!normalName(alt).includes(name))return;
   const width=Number(item.attr('width')||0),height=Number(item.attr('height')||0);if(width&&width<300||height&&height<150)return;
   try{possibilities.push({url:new URL(src,page.url).href,alt,score:(normalName(alt).includes(name)?4:0)+(near?3:0)+(width>600?1:0)});}catch{}
  });
  const og=doc('meta[property="og:image"]').attr('content'),ogAlt=doc('meta[property="og:image:alt"]').attr('content')||'';
  if(og){const label=normalName(og+' '+ogAlt);if(!/(logo|icon|menu|dish|dessert|pizza|cocktail|burger|salad|noodles|sushi|poster|map)/.test(label)&&/\b(interior|exterior|facade|terrace|dining room|building|courtyard|entrance|storefront)\b/.test(normalName(ogAlt))&&normalName(ogAlt).includes(name))try{possibilities.push({url:new URL(og,page.url).href,alt:ogAlt,score:3+(near?3:0)});}catch{}}
  for(const candidate of possibilities.sort((a,b)=>b.score-a.score).slice(0,2)){
   try{const image=await request(candidate.url,3000000);if(!/^image\/(jpeg|png|webp)/.test(image.type)||image.body.length<8000)continue;const file=createHash('sha256').update(candidate.url).digest('hex').slice(0,24)+'.jpg';writeFileSync(`public/images/places/${file}`,image.body);
    output[place.id]={url:`/images/places/${file}`,title:candidate.alt||`${place.name} — venue website`,sourceUrl:page.url,author:`${place.name} website`,license:'Source website — rights retained',licenseUrl:page.url,match:near?'Exact venue title, nearby published coordinates and venue photograph':'Exact venue title, city address and named venue photograph',provider:'venue'};
    status='Photograph matched to venue title and location';break;
   }catch{}
  }
 }catch(error){status=(error as Error).message;}
 finally{writeFileSync(marker,JSON.stringify({place:place.id,checkedAt:new Date().toISOString(),status}));}
}
const pending=places.filter(p=>p.website&&!existing[p.id]&&!output[p.id]);console.log(`Researching ${pending.length} venue source pages for exact location photographs.`);
let index=0,checked=0;
async function worker(){while(index<pending.length){const place=pending[index++];await research(place);checked++;if(checked%25===0){writeFileSync('shared/venue-photo-candidates.json',JSON.stringify(output));console.log(`Checked ${checked}/${pending.length} venue pages · ${Object.keys(output).length} photographed venues`);}}}
await Promise.all([worker(),worker(),worker()]);writeFileSync('shared/venue-photo-candidates.json',JSON.stringify(output));console.log(JSON.stringify({checked,photographs:Object.keys(output).length}));
