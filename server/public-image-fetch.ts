import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import http from 'node:http';
import https from 'node:https';
const cache=new Map<string,{expires:number;addresses:{address:string;family:number}[]}>();
function publicAddress(address:string){if(isIP(address)===4){const n=address.split('.').map(Number);return n[0]>0&&n[0]!==10&&n[0]!==127&&n[0]<224&&!(n[0]===169&&n[1]===254)&&!(n[0]===192&&(n[1]===168||n[1]===0))&&!(n[0]===172&&n[1]>=16&&n[1]<=31)&&!(n[0]===100&&n[1]>=64&&n[1]<=127)&&!(n[0]===198&&(n[1]===18||n[1]===19));}return /^[23]/i.test(address)&&!address.toLowerCase().startsWith('2001:db8:');}
export async function publicImage(urlString:string,redirects=0):Promise<Buffer>{
 // Public accessibility is not permission. This app's import policy currently
 // supports only individually verified Wikimedia photographs.
 if(!['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(urlString).hostname))throw new Error('Photo reuse evidence required; venue, news and image-search downloads are disabled.');
 const url=new URL(urlString);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port)||isIP(url.hostname)||url.hostname==='localhost'||/\.(local|internal|lan|home)$/i.test(url.hostname))throw new Error('Non-public image URL');
 let entry=cache.get(url.hostname);if(!entry||entry.expires<Date.now()){const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('Non-public image address');entry={addresses,expires:Date.now()+300000};cache.set(url.hostname,entry);}const addresses=entry.addresses;
 return new Promise((resolve,reject)=>{const transport=url.protocol==='https:'?https:http;const req=transport.get(url,{headers:{'User-Agent':'RoamItinerary/1.0 (http://localhost:3001; exact-location photograph research)','Accept':'image/jpeg,image/png,image/webp,image/*;q=0.8'},lookup:((_host:string,options:any,callback:any)=>{if(options?.all)callback(null,addresses);else callback(null,addresses[0].address,addresses[0].family);}) as any},res=>{
  if(res.statusCode&&res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();if(redirects>=3)return reject(new Error('Too many redirects'));publicImage(new URL(res.headers.location,url).href,redirects+1).then(resolve,reject);return;}
  if(res.statusCode!==200||!/^image\/(jpeg|png|webp)/.test(String(res.headers['content-type']||''))||Number(res.headers['content-length']||0)>3000000){res.resume();reject(new Error('Image unavailable or unsupported'));return;}
  const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>3000000){res.destroy();reject(new Error('Image too large'));}else chunks.push(chunk);});res.on('end',()=>{if(size<2000)reject(new Error('Image is too small'));else resolve(Buffer.concat(chunks));});res.on('error',reject);
 });req.setTimeout(8000,()=>req.destroy(new Error('Image request timed out')));req.on('error',reject);});
}
