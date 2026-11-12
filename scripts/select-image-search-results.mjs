export default function select(raw,p){
 const norm=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const stop=new Set(['the','a','an','and','of','de','del','la','le','di','da','do','at','in','restaurant','restaurants','cafe','bar','pub']);
 const core=norm(p.name.replace(/\([^)]*\)/g,'')).split(' ').filter(t=>t.length>1&&!stop.has(t)),full=norm(p.name.replace(/\([^)]*\)/g,''));
 const localNames=[...p.name.matchAll(/\(([^)]+)\)/g)].map(m=>norm(m[1])).filter(n=>n.length>=3&&/[^\u0000-\u024f ]/.test(n));
 if(!core.length&&full.length<4&&!localNames.length)return [];
 const hasPhrase=(text,phrase)=>(' '+norm(text)+' ').includes(' '+phrase+' ');
 const aliases={'Ho Chi Minh City':['ho chi minh','saigon'],'New York City':['new york','nyc'],'George Town':['george town','penang'],Zurich:['zurich','zuerich'],Rome:['rome','roma'],Cebu:['cebu'],'El Nido':['el nido']};
 const cities=aliases[p.city]||[norm(p.city.replace(/ city$/i,''))];
 const includesTokens=text=>{const words=new Set(norm(text).split(' ').map(w=>w.length>4?w.replace(/s$/,''):w));return core.filter(w=>words.has(w.length>4?w.replace(/s$/,''):w)).length/Math.max(1,core.length)>=.8;};
 const matchesName=text=>includesTokens(text)||localNames.some(n=>norm(text).includes(n));
 const found=[];
 for(const block of raw.split(/-{30,}/)){
  const first=block.trim().split('\n')[0],line=first?.match(/^(.*?)\s+\((https?:\/\/.+)\)\s*$/),image=block.match(/Image URL:\s*(https?:\/\/\S+)/);if(!line||!image)continue;
  const url=image[1].replace(/#$/,''),caption=(block.slice(image.index+image[0].length).split('\n')[0]||'').replace(/^#\s*/,'').trim(),title=line[1],sourceUrl=line[2],proof=title+' '+sourceUrl+' '+url+' '+caption;
  const meaningful=core.length>=2||core.some(t=>t.length>=7);if(meaningful?!matchesName(proof):!(hasPhrase(proof,full)||localNames.some(n=>norm(proof).includes(n))))continue;
  if(!cities.some(c=>norm(block).includes(norm(c))))continue;
  // A city can contain many branches of the same chain. Require address evidence
  // for an otherwise unqualified chain name before attaching a branch photograph.
  if(/^(starbucks|mcdonalds|burger king|kfc|jollibee|subway|pizza hut|dominos|dunkin|7 eleven|hard rock cafe|din tai fung|tim ho wan)$/.test(full)){
   const addressWords=norm(p.address||'').split(' ').filter(t=>t.length>2&&!new Set(['street','road','avenue','floor','unit','building']).has(t));
   const evidence=norm(block);if(!addressWords.length||addressWords.filter(w=>evidence.includes(w)).length/Math.max(1,addressWords.length)<.6)continue;
  }
  if(/\b(logo|maps?|directions|drawing|illustration|rendering|painting|postcard|portrait|headshot|menu|menus|dishes|poster|infographic|advertisement)\b/.test(norm(caption+' '+url))||/\b(closed|permanently closed)\b/.test(norm(title)))continue;
  const venue=/\b(interior|exterior|facade|entrance|building|dining|room|garden|park|beach|landscape|waterfall|temple|museum|courtyard|storefront|terrace|restaurant|market|view|hall|bridge)\b/.test(norm(caption));
  const scene=norm(caption+' '+block.slice(image.index+image[0].length).split('\n\n')[1]);
  if((p.category==='Restaurants'||p.category==='Food & drink')&&!/\b(interior|exterior|facade|entrance|building|doorway|dining room|dining area|storefront|terrace|courtyard|seating|booths|kitchen|queue|counter|bar area|restaurant front|front door)\b/.test(scene))continue;
  if((p.category==='Restaurants'||p.category==='Food & drink')&&/\b(plate|dish|bowl|meal|pizza|dumplings|sushi|coffee|cocktail|dessert)\b/.test(norm(caption))&&!/\b(interior|exterior|facade|entrance|room|storefront|terrace|dining|building)\b/.test(norm(caption)))continue;
  const imageHost=url.match(/^https?:\/\/([^\/?#:]+)/i),sourceHost=sourceUrl.match(/^https?:\/\/([^\/?#:]+)/i);if(!imageHost||!sourceHost||imageHost[1]==='localhost'||url.length>2000||sourceUrl.length>2000)continue;
  if(/(gettyimages|alamy|shutterstock|adobestock|dreamstime|123rf|istockphoto|depositphotos|pinterest|pinimg|ytimg|youtube)/i.test(imageHost[1]+' '+sourceHost[1]))continue;
  const score=(matchesName(title)?5:0)+(matchesName(caption)?4:0)+(cities.some(c=>norm(title).includes(norm(c)))?3:0)+(venue?3:0);
  found.push({url,sourceUrl,title:(caption||title).slice(0,500),sourceTitle:title,author:`Photo source: ${sourceHost[1].replace(/^www\./,'')}`,license:'Source image — rights retained',licenseUrl:sourceUrl,match:'Named place and destination matched in image-search source and caption',provider:'web',score});
 }
 return found.sort((a,b)=>b.score-a.score).slice(0,6);
}
