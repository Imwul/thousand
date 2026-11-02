import test from 'node:test';
import assert from 'node:assert/strict';
import {runProcedure} from '../src/generators/procedures.js';
import {defaultContext,normalizeOptions,relatedDicePresets} from '../src/domain/model.js';
import {effectDice} from '../src/domain/followups.js';
import {reportView,optionFields,nextStepView} from '../src/components/render.js';
import {tables} from '../src/data/tables.js';
import {makeBackup,validateBackup} from '../src/storage/store.js';
import {newCampaign} from '../src/domain/model.js';
import {sourceOriginal} from '../src/components/result-fields.js';

function make(id,{faces=[],context={},options={},...extra}={}){
  let i=0;
  const run=runProcedure(id,{campaignId:'deep',context:{...defaultContext(),...context},options,...extra,rng:()=>{
    assert.ok(i<faces.length,`Unexpected roll ${i+1}`);const [sides,face]=faces[i++];return (face-.5)/sides;
  }});
  assert.equal(i,faces.length,'All specified dice must be consumed');return run;
}
const surface={location:'planet',mode:'surface',knownThreats:false};

test('pp.192–194 water never inherits an old land terrain effect or its automatic fauna',()=>{
  for(let terrain=0;terrain<=4;terrain++){
    const r=make('hex',{context:{...surface,biome:10,terrain},faces:[[10,3]]});
    assert.deepEqual(r.trace.map(t=>t.id),['planetside']);
    assert.equal(r.encounter,undefined);assert.equal(r.terrain,undefined);
    assert.equal(r.items.some(i=>['서식지 조우','생물군계별 지형 효과','전투 제한'].includes(i.title)),false);
  }
});

test('p.193 easy going blocks combat but permits p.196 close encounters',()=>{
  const options={context:{...surface,biome:2,terrain:4}};
  const combat=make('hex',{...options,faces:[[20,1],[10,6],[10,1],[10,6]]});
  assert.equal(combat.encounter,undefined);assert.ok(combat.items.some(i=>i.title==='전투 제한'));
  const sight=make('hex',{...options,faces:[[20,1],[10,6],[10,1],[10,7],[20,1]]});
  assert.equal(sight.encounter,undefined);assert.match(sight.items.find(i=>i.tableId==='close-encounter').text,/날개가 네 개/);
  assert.equal(sight.items.some(i=>i.title==='전투 제한'),false);
  const barren=make('hex',{context:{...surface,biome:1,terrain:4},faces:[[20,1],[10,6],[10,1]]});
  assert.equal(barren.encounter,undefined);assert.equal(barren.trace.some(t=>t.id==='planet-encounter'),false);
});

test('p.118 social events select distinct present crew and keep pair order for conversation',()=>{
  const r=make('travel',{context:{crew:5,presentCrew:3},faces:[[100,1],[4,1],[10,1],[3,2],[2,2],[6,1],[6,1],[12,1],[12,12],[100,100]]});
  assert.equal(r.items.find(i=>i.title==='사건 대상 대원').text,'대원 2 / 대원 3');
  assert.deepEqual(r.items.filter(i=>i.tableId==='reaction').map(i=>i.group),['첫 번째 대원의 반응','두 번째 대원의 반응']);
  const lone=make('travel',{context:{crew:3,presentCrew:1},faces:[[100,1],[4,1],[10,8],[100,100]]});
  assert.match(lone.notes.join(' '),/두 대원.*한 명/);
  assert.equal(lone.trace.some(t=>t.id==='travel-target'),false);
});

test('p.122 personal events use present crew rather than departure capacity',()=>{
  const r=make('travel',{context:{crew:5,presentCrew:2},faces:[[100,1],[4,4],[10,5],[2,2],[100,100]]});
  assert.equal(r.items.find(i=>i.title==='사건 대상 대원').text,'대원 2');
  assert.match(tables['travel-issue'].rows.find(i=>i.min===6).text,/스트레스 반응/);
  assert.doesNotMatch(tables['travel-issue'].rows.find(i=>i.min===6).text,/Reaction/);
});

test('p.199 effect rolls preserve leading constants and distinguish damage from fall distance',()=>{
  const r=make('table',{tableId:'biome-hazards-1',faces:[[10,8]]});
  assert.deepEqual(effectDice(r).map(d=>d.expression),['d20','20+d20']);
  const distance=make('dice',{options:{diceExpression:'20+d20'},faces:[[20,17]]});
  assert.equal(distance.headline,'37');
  assert.deepEqual(effectDice({items:[{text:'6−D4 / D100×3 / 2D12−D10+5'}]}).map(d=>d.expression),['6-d4','d100×3','2d12-d10+5']);
});

test('printed 1-in-4, 1-in-6 and 50% equipment/combat checks have explicit outcomes',()=>{
  for(const [preset,expression,sides,face,expected] of [
    ['burst','d4',4,1,'탄약 1개 소비'],['burst','d4',4,2,'추가 탄약 소비 없음'],
    ['turret-ammo','d6',6,1,'탄약 고갈 · 이번 임무 사용 불가'],['turret-ammo','d6',6,6,'탄약 남음'],
    ['friendly-fire','d6',6,3,'다른 대상을 맞힘'],['friendly-fire','d6',6,4,'의도한 대상을 맞힘']]){
    const r=make('dice',{options:{dicePreset:preset,diceExpression:expression},faces:[[sides,face]]});
    assert.equal(r.items.find(i=>i.title==='적용 결과').text,expected);assert.ok(reportView(r,[r]).includes(expected));
  }
});

test('p.199 lost ship search accumulates 10% per entered hex, including the 100% boundary',()=>{
  for(const [hex,face,expected] of [[1,10,'함선 발견'],[1,11,'아직 찾지 못함'],[9,90,'함선 발견'],[9,91,'아직 찾지 못함'],[10,100,'함선 발견']]){
    const r=make('dice',{options:{dicePreset:'ship-search',diceExpression:'d100',searchHexes:hex},faces:[[100,face]]});
    assert.equal(r.items.find(i=>i.title==='적용 결과').text,expected);
  }
  assert.throws(()=>normalizeOptions({searchHexes:0}));assert.throws(()=>normalizeOptions({searchHexes:11}));
  assert.match(optionFields('dice',normalizeOptions({dicePreset:'ship-search'}),defaultContext()),/name="searchHexes"/);
  const hazard=make('table',{tableId:'biome-hazards-1',faces:[[10,4]]});
  assert.ok(relatedDicePresets('hex',hazard).some(p=>p.id==='ship-search'));
  assert.match(nextStepView('hex',hazard),/data-action="dice-preset" data-id="ship-search"/);
});

test('new auxiliary rolls retain their source, unit and saved outcome through backup validation',()=>{
  const campaign=newCampaign('보조 굴림 점검');campaign.id='deep';
  const rows=[['parasite-gestation','d20',20,86,'시간트랙'],['parasite-maturation','d10',10,87,'시간트랙'],['zone-cover','d4',4,81,'번 구역'],['gas-duration','d4',4,369,'라운드'],['radiation-death','d10',10,89,'시간']];
  const records=rows.map(([id,expression,sides,page,unit])=>{
    const r=make('dice',{options:{dicePreset:id,diceExpression:expression},faces:[[sides,sides]]});
    assert.equal(r.trace[0].page,page);assert.ok(reportView(r,[r]).includes(unit));return r;
  });
  const backup=validateBackup(makeBackup([campaign],records,campaign.id));
  assert.deepEqual(backup.records.map(r=>r.headline),records.map(r=>r.headline));
});

test('pp.213,215 rubble only requests DEX and D4 wounds on the 1-in-6 trigger',()=>{
  for(const [biome,hazard,page] of [[8,3,213],[9,3,215],[9,4,215]])for(const face of [1,2,6]){
    const r=make('hex',{context:{...surface,biome,terrain:4},faces:[[20,1],[10,6],[10,hazard],[6,face]]});
    const item=r.items.find(i=>i.title==='낙하물');assert.equal(item.page,page);
    assert.equal(item.text,face===1?'낙하물 발생':'낙하물 없음');
    assert.equal(r.trace.some(t=>t.notation==='d4'),false,'Do not roll wounds before the paper DEX check');
  }
});

test('repeatable injury and acid checks retain exact boundary outcomes and conditional shortcuts',()=>{
  for(const [id,face,outcome] of [['nerve-seizure',1,'이번 턴 행동 불가'],['nerve-seizure',2,'이번 턴 행동 가능'],['acid-gear',3,'착용 장비 하나 파괴'],['acid-gear',4,'착용 장비 보존']]){
    const r=make('dice',{options:{dicePreset:id,diceExpression:'d6'},faces:[[6,face]]});
    assert.equal(r.items.find(i=>i.title==='적용 결과').text,outcome);
  }
  const injury=make('injury',{faces:[[20,17]]});assert.ok(relatedDicePresets('injury',injury).some(p=>p.id==='nerve-seizure'));
  const acid=make('table',{tableId:'enemy-ability',faces:[[20,2]]});assert.ok(relatedDicePresets('table',acid).some(p=>p.id==='acid-gear'));
});

test('Korean editorial summaries are never labelled as English source passages',()=>{
  assert.equal(sourceOriginal({sourceText:'임의 대원의 갑작스러운 불안 발작. 스트레스 반응 표를 참조하며 현재 상황에 맞춰 적용한다.'}),'');
  assert.match(sourceOriginal({sourceText:'A random crew member suffers a sudden anxiety attack, regardless of their Stress levels.'}),/영문 원문/);
});
