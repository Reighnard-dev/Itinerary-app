import {readFileSync,writeFileSync} from 'node:fs';
// Reviewed archival views and artwork do not show these destinations as they
// look to today's visitor. Queue them again for a contemporary location photo.
const ids=new Set(['guide-gb-a34fe51515a75c3f88df','guide-de-5ba6d3cc1e1927b338e9','guide-de-2c232612da13d35aa4bd','guide-de-cf67b25ac1b371d2ffa4','guide-us-0e7cc4803d39da6737bf','guide-br-6c7bd0814a992b8ba0d2','guide-au-bfd3da64bd732da418eb','guide-id-ea3b3680ec006f56397d','guide-de-ae0077c5698f7d59d02d']);
const review={};
for(const file of ['shared/place-images.json','shared/entity-photo-candidates.json']){const m=JSON.parse(readFileSync(file,'utf8'));for(const [id,p] of Object.entries(m)){if(ids.has(id)||/^Argyle Cutting, The Rocks, Sydney/.test(p.title)){review[id]={photo:p,reason:'Archival photograph or artwork; researching a contemporary location view'};delete m[id];}}writeFileSync(file,JSON.stringify(m));}
writeFileSync('data/photo-review/archival-views.json',JSON.stringify(review));console.log(JSON.stringify({removed:Object.keys(review).length}));
