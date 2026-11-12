export default async function runBatch(tools,text,notify,count=90){
 const input=await tools.exec_command({cmd:`node scripts/missing-photo-list.mjs --single-pending ${count}`,max_output_tokens:30000});const state=JSON.parse(input.output);
 let next=0,finished=0;const started=Date.now();
 async function worker(){while(next<state.items.length){const place=state.items[next++];try{
  const result=await tools.web__run({image_query:[{q:`${place.name} ${place.city} ${place.country} actual location exterior interior ${place.address||''}`}],response_length:'short'});
  await tools.apply_patch(`*** Begin Patch\n*** Add File: data/sources/image-search/${place.id}.json\n+${JSON.stringify({place,result})}\n*** End Patch`);
  finished++;if(finished%15===0)notify({checked:state.checked+finished,total:state.total,seconds:Math.round((Date.now()-started)/1000)});
 }catch(error){notify({place:place.name,error:String(error).slice(0,120)});}}}
 await Promise.all(Array.from({length:16},()=>worker()));
 text(await tools.exec_command({cmd:'node scripts/assemble-image-search-batches.mjs',max_output_tokens:1000}));
 text({checked:state.checked+finished,total:state.total,remaining:state.remaining-finished,seconds:Math.round((Date.now()-started)/1000)});
}
