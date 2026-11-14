import {writeFileSync} from 'node:fs';
import {load} from 'cheerio';
const urls=['https://www.vietnamairlines.com/la/en/plan-book/travel/travel-guide/sapa-attractions','https://en.wikivoyage.org/wiki/Sa_Pa'];
for(let i=0;i<urls.length;i++){const r=await fetch(urls[i]);const html=await r.text();writeFileSync(`data/sapa/source-${i}.html`,html);const $=load(html);console.log(i, $('h2,h3').map((_,e)=>$(e).text()).get());console.log($('img').map((_,e)=>({alt:$(e).attr('alt'),src:$(e).attr('src')})).get().filter(x=>/sapa|fansipan|cat.cat|waterfall|valley|village|rong|church|lake|market/i.test(x.alt||'')));}
