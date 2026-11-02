import test from 'node:test';
import assert from 'node:assert/strict';
import {tables,tableList} from '../src/data/tables.js';
import {diceDomain,lookup} from '../src/generators/dice.js';
import {runProcedure,runLockAttempt} from '../src/generators/procedures.js';
import {ODDS,defaultContext,defaultOptions,endScene,PROCEDURES} from '../src/domain/model.js';
import {makeBackup,validateBackup} from '../src/storage/store.js';

function seq(...pairs){let i=0;const f=()=>{assert.ok(i<pairs.length,'A branch consumed an unexpected die');const [s,v]=pairs[i++];return (v-.5)/s;};f.used=()=>i;return f;}
function seeded(seed=123){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const make=(id,options={},context={},rng=seeded())=>runProcedure(id,{campaignId:'test',options,context:{...defaultContext(),...context},rng});

test('all 265 core-play tables are present; all rollable tables partition their dice domains',()=>{
  assert.equal(tableList.length,265);
  for(const t of tableList){if(t.rollable!==false)for(const n of diceDomain(t.dice))assert.ok(lookup(t,n),`${t.id} ${n}`);assert.ok([t.page].flat().every(p=>p>=1&&p<=408));}
  assert.equal(tables.action.rows.length,100);assert.equal(tables.theme.rows.length,100);
  assert.equal(tables.action.rows[99].en,'Help');assert.equal(tables.theme.rows[99].en,'Enterprise');
});
test('all prediction thresholds, natural 1 and 20, follow the supplied D20 table',()=>{
  for(const odds of ODDS)for(let value=1;value<=20;value++){
    const r=make('question',{odds:odds.id,qualifier:false},{},seq([20,value]));
    assert.equal(r.tone,value>=odds.threshold?'positive':'negative');
    if(value===1||value===20)assert.match(r.headline,/극단적/);
    assert.equal(r.trace.length,1);
  }
  assert.equal(make('question',{qualifier:false},{},seq([20,10])).tone,'positive');
});
test('a missing qualifier does not consume complication or inspiration dice',()=>{
  const rng=seq([20,10],[6,3]),r=make('question',{}, {},rng);
  assert.equal(rng.used(),2);assert.equal(r.items.length,2);
  const yes=make('question',{}, {},seq([20,18],[6,6],[6,4],[100,26],[100,36]));
  assert.match(yes.headline,/그리고/);assert.equal(yes.items.find(i=>i.tableId==='complication').roll,4);
});
test('all 64 surprise pairs use row and column, preserving neutral encounter weighting',()=>{
  const vals=[];for(let row=1;row<=8;row++)for(let col=1;col<=8;col++){
    const r=make('surprise',{details:false},{},seq([8,row],[8,col]));vals.push(r.headline);assert.equal(r.trace[0].value,row*10+col);
  }
  assert.equal(vals.filter(v=>v==='조우 · 중립적 조우').length,4);
  assert.deepEqual(diceDomain('d66').slice(0,7),[11,12,13,14,15,16,21]);
});
test('a scene without a twist does not generate or reveal an event',()=>{
  const r=make('scene',{}, {twist:3},seq([6,4]));assert.equal(r.items.length,1);assert.equal(r.trace.length,1);
  const t=make('scene',{details:false},{twist:1},seq([6,1],[8,6],[8,2]));assert.match(t.subline,/NPC · 행동의 변화/);
  assert.equal(endScene({...defaultContext(),twist:3},false).twist,3);assert.equal(endScene(defaultContext(),true).twist,1);
});
test('fatal or absent arrival stops before site generation; known destinations reject low rolls',()=>{
  for(const n of [1,2,3,15])assert.equal(make('arrival',{}, {},seq([100,n])).trace.length,1);
  const r=make('arrival',{known:true}, {},seq([100,1],[100,80],[20,5],[10,4],[12,8],[100,90],[4,1],[6,2],[8,3],[4,2],[4,4]));
  assert.equal(r.trace[0].discarded,true);assert.equal(r.adopt.location,'space');assert.equal(r.adopt.slots.length,4);
  assert.match(r.items.find(i=>i.title==='Site Report 준비').text,/자원 12 \/ 유물 14/);
  assert.equal(r.trace.filter(t=>t.id==='level-a').length,0);
});
test('area exploration rejects depleted results and keeps the discarded dice',()=>{
  const r=make('area',{connector:false},{resources:false,artifacts:false,hazard:8},seq([20,12],[10,3],[10,4],[10,5],[20,11]));
  assert.equal(r.trace.filter(t=>t.discarded).length,2);assert.match(r.subline,/새 구역/);assert.equal(r.trace.length,5);assert.equal(r.trace[0].id,'vertical-climb');
});
test('a hallway ambush stops before generating the next area',()=>{
  const r=make('area',{}, {},seq([20,1],[100,10],[4,1],[20,1],[6,1],[20,10]));
  assert.equal(r.tone,'danger');assert.ok(!r.trace.some(t=>t.id==='exploration'));assert.equal(r.encounter.slot,1);
});
test('artifacts get one appearance each and no premature appraisal',()=>{
  const r=make('area',{connector:false},{},seq([10,4],[4,3],[20,1],[20,2],[20,3]));
  assert.equal(r.items.filter(i=>i.tableId==='artifact').length,3);assert.ok(!r.trace.some(t=>t.id==='artifact-value'));
});
test('an existing creature slot is reused, and five-person composition stays five-person',()=>{
  const c={...defaultContext(),crew:5,presentCrew:2,slots:['아카이브 수호자','','','']};
  const r=make('area',{connector:false},c,seq([10,1],[4,1],[20,20],[20,20]));
  assert.match(r.subline,/아카이브 수호자 · 보통 10 \+ 쉬움 20/);assert.ok(!r.trace.some(t=>t.id.startsWith('creature-')));
});
test('locked doors stop before guessing, and firewall boundaries always fail',()=>{
  const r=make('door',{}, {},seq([10,10],[10,3],[10,7]));
  assert.equal(r.trace.length,3);assert.deepEqual(r.pending,{type:'lock',lo:3,hi:7,secure:false});
  for(const guess of ['inside','outside'])for(const value of [3,7]){
    const a=runLockAttempt(r,guess,{rng:seq([10,value])});assert.equal(a.tone,'negative');assert.ok(a.pending);assert.equal(a.trace.length,1);
  }
  const s=runLockAttempt(r,'inside',{rng:seq([10,4],[100,99])});assert.equal(s.tone,'positive');assert.ok(!s.pending);assert.ok(!s.trace.some(t=>t.id==='behind-door'));
});
test('secure doors use the worse access node, and ground-level vacuum is rerolled after opening',()=>{
  const d=make('door',{}, {location:'planet'},seq([10,4],[10,3],[10,7]));
  const fail=runLockAttempt(d,'inside',{rng:seq([10,5],[10,9])});assert.equal(fail.tone,'negative');
  const opened=runLockAttempt(d,'inside',{rng:seq([10,4],[10,6],[100,1],[4,1],[4,2])});
  assert.equal(opened.tone,'positive');assert.ok(opened.trace.find(t=>t.id==='behind-door'&&t.discarded));assert.match(opened.items.at(-1).text,/부식성/);
});
test('NPC behavior comes from the matching attitude table',()=>{
  const r=make('npc',{details:false},{},seq([6,5],[10,3],[10,9]));assert.equal(r.items[1].tableId,'npc-friendly');assert.match(r.headline,/도움/);
});
test('week one is a 20% event and 40% arrival check; solo social events convert',()=>{
  const r=make('travel',{}, {},seq([100,21],[100,40]));assert.equal(r.headline,'목적지 도착');assert.equal(r.trace.length,2);
  const s=make('travel',{week:2},{},seq([100,40],[4,1],[10,1],[100,51]));
  assert.ok(s.trace.some(t=>t.id==='travel-issue'));assert.ok(!s.trace.some(t=>t.id==='travel-social'));assert.equal(s.headline,'항해 계속');
});
test('security table numbering follows the table names, not the mismatched prose numbering',()=>{
  assert.equal(tables.security.rows[1].text,'가연성 가스');assert.equal(tables.security.rows[8].text,'순간이동');
  const r=make('area',{connector:false},{presentCrew:3},seq([10,8],[10,9],[10,1],[10,4],[10,10]));
  assert.equal(r.trace.filter(t=>t.id==='teleport').length,3);
});
test('all procedure outputs round trip without losing trace, context or original content',()=>{
  const c={id:'test',name:'Test',createdAt:new Date().toISOString(),context:defaultContext(),options:defaultOptions()};
  const records=PROCEDURES.flatMap(p=>Array.from({length:30},(_,i)=>make(p.id,{}, {},seeded(17+i*23))));
  const backup=makeBackup([c],records);assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))),backup);
});
