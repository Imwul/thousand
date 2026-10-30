import test from 'node:test';
import assert from 'node:assert/strict';
import {runProcedure,runHackReroll} from '../src/generators/procedures.js';
import {defaultContext} from '../src/domain/model.js';
function seq(...pairs){let i=0;return ()=>{assert.ok(i<pairs.length,'Unexpected extra die');const[s,v]=pairs[i++];return(v-.5)/s;};}
const make=(id,options,context,rng)=>runProcedure(id,{campaignId:'test',options,context:{...defaultContext(),...context},rng});
test('water exploration skips terrain and exhausted known threats',()=>{
  const r=make('hex',{}, {biome:10,knownThreats:false},seq([10,3]));assert.equal(r.trace.length,1);assert.equal(r.trace[0].id,'planetside');
});
test('easy terrain suppresses combat without revealing a hidden creature',()=>{
  const r=make('hex',{}, {biome:2,terrain:4},seq([20,1],[10,6],[10,1]));
  assert.ok(!r.trace.some(t=>t.id==='biome-activity-check'||t.id==='encounter-difficulty'));assert.ok(r.items.some(i=>i.text==='순탄한 길이므로 전투 조우를 적용하지 않음'));
});
test('inhabited terrain forces local fauna and does not reuse an incompatible indoor slot',()=>{
  const r=make('hex',{}, {biome:2,terrain:2,knownThreats:false,hazard:4,slots:['Guardian','','','']},seq([20,1],[4,1],[20,1],[20,10],[10,3]));
  assert.ok(r.items.some(i=>i.title==='생물 유형'&&i.key==='Local Fauna'&&i.text==='토착 생물(Local Fauna)'));assert.ok(!r.items.some(i=>i.title==='생물 유형'&&i.key==='Aberration'));
});
test('the ambiguous printed emotion branch stops for a human choice',()=>{
  const r=make('emotion',{moodDepth:3},{},seq([8,8],[8,2]));assert.equal(r.trace.length,2);assert.ok(r.notes.some(n=>n.includes('모두 1–2')));
});
test('hacking rerolls exactly one selected die and preserves the first record',()=>{
  const first=make('hacking',{hackingDifficulty:3},{},seq([6,1],[6,4],[6,6])),snapshot=structuredClone(first);
  const second=runHackReroll(first,0,{rng:seq([6,2])});assert.deepEqual(first,snapshot);assert.deepEqual(second.hacking.values,[2,4,6]);assert.equal(second.parentId,first.id);assert.equal(second.trace.length,1);
});
test('successful reaction avoids all combat setup dice',()=>{
  const r=make('combat-start',{}, {},seq([10,9]));assert.equal(r.trace.length,1);assert.ok(!r.items.some(i=>i.tableId==='cover'));
});
test('alternate routes resolve security and artifact activation follows the talent branch',()=>{
  const route=make('alternate',{}, {},seq([10,6],[10,1]));assert.ok(route.items.some(i=>i.tableId==='security'));
  const artifact=make('artifact-activate',{}, {},seq([12,7],[100,1]));assert.ok(artifact.items.some(i=>i.tableId==='talents'));
});
test('custom dice expressions calculate terms without evaluating executable input',()=>{
  const r=make('dice',{diceExpression:'2d10+5'},{},seq([10,3],[10,4]));assert.equal(r.headline,'12');
  const p=make('dice',{diceExpression:'d100×3'},{},seq([100,7]));assert.equal(p.headline,'21');
  for(const s of ['fetch("x")','process.exit()','101d6','d1','d20*9999'])assert.throws(()=>make('dice',{diceExpression:s},{},()=>.5));
});
test('named sites keep leading zeros and the original out-of-order 94 and 95 labels',()=>{
  const r=make('site-name',{}, {},seq([100,94],[100,95],[100,9]));assert.equal(r.headline,'Xat-pha-056900');
});
test('a negative creature attack modifier has one sign',()=>{
  let seed=9001+29*37;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const r=make('creature',{species:'Local Fauna',tier:'standard',randomIntelligence:true,aquatic:true},{crew:5},rng);
  assert.match(r.items.find(i=>i.title==='공격과 피해').text,/^공격 -3 \/ /);
});
