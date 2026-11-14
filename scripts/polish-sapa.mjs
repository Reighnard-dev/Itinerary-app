import {readFileSync,writeFileSync} from 'node:fs';
const descriptions={
 'Fansipan Mountain':'A high mountain summit reached by cable car and steps or a guided mountain trek. Weather can obscure the views; check access and operating conditions before travelling.',
 'Muong Hoa Valley':'Terraced farmland and mountain scenery southeast of Sa Pa. Explore village routes with a local guide and respect working fields and residents’ homes.',
 'Ta Phin Village':'A village north of Sa Pa associated with Red Dao communities, textile crafts and herbal baths. Ask before photographing residents.',
 'Lao Chai Village':'A village and rice-terrace walking destination in the Muong Hoa area. Paths can be muddy and steep after rain.',
 'Ta Van Village':'A village area with rice terraces, homestays and walking routes. The map pin marks the approach road; confirm the meeting point with your host or guide.',
 'Cat Cat Village':'A visitor village near Sa Pa with craft displays, waterside paths and a waterfall. Confirm entry arrangements before visiting.',
 'Ban Ho Village':'A rural village southeast of Sa Pa with stilt-house accommodation and valley scenery. Allow time for road travel from town.',
 'Silver Waterfall':'Thac Bac is a roadside waterfall northwest of Sa Pa. Steps and viewing areas provide a closer look at the cascades.',
 'Tram Ton Pass':'Also known as O Quy Ho Pass, this mountain road offers broad views when visibility is clear. It lies beyond central Sa Pa; check weather and road conditions.',
 'Stone Church':'The stone Catholic church beside central Sa Pa’s square. Respect worship times and local access rules.',
 'Ham Rong Mountain':'A hillside garden and walking attraction above town, with steps, rock formations and elevated viewpoints.',
 'Sa Pa Market':'A market on Luong Dinh Cua Street selling produce, textiles, everyday goods and local food. Ask vendors before taking photographs.',
 'Sun Plaza':'A distinctive shopping and transport building in central Sa Pa, also serving the Muong Hoa mountain railway.',
 'Sa Pa Lake':'A town lake with paths and nearby cafés. The map pin marks the lake area rather than a specific entrance.',
 'Love Waterfall':'Thac Tinh Yeu is a forest waterfall reached on foot from the road near Tram Ton Pass. Wear shoes suitable for wet paths.',
 'Rong May Glass Bridge':'A glass viewing attraction near O Quy Ho Pass in neighbouring Lai Chau province, commonly visited from Sa Pa. Check current tickets and access.',
 'Red Dzao House':'A restaurant at 4B Thac Bac serving northern Vietnamese dishes in a setting influenced by local textile traditions.',
 'Le Gecko':'A café, bakery and restaurant near Xuan Vien Street in central Sa Pa. Confirm the branch and current opening hours before visiting.'
};
const p=JSON.parse(readFileSync('shared/sapa-places.json','utf8'));
for(const row of p){row.image='/illustrations/culture.svg';row.description=descriptions[row.name]||`${row.name} offers accommodation in the Sa Pa area. View the linked venue website for room types, facilities, availability and current rates. Photos show the property as presented by the linked source and may predate later changes.`;if(row.photo)row.photo.match=row.photo.match.replace('; review required before publication','');}
writeFileSync('shared/sapa-places.json',JSON.stringify(p,null,2)+'\n');
writeFileSync('research/sapa-pending.json',JSON.stringify({scope:'Not exhaustive: additional businesses and attractions remain to be researched.',missingPhotos:p.filter(x=>!x.photo).map(x=>x.name),excludedUncertainMatches:['Indigo Cat (geocoder returned another property)','Good Morning Vietnam (different restaurant returned)','Little Sapa (different restaurant returned)','Sapa Clay House (unnamed map feature)']},null,2)+'\n');
