import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='data/sources/world-expansion';mkdirSync(root,{recursive:true});mkdirSync('data/tools/duckdb',{recursive:true});
const headers={'User-Agent':'RoamItinerary/1.0 (public places import tooling)'};
for(const [url,path] of [['https://stac.overturemaps.org/catalog.json',`${root}/overture-catalog.json`],['https://stac.overturemaps.org/latest.ddb',`${root}/overture.ddb`]]){
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`${response.status}: ${url}`);writeFileSync(path,Buffer.from(await response.arrayBuffer()));
}
if(!existsSync('data/tools/duckdb/duckdb.exe')){
 if(process.platform!=='win32')throw new Error('Install the official DuckDB CLI for your platform and run the generated SQL file. The bundled download helper currently targets Windows.');
 const response=await fetch('https://api.github.com/repos/duckdb/duckdb/releases/latest',{headers});if(!response.ok)throw new Error('Could not locate the official DuckDB release.');const release=await response.json();
 const asset=release.assets.find(asset=>asset.name===`duckdb-cli-windows-${process.arch==='arm64'?'arm64':'amd64'}.tar.gz`);if(!asset)throw new Error('No matching DuckDB CLI asset.');
 const download=await fetch(asset.browser_download_url,{headers,signal:AbortSignal.timeout(180000)});if(!download.ok)throw new Error(`Tool download returned ${download.status}`);
 const bytes=Buffer.from(await download.arrayBuffer()),digest=createHash('sha256').update(bytes).digest('hex');
 if(asset.digest&&asset.digest!==`sha256:${digest}`)throw new Error('DuckDB archive checksum mismatch.');
 writeFileSync('data/tools/duckdb.tar.gz',bytes);const result=spawnSync('tar',['-xf','data/tools/duckdb.tar.gz','-C','data/tools/duckdb'],{stdio:'inherit',windowsHide:true});if(result.status!==0)throw new Error('Tool extraction failed.');
 writeFileSync(`${root}/duckdb-tool.json`,JSON.stringify({version:release.tag_name,sourceUrl:asset.browser_download_url,sha256:digest},null,2));
}
console.log('Overture catalog and workspace-local DuckDB CLI are ready.');
