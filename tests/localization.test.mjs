import test from 'node:test';
import assert from 'node:assert/strict';
import {tables} from '../src/data/tables.js';
import {localizeRecord} from '../src/data/localization.js';
import {localizeTerms,creatureName} from '../src/data/glossary.js';
import {runProcedure} from '../src/generators/procedures.js';
import {reportView,tableView,optionFields,procedureList} from '../src/components/render.js';
import {defaultContext,defaultOptions} from '../src/domain/model.js';

const oneDie=(sides,value)=>()=>{return (value-.5)/sides;};
test('ability effects match their printed number, despite interleaved source columns',()=>{
  const ability=(id,n)=>tables[id].rows.find(r=>r.min===n);
  assert.match(ability('enemy-ability',2).text,/산성.*2D12.*50%/);
  assert.match(ability('enemy-ability',11).text,/면역.*열.*냉기.*방사선/);
  assert.doesNotMatch(ability('enemy-ability',11).text,/2D12/);
  assert.match(ability('psychic-ability',2).text,/WIL.*2라운드/);
  assert.match(ability('psychic-ability',6).text,/WIL.*넘어짐/);
  assert.doesNotMatch(ability('psychic-ability',6).text,/조종|통제/);
  assert.match(ability('psychic-ability',10).text,/2D10/);
});
test('old English records display in Korean without changing their snapshot or memo',()=>{
  const r=runProcedure('table',{campaignId:'legacy',tableId:'stress-group',rng:oneDie(10,4)});
  const row=tables['stress-group'].rows.find(r=>r.min<=4&&r.max>=4);
  r.items[0].text=row.key;r.items[0].detail='';r.headline=row.key.slice(0,110)+'…';
  r.rulesVersion='atdw-core-2024-logbook-1';r.memo='Guardian · 사용자가 쓴 메모';
  const before=structuredClone(r),view=localizeRecord(r,tables);
  assert.match(view.headline,/고립|위안/);assert.match(view.items[0].text,/위스키/);
  assert.equal(view.memo,r.memo);assert.deepEqual(view.trace,r.trace);assert.deepEqual(r,before);
  const html=reportView(r,[r]);assert.match(html,/고립|위안/);assert.match(html,/영문 원문/);
});
test('proper names remain unchanged and creature readings retain their original spelling',()=>{
  assert.equal(tables['given-name'].rows[0].text,'Lilian');
  assert.equal(tables['surname'].rows[0].text,'Howells');
  assert.equal(tables.corporation.rows[0].text,'EcoGen Labs · 제약');
  assert.equal(creatureName(['Ael','Io','Xon']),'아엘이오존(AelIoXon)');
  assert.equal(tables.talents.rows.find(r=>r.key.startsWith('Counter-Attack')).text.startsWith('반격(Counter-Attack)'),true);
  assert.match(tables.talents.rows.find(r=>r.key.startsWith('Hard to Kill')).text,/질긴 목숨\(Hard to Kill\)/);
  assert.match(tables.talents.rows.find(r=>r.key.startsWith('Resist the Taint')).text,/오염 저항\(Resist the Taint\).*오염\(Taint\)/);
  assert.match(tables['enemy-ability'].rows.find(r=>r.min===10).text,/화염 공격\(Flame Attack\)/);
  const once=localizeTerms('Guardian / Aberration / 수호자(Guardian) / Stress +5');
  assert.equal(localizeTerms(once),once);assert.match(once,/수호자\(Guardian\).*변이체\(Aberration\)/);
});
test('localized creature labels cannot change random species or role branches',()=>{
  const guardian=runProcedure('creature',{campaignId:'test',options:{species:'random',tier:'easy'},rng:oneDie(6,1)});
  assert.equal(guardian.trace.length,1);assert.match(guardian.headline,/타이탄\(Titan\)/);
  assert.ok(guardian.items.some(i=>i.title==='공격과 피해'&&i.text==='공격 +0 / 피해 D12+5'));
  assert.ok(!guardian.items.some(i=>i.image));
  assert.ok(!guardian.trace.some(t=>t.id==='creature-role'||t.id==='stat-variant'));
});
test('Guardian tier exceptions are retained in Korean stat panels',()=>{
  const make=(guardianModel,tier)=>runProcedure('creature',{campaignId:'test',options:{species:'Guardian',guardianModel,tier}});
  const brahmari=make('brahmari','elite');
  assert.ok(brahmari.items.some(i=>i.text==='상처 1 / 경계 15 / 장갑 — / 방어 8'));
  assert.ok(brahmari.items.some(i=>i.text.includes('2D20 rads')));
  const anansi=make('anansi','overwhelming');
  assert.ok(anansi.items.some(i=>i.text.includes('공격 +10 / +15*')));
  assert.ok(anansi.items.some(i=>i.text.includes('Poisoned I')));
  assert.ok(anansi.items.some(i=>i.text.includes('3회 공격')));
  const arash=make('arash','elite');
  assert.ok(arash.items.some(i=>i.text.includes('다음 공격 기술에 +10')));
  assert.ok(arash.items.some(i=>i.text==='공격 +8 / 피해 2D12'));
});
test('legacy Guardian reference images become Korean panels without modifying the stored record',()=>{
  const r=runProcedure('creature',{campaignId:'legacy',options:{species:'Guardian',guardianModel:'anansi',tier:'elite'}});
  r.items=[{title:'선택한 Guardian 모델',text:'Anansi · 정예',page:295,image:'/maps/guardian-295.png',group:'고정 능력치'}];
  const before=structuredClone(r),view=localizeRecord(r,tables);
  assert.ok(!view.items.some(i=>i.image));assert.ok(view.items.some(i=>i.text.includes('Poisoned III')));
  assert.deepEqual(r,before);
});
test('UI values keep canonical keys while artwork is removed from navigation',()=>{
  const options=optionFields('creature',defaultOptions(),defaultContext());
  assert.match(options,/<option value="Guardian"[^>]*>수호자\(Guardian\)/);
  assert.doesNotMatch(procedureList('creature'),/<svg[^>]*>[\s\S]*?<\/svg><span><strong>/);
  assert.match(procedureList('creature'),/procedure-code/);
  assert.match(tableView('enemy-ability'),/산성.*2D12/);
});
