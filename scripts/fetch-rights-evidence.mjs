import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='research/rights/upstream';mkdirSync(root,{recursive:true});
const evidence=[];
async function save(url,file,binary=false){
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`${url}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!binary&&!/permission|license|copyright/i.test(bytes.toString()))throw new Error(`Not a license: ${url}`);
 writeFileSync(file,bytes);evidence.push({url,file,sha256:createHash('sha256').update(bytes).digest('hex'),retrievedAt:new Date().toISOString()});
}
for(const [family,name,file] of [['dmsans','DM-Sans','DMSans[opsz,wght].ttf'],['manrope','Manrope','Manrope[wght].ttf']]){
 const metadata=await fetch(`https://api.github.com/repos/google/fonts/commits?path=ofl/${family}&per_page=1`).then(r=>{if(!r.ok)throw new Error(`GitHub: ${r.status}`);return r.json();});
 const base=`https://raw.githubusercontent.com/google/fonts/${metadata[0].sha}/ofl/${family}/`;
 await save(base+encodeURIComponent(file),`public/fonts/${family}-variable.ttf`,true);
 await save(base+'OFL.txt',`public/licenses/${name}-OFL.txt`);
 writeFileSync(`public/fonts/${name}-OFL.txt`,readFileSync(`public/licenses/${name}-OFL.txt`));
}
const sources={
 '@esbuild/win32-x64':['https://raw.githubusercontent.com/evanw/esbuild/v0.28.2/LICENSE.md','esbuild.txt'],
 '@rollup/rollup-win32-x64-gnu':['https://raw.githubusercontent.com/rollup/rollup/v4.68.2/LICENSE.md','rollup.txt'],
 '@rollup/rollup-win32-x64-msvc':['https://raw.githubusercontent.com/rollup/rollup/v4.68.2/LICENSE.md','rollup-msvc.txt'],
 '@tailwindcss/oxide-wasm32-wasi':['https://raw.githubusercontent.com/tailwindlabs/tailwindcss/v4.3.5/LICENSE','tailwind-oxide.txt'],
 '@napi-rs/wasm-runtime':['https://raw.githubusercontent.com/napi-rs/napi-rs/main/LICENSE','napi-wasm.txt'],
 '@tybys/wasm-util':['https://raw.githubusercontent.com/toyobayashi/wasm-util/master/LICENSE','tybys-wasm.txt'],
 'boolbase':['https://raw.githubusercontent.com/fb55/boolbase/master/LICENSE','boolbase.txt'],
};
const supplements={};
for(const [name,[url,file]] of Object.entries(sources)){
 try{await save(url,`${root}/${file}`);supplements[name]={file:`${root}/${file}`,url};}
 catch(error){console.error(String(error));}
}
writeFileSync('research/rights/software-supplements.json',JSON.stringify(supplements,null,2)+'\n');
writeFileSync('research/rights/upstream-evidence.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({evidence:evidence.length,softwareSupplements:Object.keys(supplements).length}));
