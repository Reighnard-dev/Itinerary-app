// Run with node --import tsx scripts/import-discovery-gaps.ts <GeoNames allCountries.zip> <snapshot date>
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {gzipSync} from 'node:zlib';
import type {Place} from '../shared/types.js';
import {placesByCity} from '../server/catalog.js';
import {cityDistance, worldCountries, type GeoCity} from '../server/world.js';

const [archive, snapshot] = process.argv.slice(2);
if (!archive || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot)) throw new Error('Specify a GeoNames allCountries.zip and its YYYY-MM-DD snapshot date');
const features = new Map<string, {category: Place['category']; kind: string; priority: number}>();
function register(category: Place['category'], priority: number, kinds: Record<string,string>) {
  for (const [code, kind] of Object.entries(kinds)) features.set(code, {category, kind, priority});
}
register('Culture', 0, {MUS:'museum', HSTS:'historic site', CSTL:'castle', PAL:'palace', MNMT:'monument', RUIN:'ruins', ARCH:'archaeological site', MSTY:'monastery', TMPL:'temple', PYR:'pyramid', AMTH:'amphitheater', THTR:'theater', LHSE:'lighthouse', FT:'fort', SQR:'public square'});
register('Parks & gardens', 0, {PRK:'park', GDN:'garden', RESN:'nature reserve', RESW:'wildlife reserve'});
register('Activities', 0, {AMUS:'amusement park', ZOO:'zoo', RECG:'recreation ground'});
register('Beaches', 0, {BCH:'beach', BCHS:'beaches'});
register('Nature', 0, {FLLS:'waterfall', CAVE:'cave', CRTR:'crater', CNYN:'canyon', GYSR:'geyser', VLC:'volcano'});
register('Culture', 1, {CH:'church', SYG:'synagogue', MSQE:'mosque', SHRN:'shrine', PGDA:'pagoda', LIBR:'library'});
register('Shopping', 1, {MKT:'market'});
register('Nature', 2, {MT:'mountain', PK:'peak', HLL:'hill', LK:'lake', BAYS:'bays', BAY:'bay', CAPE:'cape', ISL:'island', CLF:'cliff', GLCR:'glacier', FRST:'forest', SPNG:'spring', VAL:'valley', RDGE:'ridge', RKS:'rocks', LGN:'lagoon', HBR:'harbor'});
register('Nature', 3, {STM:'stream', PND:'pond', RSV:'reservoir', HDLD:'headland', COVE:'cove', WAD:'wadi', SPIT:'spit', RCH:'river reach', MTS:'mountain range', PLN:'plain', INLT:'inlet'});

register('Activities', 1, {STDM:'stadium', TRL:'trail', OBPT:'scenic observation point', OPRA:'opera house', GOLF:'golf course'});
register('Culture', 2, {BDG:'bridge', TOWR:'tower', PYRS:'pyramids'});
register('Restaurants', 1, {REST:'restaurant'});
register('Parks & gardens', 1, {RESF:'forest reserve'});
register('Nature', 2, {OAS:'oasis', RPDS:'rapids', MESA:'mesa', DUNE:'dune', ATOL:'atoll', PROM:'promontory', PKS:'peaks', ROCK:'rock', WTLD:'wetland'});
register('Hotels', 3, {HTL:'hotel', RSRT:'resort'});
// Only offer distinct named localities where no mapped attraction or venue is available.
register('Localities', 100, {PPLX:'neighborhood', PPL:'populated place', PPLL:'populated locality', PPLA3:'town', PPLA4:'town', PPLA5:'town'});

// These cities had no qualifying GeoNames record within the standard 20 km.
// Use a confirmed nearby feature with its actual distance and type.
const remoteRecords: Record<string, {id:string; category: Place['category']; kind:string}> = {
  '1808820': {id:'1814601', category:'Nature', kind:'mountain pass'},
  '1811746': {id:'1817624', category:'Localities', kind:'populated place'},
  '6311121': {id:'338678', category:'Localities', kind:'populated place'},
  '6311119': {id:'329632', category:'Localities', kind:'populated place'},
  '181374': {id:'180467', category:'Nature', kind:'intermittent stream'},
  '11886891': {id:'1494974', category:'Nature', kind:'lake'},
  '2027296': {id:'8555787', category:'Localities', kind:'airport'},
  '2014624': {id:'2025172', category:'Nature', kind:'stream'},
  '342803': {id:'58159', category:'Localities', kind:'populated place'},
  '6311111': {id:'60037', category:'Localities', kind:'populated place'},
};

type Candidate = {id:string; name:string; lat:number; lng:number; code:string; distance:number; score:number};
type Destination = {country:string; code:string; city:GeoCity; candidates:Candidate[]; remote?:Candidate};
const targets: Destination[] = [];
const bands = new Map<string,Destination[]>();
const remote = new Map<string,Destination>();
for (const {country,code,cities} of worldCountries) {
  for (const city of cities) {
    const bundled = placesByCity.get(JSON.stringify([country,city.name]));
    if (bundled?.some(place => !place.id.startsWith('nearby-'))) continue;
    const target: Destination = {country,code,city,candidates:[]};
    targets.push(target);
    const record = remoteRecords[city.id];
    if (record) remote.set(record.id,target);
    const key = code + Math.floor(city.lat * 4);
    const band = bands.get(key) ?? [];
    band.push(target);
    bands.set(key, band);
  }
}

const extract = spawn('tar', ['-xOf', archive, 'allCountries.txt'], {windowsHide:true, stdio:['ignore','pipe','inherit']});
const completed = new Promise<void>((resolve,reject) => {
  extract.once('error',reject);
  extract.once('close',code => code === 0 ? resolve() : reject(new Error('GeoNames extraction failed: ' + code)));
});
for await (const line of createInterface({input:extract.stdout, crlfDelay:Infinity})) {
  const [id,name,,,latitude,longitude,,code,countryCode] = line.split('\t',9);
  const lat = Number(latitude), lng = Number(longitude), band = Math.floor(lat * 4);
  const target = remote.get(id);
  if (target?.code === countryCode) {
    const distance = cityDistance(target.city,{lat,lng});
    if (distance <= 45) target.remote = {id,name,lat,lng,code,distance,score:distance};
  }
  const feature = features.get(code);
  if (!feature || !name || name.length > 160 || /\((?:historical|abandoned|destroyed)\)/i.test(name)) continue;
  for (let i = band - 1; i <= band + 1; i++) {
    for (const {city,candidates} of bands.get(countryCode + i) ?? []) {
      const delta = Math.abs(city.lng - lng);
      if (Math.min(delta,360-delta) * Math.cos(city.lat * Math.PI / 180) > 0.20) continue;
      const distance = cityDistance(city,{lat,lng});
      if (distance > 20 || id === city.id) continue;
      if (feature.category === 'Localities' && (distance < 0.5 || [city.name,city.nativeName].some(label => label.toLowerCase() === name.toLowerCase()))) continue;
      const score = feature.priority * 5 + distance;
      if (candidates.length === 6 && score >= candidates[5].score) continue;
      const sameName = candidates.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
      if (sameName >= 0 && candidates[sameName].score <= score) continue;
      if (sameName >= 0) candidates.splice(sameName,1);
      candidates.push({id,name,lat,lng,code,distance,score});
      candidates.sort((a,b) => a.score-b.score || a.id.localeCompare(b.id));
      if (candidates.length > 6) candidates.pop();
    }
  }
}
await completed;
const additions: Place[] = [];
const missing: string[] = [];
for (const {country,city,candidates,remote} of targets) {
  const cityId = createHash('sha256').update(JSON.stringify([country,city.name])).digest('hex').slice(0,12);
  const sights = candidates.filter(item => features.get(item.code)!.category !== 'Localities');
  const selected = sights.length ? sights : candidates.slice(0,3);
  if (remote && (!selected.length || !sights.length && remoteRecords[city.id].category !== 'Localities')) {
    selected.unshift(remote);
  }
  if (!selected.length) missing.push(`${city.name}, ${country}`);
  for (const candidate of selected) {
    const {id,name,lat,lng,code,distance} = candidate;
    const {category,kind} = candidate === remote ? remoteRecords[city.id] : features.get(code)!;
    additions.push({
      id:`nearby-${id}-${cityId}`,country,city:city.name,name,lat,lng,category,kind:'local',rating:null,
      description:`GeoNames lists ${name} (${kind}), ${distance < 1 ? 'within 1 km' : 'about '+Math.round(distance)+' km'} from the center of ${city.name}. Confirm visitor access locally.`,
      duration:'Check locally',price:'Check locally',bestTime:'Check visitor hours',image:'/images/photo-unavailable.svg',
      transit:'Check public transport to the mapped coordinates.',driving:'Check local access and parking.',
      source:{name:'GeoNames contributors',url:`https://www.geonames.org/${id}/`,license:'CC BY 4.0',retrievedAt:snapshot+'T00:00:00.000Z'}
    });
  }
}
writeFileSync('shared/nearby-places.json.gz',gzipSync(JSON.stringify(additions),{level:9}));
console.log(JSON.stringify({targets:targets.length,added:additions.length,missing}));
