import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWindowLimiter} from '../server/request-limits.js';
test('rate limiter isolates clients, caps bursts, and expires windows',()=>{let now=0;const gate=createWindowLimiter(2,100,()=>now);assert.ok(gate.allow('a'));assert.ok(gate.allow('a'));assert.equal(gate.allow('a'),false);assert.ok(gate.allow('b'));now=100;assert.ok(gate.allow('a'));});
