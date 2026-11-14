import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays, departureFor, inclusiveDays} from '../src/stay-dates';

test('arrival and departure count as inclusive travel days',()=>{
 assert.equal(inclusiveDays('2026-11-14','2026-11-18'),5);
 assert.equal(inclusiveDays('2026-11-14','2026-11-14'),1);
 assert.equal(departureFor('2026-11-14',5),'2026-11-18');
});

test('date ranges work across months, years, and leap days',()=>{
 assert.equal(inclusiveDays('2026-12-31','2027-01-02'),3);
 assert.equal(inclusiveDays('2028-02-28','2028-03-01'),3);
 assert.equal(addDays('2028-02-28',2),'2028-03-01');
});

test('invalid and reversed ranges do not produce a stay length',()=>{
 assert.equal(inclusiveDays('2026-11-18','2026-11-14'),0);
 assert.equal(inclusiveDays('','2026-11-14'),0);
 assert.equal(departureFor('',5),'');
});
