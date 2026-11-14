import {existsSync,mkdirSync,createReadStream,createWriteStream,writeFileSync,statSync} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const directory='data/sources/world-expansion';mkdirSync(directory,{recursive:true});
const archive=`${directory}/enwikivoyage.xml.bz2`,url='https://dumps.wikimedia.org/enwikivoyage/latest/enwikivoyage-latest-pages-articles.xml.bz2';
if(!existsSync(archive)||process.argv.includes('--refresh')){
 const response=await fetch(url,{headers:{'User-Agent':'RoamItinerary/1.0 (attributed travel-guide import)'},signal:AbortSignal.timeout(300000)});
 if(!response.ok||!response.body)throw new Error(`Guide dump returned ${response.status}`);
 await pipeline(Readable.fromWeb(response.body),createWriteStream(archive));
}
const hash=createHash('sha256');for await(const chunk of createReadStream(archive))hash.update(chunk);
writeFileSync(`${directory}/guide-source.json`,JSON.stringify({sourceUrl:url,bytes:statSync(archive).size,sha256:hash.digest('hex'),checkedAt:new Date().toISOString()},null,2));
if(!existsSync(`${directory}/enwikivoyage.xml`)||process.argv.includes('--refresh')){
 await new Promise((resolve,reject)=>{const child=spawn('7z',['x',archive,`-o${directory}`,'-y'],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`7-Zip returned ${code}`)));});
}
console.log('Guide dump ready. Run npm run data:expanded-guides.');
