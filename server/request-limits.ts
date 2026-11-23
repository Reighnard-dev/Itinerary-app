/** Bounded per-instance burst limits; provider quotas cap spend across instances. */
export function createWindowLimiter(max:number,windowMs:number,now=Date.now){
 const entries=new Map<string,{count:number;until:number}>();
 return {allow(key:string){const time=now();for(const [id,v] of entries)if(v.until<=time)entries.delete(id);
 let entry=entries.get(key);if(!entry){if(entries.size>=10000)return false;entry={count:0,until:time+windowMs};entries.set(key,entry);}
 if(entry.count>=max)return false;entry.count++;return true;}};
}
