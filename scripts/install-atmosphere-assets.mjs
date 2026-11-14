import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const inputs=JSON.parse(readFileSync('research/rights/atmosphere-generation-inputs.json','utf8'));
const assets=inputs.map(({key,prompt})=>{const url=`/images/atmosphere/${key}.jpg`;return {key,url,sha256:createHash('sha256').update(readFileSync('public'+url)).digest('hex'),provenance:'Generated for Roam using the built-in image-generation tool',prompt,generatedAt:new Date().toISOString(),disclosure:'AI-generated atmosphere; fictional scene, not a photograph of the named place'};});
writeFileSync('shared/atmosphere-assets.json',JSON.stringify(assets,null,2)+'\n');
console.log(JSON.stringify({generatedAtmosphereAssets:assets.length}));
