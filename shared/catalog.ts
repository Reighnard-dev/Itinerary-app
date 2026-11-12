import type { Place } from './types.js';
const photo = (id: string) => `/images/${id}.jpg`;
export const images = {
  hero: '/images/hero.jpg',
  kyoto: photo('photo-1478436127897-769e1b3f0f36'),
  bamboo: photo('photo-1717060773524-e4a73c4b014a'),
  temple: photo('photo-1748334037968-650e1f0a7771'),
  japan: photo('photo-1545569341-9eb8b30979d9'),
  tokyo: photo('photo-1540959733332-eab4deabeeaf'),
  bali: photo('photo-1537996194471-e657df975ab4'),
  paris: photo('photo-1502602898657-3e91760cbb34'),
  rome: photo('photo-1552832230-c0197dd311b5'),
  swiss: photo('photo-1464822759023-fed622ff2c3b'),
  bangkok: photo('photo-1508009603885-50cf7c579365'),
  cebu: photo('photo-1518509562904-e7ef99cdcc86'),
};
type Entry = [string, string, Place['category'], Place['kind'], number, number, string, string, string, string, string, string];
function destination(country: string, city: string, entries: Entry[]): Place[] {
  return entries.map(([name, image, category, kind, lat, lng, description, duration, price, bestTime, transit, driving], i) => ({ id: `${city.toLowerCase().replaceAll(' ', '-')}-${i + 1}`, name, country, city, image, category, kind, lat, lng, description, duration, price, bestTime, transit, driving, rating: [4.9, 4.8, 4.9, 4.7, 4.8, 4.9][i % 6] }));
}
export const places: Place[] = [
 ...destination('Japan','Kyoto',[
  ['Fushimi Inari Shrine',images.kyoto,'Culture','iconic',34.9671,135.7727,'Follow thousands of vermilion torii gates up a wooded mountainside. Take the quieter upper trails for a little magic all to yourself.','2–3 hours','Free','Early morning','JR Nara Line to Inari Station; the entrance is a short walk away.','Limited parking near the shrine. Leave the car at a station and continue by train.'],
  ['Arashiyama Bamboo Grove',images.bamboo,'Nature','iconic',35.017,135.6713,'A different kind of skyscraper. Wander through towering bamboo, then follow the river to peaceful temples and tiny teahouses.','1–2 hours','Free','Before 8 am','JR Sagano Line to Saga-Arashiyama, then walk approximately 15 minutes.','Use paid parking around Togetsukyo Bridge and walk to the grove.'],
  ['Otagi Nenbutsu-ji',photo('otagi-nenbutsu-ji'),'Culture','hidden',35.051,135.6529,'Meet 1,200 wonderfully expressive stone rakan, tucked into a moss-covered hillside temple beyond the usual Arashiyama trail.','1–2 hours','Paid entry','Morning','Take a local bus from Saga-Arashiyama toward Otagidera-mae; check the timetable.','Small parking areas are available nearby; roads through the village are narrow.'],
  ['Kiyomizu-dera',photo('kiyomizu-dera'),'Culture','iconic',34.9949,135.785,'A wooden stage above the treetops and a whole city at your feet. Explore the old lanes of Higashiyama on your way up.','2–3 hours','Paid entry','Late afternoon','City bus to Gojozaka, followed by an uphill walk of about 15 minutes.','Park below Higashiyama and walk; nearby roads can be congested.'],
  ['Philosopher’s Path',images.japan,'Nature','hidden',35.0265,135.7932,'Slow down along a canal lined with cherry trees, little shrines, and neighborhood cafés. A small detour with a big sense of calm.','1–2 hours','Free','Morning or spring','Take a city bus to Ginkakuji-michi and walk to the canal.','Use a nearby paid car park; this is a walking path.'],
  ['Nishiki Market',photo('photo-1554797589-7241bb691973'),'Food & drink','iconic',35.005,135.7649,'Taste your way through Kyoto’s kitchen: handmade sweets, pickles, tea, and tiny family-run shops under one colorful roof.','1–2 hours','Pay as you go','Late morning','Subway to Shijo Station or Hankyu to Karasuma, then a short walk.','Use a central paid car park and explore the covered market on foot.'],
 ]),
 ...destination('Japan','Tokyo',[
  ['Sensō-ji Temple',images.tokyo,'Culture','iconic',35.7148,139.7967,'Pass through the great lantern gate into the heart of old Asakusa. Browse traditional shops and pause in the temple courtyard.','2 hours','Free','Early morning','Ginza or Asakusa Line to Asakusa Station.','Use paid public parking in Asakusa; approach the temple on foot.'],
  ['Shibuya Crossing',photo('photo-1542051841857-5f90071e7989'),'Culture','iconic',35.6595,139.7005,'Join the famous scramble beneath giant screens, then find a café window to watch the city move.','1 hour','Free','Evening','JR Yamanote Line to Shibuya, Hachiko Exit.','City traffic is heavy; park outside the station district.'],
  ['Yanaka Ginza',photo('yanaka-ginza'),'Food & drink','hidden',35.7277,139.765,'A nostalgic shopping street of small bites, craft shops, and a gentler side of Tokyo.','2 hours','Pay as you go','Afternoon','JR to Nippori Station, then walk west.','Nearby coin parking is limited; train travel is easier.'],
  ['Todoroki Valley',photo('todoroki-valley'),'Nature','hidden',35.6038,139.647,'A leafy ravine hidden below the streets, with a streamside trail and a quiet temple. Check local access notices before visiting.','1–2 hours','Free','Daytime','Tokyu Oimachi Line to Todoroki Station.','Use paid neighborhood parking; avoid residential streets.'],
 ]),
 ...destination('Indonesia','Bali',[
  ['Tegallalang Rice Terraces',images.bali,'Nature','iconic',-8.434,115.279,'Walk emerald terraces and meet the living landscape of Bali’s traditional subak irrigation system.','2–3 hours','Paid entry','Morning','Hire a local driver from Ubud; public transit is limited.','Drive north from Ubud and use designated visitor parking.'],
  ['Uluwatu Temple',photo('uluwatu-temple'),'Culture','iconic',-8.8291,115.0849,'A sea temple perched above the Indian Ocean, with cliffside paths and extraordinary sunset views.','2 hours','Paid entry','Sunset','Book a local driver or taxi; arrange your return in advance.','Follow the main road to Uluwatu and use the temple car park.'],
  ['Sidemen Valley',photo('sidemen-valley'),'Nature','hidden',-8.4666,115.445,'Trade the bustle for village paths, rice fields, and a horizon watched over by Mount Agung.','Half day','Guide optional','Morning','Arrange a private driver or guided village walk.','Drive inland through east Bali; narrow roads reward a slower pace.'],
  ['Tukad Cepung Waterfall',photo('tukad-cepung'),'Adventure','hidden',-8.441,115.388,'Sunlight spills through a cave onto a waterfall. Wear grippy footwear and check conditions after rain.','2 hours','Paid entry','Morning','Arrange transport from Ubud with a local driver.','Park at the marked entrance, then descend the stepped trail.'],
 ]),
 ...destination('France','Paris',[
  ['Eiffel Tower',images.paris,'Culture','iconic',48.8584,2.2945,'A Paris classic from every angle. Picnic on the Champ de Mars or reserve a timed visit for views above the rooftops.','2–3 hours','Grounds free; tower paid','Sunset','Metro Line 6 to Bir-Hakeim or RER C to Champ de Mars.','Use an underground car park; central Paris has traffic restrictions.'],
  ['Louvre Museum',photo('louvre'),'Culture','iconic',48.8606,2.3376,'From ancient worlds to masterworks, take your time in one of the world’s great museums. Reserve a timed ticket.','Half day','Paid entry','Weekday morning','Metro Line 1 or 7 to Palais Royal–Musée du Louvre.','Use the Carrousel du Louvre underground parking.'],
  ['La Petite Ceinture',photo('petite-ceinture'),'Nature','hidden',48.8337,2.3103,'Reclaimed railway sections offer an unexpectedly wild walk through the city. Use designated public entrances.','1–2 hours','Free','Afternoon','Metro to a public access point; sections have separate entrances.','Park in a public car park and explore on foot.'],
  ['Passage des Panoramas',photo('passage-des-panoramas'),'Food & drink','hidden',48.8716,2.3418,'Duck into an atmospheric covered passage of vintage shopfronts, small restaurants, and Parisian history.','1 hour','Free to explore','Lunchtime','Metro Line 8 or 9 to Grands Boulevards.','Use public parking near the Grands Boulevards.'],
 ]),
 ...destination('Italy','Rome',[
  ['Colosseum',images.rome,'Culture','iconic',41.8902,12.4922,'Step into the stories of ancient Rome. Book a timed ticket and pair your visit with the Roman Forum.','2–3 hours','Paid entry','Morning','Metro Line B to Colosseo.','Avoid restricted traffic zones; park outside the historic center.'],
  ['Trevi Fountain',photo('trevi-fountain'),'Culture','iconic',41.9009,12.4833,'An extravagant baroque masterpiece tucked into the streets of the historic center.','1 hour','Check local access rules','Early morning','Metro Line A to Barberini, then walk.','The surrounding streets are restricted; park outside the center.'],
  ['Quartiere Coppedè',photo('quartiere-coppede'),'Culture','hidden',41.9193,12.5017,'Discover a tiny fairytale neighborhood of unexpected arches, playful details, and wonderfully strange architecture.','1–2 hours','Free','Daytime','Take a tram or bus to the Buenos Aires area.','Use paid street parking where permitted.'],
  ['Appian Way',photo('appian-way'),'Adventure','hidden',41.8407,12.5242,'Walk or cycle an ancient road lined with pines, ruins, and open countryside at the edge of the city.','Half day','Free; rentals extra','Morning','Bus to the Appia Antica visitor area; check current routes.','Use designated parking outside restricted sections.'],
 ]),
 ...destination('Switzerland','Interlaken',[
  ['Harder Kulm',images.swiss,'Nature','iconic',46.6978,7.8517,'Two lakes, one extraordinary panorama. Ride the funicular to a balcony above Interlaken.','2 hours','Paid funicular','Clear afternoon','Walk from Interlaken Ost to the funicular station.','Park near Interlaken Ost and continue on foot.'],
  ['Lake Brienz',photo('lake-brienz'),'Nature','iconic',46.726,7.971,'Glacial blue water framed by alpine peaks. Slow down on a lakeside walk or seasonal boat trip.','Half day','Walk free; boat paid','Clear morning','Train to Brienz or a seasonal lake boat.','Use designated lakeside parking in Brienz.'],
  ['Iseltwald Village',photo('iseltwald'),'Culture','hidden',46.7119,7.964,'Wooden chalets, lakeside paths, and a quieter alpine rhythm on the edge of Lake Brienz.','2 hours','Free to explore','Morning','Bus from Interlaken Ost; services vary by season.','Use visitor parking outside the village center.'],
  ['Weissenau Nature Reserve',photo('weissenau'),'Nature','hidden',46.669,7.835,'Reed beds, birdlife, and an easy waterside trail at the eastern edge of Lake Thun.','1–2 hours','Free','Morning','Bus toward Neuhaus, then follow marked walking paths.','Use the designated Neuhaus car park.'],
 ]),
 ...destination('Thailand','Bangkok',[
  ['Wat Arun',images.bangkok,'Culture','iconic',13.7437,100.4889,'Porcelain mosaics catch the light on the riverside Temple of Dawn. Bring clothing that covers shoulders and knees.','1–2 hours','Paid entry','Morning','Take a Chao Phraya river boat and local cross-river ferry.','Park on the Thonburi side and walk to the temple.'],
  ['Grand Palace',photo('grand-palace'),'Culture','iconic',13.75,100.4913,'Gleaming roofs and intricate courtyards in the ceremonial heart of Bangkok. Check dress requirements before visiting.','2–3 hours','Paid entry','Morning','River boat to Tha Chang, then walk.','Traffic is busy; use an authorized nearby parking area.'],
  ['Talat Noi',photo('talat-noi'),'Culture','hidden',13.7348,100.513,'Street art, old shophouses, and riverside cafés make a neighborhood made for wandering.','2 hours','Free to explore','Afternoon','MRT to Hua Lamphong, then walk.','Park in a public lot near River City and continue on foot.'],
  ['Bang Krachao',photo('bang-krachao'),'Adventure','hidden',13.694,100.567,'Cycle leafy lanes on Bangkok’s green river bend, with a very different pace from the city.','Half day','Bike rental extra','Morning','Take a local ferry from Khlong Toei pier; rent a bicycle on arrival.','Park near the ferry pier and cross on foot.'],
 ]),
 ...destination('Philippines','Cebu',[
  ['Kawasan Falls',images.cebu,'Adventure','iconic',9.8025,123.374,'Turquoise pools and a lush river canyon. Use an accredited guide for canyoning and check weather conditions.','Half day','Paid entry / guide','Morning','Bus from Cebu South Bus Terminal to Badian, then local transport.','Arrange a driver to Badian and use designated parking.'],
  ['Basilica del Santo Niño',photo('basilica-santo-nino'),'Culture','iconic',10.2944,123.9018,'A living place of worship at the heart of Cebu’s history, close to Magellan’s Cross.','1–2 hours','Free','Morning','City jeepney or taxi to the downtown basilica area.','Use nearby public parking and walk.'],
  ['Bojo River',photo('bojo-river'),'Nature','hidden',10.2095,123.548,'A community-led river experience through mangroves and coastal scenery in Aloguinsan.','2–3 hours','Guided visit paid','Daytime','Arrange a local guide and transport to Aloguinsan ahead of time.','Drive west to Aloguinsan and meet your guide at the visitor point.'],
  ['Osmeña Peak',photo('osmena-peak'),'Adventure','hidden',9.8209,123.4425,'A short climb with a big reward: rolling limestone hills and wide views over southern Cebu.','2 hours','Paid entry / guide','Clear early morning','Bus to Dalaguete, then arrange local transport to the trailhead.','Arrange a driver to the designated trailhead; mountain roads are steep.'],
 ]),
];
export const heroSlides = [
  { image: '/images/places/2e6ae6a7426d0b9ec20eb39d.jpg', label: 'Marina Bay, Singapore', credit: {label:'Supanut Arunoprayote · CC BY 4.0',url:'https://commons.wikimedia.org/wiki/File:Marina_Bay_Sands_(I).jpg'} },
  { image: '/images/hero-machu-picchu.jpg', label: 'Machu Picchu, Peru' },
  { image: '/images/hero-tokyo.jpg', label: 'Tokyo, Japan' },
  { image: '/images/hero-paris.jpg', label: 'Paris, France' },
  { image: images.bali, label: 'Bali, Indonesia' },
  { image: '/images/hero-new-york.jpg', label: 'New York, USA' },
  { image: images.hero, label: 'Kyoto, Japan' },
  { image: images.rome, label: 'Rome, Italy' },
  { image: images.swiss, label: 'Interlaken, Switzerland' },
  { image: images.bangkok, label: 'Bangkok, Thailand' },
];
export const destinations = [...new Set(places.map(p => p.country))].map(country => ({country, cities: [...new Set(places.filter(p => p.country === country).map(p => p.city))]}));
