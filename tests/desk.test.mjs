import test from 'node:test';
import assert from 'node:assert/strict';
import {PROCEDURES} from '../src/domain/model.js';
import {NEXT_STEPS,PAPER_CHECKS,nextStepIds,sanitizePaper,sanitizeRecent} from '../src/domain/desk.js';

test('next steps only open procedures that already exist',()=>{
  const ids=new Set(PROCEDURES.map(p=>p.id));
  assert.equal(Object.keys(NEXT_STEPS).length,PROCEDURES.length);
  for(const [from,steps] of Object.entries(NEXT_STEPS)){
    assert.ok(ids.has(from),from);
    assert.ok(steps.length>=1&&steps.length<=3);
    assert.equal(new Set(steps).size,steps.length);
    for(const id of steps)assert.ok(ids.has(id),id);
    assert.deepEqual(nextStepIds(from),steps);
  }
});
test('paper checks and recent procedures reject values outside the logbook',()=>{
  assert.equal(new Set(PAPER_CHECKS.map(item=>item.id)).size,PAPER_CHECKS.length);
  assert.deepEqual(sanitizePaper(['copied','time']),['copied','time']);
  assert.deepEqual(sanitizePaper([]),[]);
  assert.throws(()=>sanitizePaper(['copied','copied']),/종이/);
  assert.throws(()=>sanitizePaper(['wounds']),/종이/);
  assert.deepEqual(sanitizeRecent(['question','area']),['question','area']);
  assert.throws(()=>sanitizeRecent(['scenario-oracle']),/최근/);
});
