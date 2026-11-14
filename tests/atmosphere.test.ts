import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atmosphereFor} from '../shared/atmosphere.js';
const place={name:'Fansipan Mountain',city:'Sa Pa',category:'Nature' as const,description:'A high mountain summit.'};
test('generated atmosphere follows the location theme without claiming a real photograph',()=>{
 assert.equal(atmosphereFor(place).key,'mountain');
 assert.equal(atmosphereFor({...place,name:'Muong Hoa Valley',description:'Terraced farmland and mountain scenery.'}).key,'terraces');
 assert.equal(atmosphereFor({...place,name:'Ta Phin Village',category:'Culture',description:'A village north of Sa Pa.'}).key,'terraces');
 assert.equal(atmosphereFor({...place,name:'Coastal cove',category:'Beaches',description:''}).key,'coast');
 assert.match(atmosphereFor(place).disclosure,/AI-generated.*not a photograph/);
});
