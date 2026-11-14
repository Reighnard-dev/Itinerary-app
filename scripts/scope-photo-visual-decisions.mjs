import {readFileSync,writeFileSync} from 'node:fs';
const root='research/rights/full-photo-recovery',file=root+'/visual-decisions.json',decisions=JSON.parse(readFileSync(file,'utf8'));
const rows=readFileSync(root+'/outcomes.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
for(const [id,value] of Object.entries(decisions)){if(typeof value!=='string')continue;const original=rows.find(r=>r.id===id&&r.status==='imported'&&r.photo);if(!original)throw new Error('Missing reviewed image '+id);decisions[id]={reason:value,sourceUrl:original.photo.sourceUrl};}
writeFileSync(file,JSON.stringify(decisions,null,2)+'\n');console.log(JSON.stringify({scopedDecisions:Object.keys(decisions).length}));
