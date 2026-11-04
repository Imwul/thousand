import test from 'node:test';
import assert from 'node:assert/strict';
import {runProcedure,runLockAttempt,runFollowup,runEncounterRoster} from '../src/generators/procedures.js';
import {tables} from '../src/data/tables.js';
import {defaultContext,defaultOptions,newCampaign} from '../src/domain/model.js';
import {adoptLocation,restoreLocation,prepareContinuation} from '../src/domain/locations.js';
import {continuationOptions} from '../src/domain/continuation.js';
import {followupChoices,effectDice} from '../src/domain/followups.js';
import {makeBackup,validateBackup,remapBackup} from '../src/storage/store.js';
import {statEntries} from '../src/components/result-fields.js';
import {guideNext} from '../src/domain/play.js';

const make=(id,options={},context={},rng=()=>.5,extra={})=>runProcedure(id,{campaignId:'audit',options,context:{...defaultContext(),...context},rng,...extra});
const faces=(...pairs)=>{let at=0;return ()=>{assert.ok(at<pairs.length,'unexpected extra die');const [sides,face]=pairs[at++];return (face-.5)/sides;};};
const get=(run,title)=>run.items.find(item=>item.title===title);
const stats=run=>Object.fromEntries(statEntries(get(run,'전투 수치')).map(({label,value})=>[label,Number(value)]));
const rowValue=(id,key)=>tables[id].rows.find(row=>row.key===key).min;

test('pp.272–273 choose Armor OR Defense, and apply Carapace after the choice',()=>{
  const bp=make('creature',{species:'Local Fauna'},{crew:3}).blueprint;
  bp.tables['creature-trait']=6;bp.abilities={'enemy-ability':[3,11,18]};
  for(const [tier,base] of [['standard',2],['elite',4],['overwhelming',5]])for(const [face,armor,defense] of [[1,base+3,0],[3,base+3,0],[4,3,base],[6,3,base]]){
    const r=make('creature',{species:'Local Fauna',tier},{crew:3},()=>.5,{blueprint:{...bp,defenseVariant:face}});
    const values=stats(r);assert.equal(values['장갑'],armor);assert.equal(values['방어'],defense);
    assert.match(get(r,'전투 수치').detail,/Carapace/);
  }
});

test('recovery reactions have exact tier values and survive reuse without new dice',()=>{
  const bp=make('creature',{species:'Local Fauna'},{crew:3}).blueprint;
  bp.recoveryChoices={standard:[1,4,6],elite:[4,1,3],overwhelming:[1,4,6]};
  const expected={standard:['피해 +2','공격 +2','도주 시도'],elite:['방어 +2','방어 +5','방어 −2'],overwhelming:['피해 +7','공격 +7','도주 시도']};
  for(const tier of Object.keys(expected)){
    const r=make('creature',{species:'Local Fauna',tier},{crew:3},()=>.5,{blueprint:bp});
    assert.deepEqual(statEntries(get(r,'회복 상태')).map(entry=>entry.value),expected[tier]);
    assert.equal(r.trace.some(t=>t.id.startsWith('recovery-choice')),false);
    const again=make('creature',{species:'Local Fauna',tier},{crew:3},()=>{throw new Error('reused species rolled again');},{blueprint:r.blueprint});
    assert.equal(get(again,'회복 상태').text,get(r,'회복 상태').text);
  }
  assert.equal(get(make('creature',{species:'Local Fauna',tier:'easy'}),'회복 상태'),undefined);
  assert.equal(get(make('creature',{species:'Guardian'}),'회복 상태'),undefined);
});

test('p.122 anxiety selects a present crew member and immediately rolls the matching reaction',()=>{
  const group=make('travel',{}, {crew:3,presentCrew:3},faces([100,1],[4,4],[10,6],[3,2],[10,4],[100,100]));
  assert.equal(get(group,'불안 발작 대상').text,'대원 2');assert.ok(group.items.some(i=>i.tableId==='stress-group'));
  const solo=make('travel',{}, {},faces([100,1],[4,1],[10,6],[10,4],[100,100]));
  assert.equal(get(solo,'불안 발작 대상').text,'대원 1');assert.ok(solo.items.some(i=>i.tableId==='stress-alone'));
});

test('p.123 instantaneous transit wins over destination checks; every present crew gets a Negative Trait',()=>{
  const r=make('travel',{}, {crew:3,presentCrew:2},faces([100,1],[4,4],[10,3],[2,2],[6,6],[6,1],[6,6],[20,2],[20,18]));
  assert.equal(get(r,'사건 대상 대원').text,'대원 2');
  assert.equal(r.arrived,true);assert.equal(r.trace.some(t=>t.id==='destination-check'),false);
  assert.deepEqual(r.items.filter(i=>i.tableId==='negative-trait').map(i=>i.group),['대원 1의 부정적 특성','대원 2의 부정적 특성']);
});

test('known transit duration changes affect this arrival and the next week, without changing the original options',()=>{
  const shorter=make('travel',{destination:'known',knownWeeks:5,week:4},{},faces([100,1],[4,4],[10,3],[6,6],[6,3],[4,2],[6,1]));
  assert.equal(shorter.arrived,true);assert.equal(shorter.options.knownWeeks,5);assert.match(get(shorter,'알려진 항해 일정').detail,/예정 3주/);
  const longer=make('travel',{destination:'known',knownWeeks:5,week:5},{},faces([100,1],[4,4],[10,3],[6,6],[6,6],[4,3],[6,1]));
  assert.equal(longer.arrived,false);assert.equal(continuationOptions(longer,'travel',defaultOptions()).knownWeeks,8);
});

test('p.158 door type survives retries and an elite abomination nest produces an encounter',()=>{
  const door=make('door',{}, {},faces([10,8],[10,2],[10,8])),snapshot=structuredClone(door);
  const failed=runLockAttempt(door,'inside',{rng:faces([10,2])});
  const opened=runLockAttempt(failed,'inside',{rng:faces([10,5],[100,1],[4,3],[4,1],[20,1],[20,10])});
  assert.equal(opened.items.find(i=>i.tableId==='door').roll,8);assert.equal(opened.items.find(i=>i.tableId==='door').reused,true);
  assert.equal(opened.encounter.type,'Aberration');assert.deepEqual(opened.encounter.composition,[{tier:'elite',count:1}]);
  assert.equal(opened.trace.some(t=>t.id==='encounter-difficulty'),false);assert.deepEqual(door,snapshot);
});

test('p.161 Dread ambush remains an ambush through roster and combat setup; a future ambush stays future',()=>{
  const r=make('dread',{}, {},faces([20,9],[4,1],[20,1],[6,2],[20,10]));
  assert.equal(r.ambush,true);assert.equal(r.encounter.ambush,true);
  const roster=runEncounterRoster(r,{rng:()=>.5});const setup=make('combat-start',continuationOptions(roster,'combat-start',defaultOptions()),{},()=>.5);
  assert.equal(setup.trace.some(t=>['encounter-reaction','combat-surprise','encounter-activity'].includes(t.id)),false);
  const future=make('dread',{}, {},faces([20,19]));assert.equal(future.encounter,undefined);
});

test('p.157 an alarm door creates an encounter after a failed access attempt and retains its lock',()=>{
  const door=make('door',{}, {},faces([10,1],[10,2],[10,8]));
  const failed=runLockAttempt(door,'inside',{rng:faces([10,2],[4,1],[20,1],[6,2],[20,10])});
  assert.ok(failed.pending);assert.ok(failed.encounter);assert.equal(failed.encounter.ambush,false);
  assert.equal(guideNext('door',failed)[0],'creature');
  assert.ok(followupChoices(door).some(c=>c.id==='door-alarm'));assert.equal(followupChoices(failed).some(c=>c.id==='door-alarm'),false);
});

test('pp.193,211 frozen terrain checks its 10% fall and toxic poisoning determines severity',()=>{
  for(const face of [10,11]){
    const r=make('hex',{}, {location:'planet',mode:'surface',biome:3,terrain:3,knownThreats:false},faces([20,rowValue('terrain-3','생물군계 의존')],[100,face],[10,4]));
    assert.equal(!!get(r,'추락 피해'),face===10);
  }
  const toxic=make('hex',{}, {location:'planet',mode:'surface',biome:7,knownThreats:false},faces([20,rowValue('terrain-4','순탄한 길')],[10,6],[10,6],[4,4]));
  assert.equal(toxic.items.find(i=>i.tableId==='poison').roll,4);
});

test('conditional followups are offered only after their prerequisite, preserve source, and support replay',()=>{
  const sources=[['fixed-event',15,'stela','door'],['fixed-event',16,'metal-box','door'],['security',1,'security-alarm','creature'],['biome-hazards-10',9,'water-predators','creature'],['dread',12,'dread-trauma','door'],['injury',19,'injury-trauma','door'],['artifact-activation',11,'artifact-trauma','door'],['biome-hazards-7',3,'toxic-marsh','door']];
  for(const [id,face,key,nextProcedure] of sources){
    const source=make('table',{}, {},faces([Number(tables[id].dice.slice(1)),face]),{tableId:id}),before=structuredClone(source);
    assert.equal(source.trace.length,1);assert.ok(followupChoices(source).some(c=>c.id===key));
    const next=runFollowup(source,key,{rng:()=>.1});assert.equal(next.parentId,source.id);assert.deepEqual(source,before);
    assert.equal(guideNext('area',next)[0],nextProcedure);
    assert.equal(runFollowup(next,key,{rng:()=>.9}).parentId,next.id);
  }
  assert.throws(()=>runFollowup(make('question'),'metal-box'),/이어 굴릴 수 없는/);
});

test('p.168 stela and box split 50/50; a box contains one artifact, not a D4 batch',()=>{
  const source=face=>make('table',{}, {},faces([20,face]),{tableId:'fixed-event'});
  assert.equal(runFollowup(source(15),'stela',{rng:faces([6,3])}).headline,'행운 +1');
  assert.equal(runFollowup(source(15),'stela',{rng:faces([6,4])}).headline,'행운 −1');
  const artifact=runFollowup(source(16),'metal-box',{rng:()=>.1});assert.equal(artifact.items.filter(i=>i.tableId==='artifact').length,1);assert.equal(artifact.trace.some(t=>t.id==='artifact-count'),false);
  const explosion=runFollowup(source(16),'metal-box',{rng:faces([6,4])});assert.equal(explosion.trace.length,1);assert.deepEqual(effectDice(explosion).map(x=>x.expression),['d20']);
});

test('pp.96,98 stress 20 generates obsession, trauma and conditional negative trait; ordinary trauma does not add obsession',()=>{
  const r=make('stress',{stressMode:'breakdown'},{},faces([12,5],[10,1],[20,4]));
  assert.deepEqual(r.trace.map(t=>t.id),['obsession','trauma','negative-trait']);assert.match(get(r,'시트 반영').text,/초기화.*1점/);
  assert.deepEqual(make('trauma',{}, {},faces([10,5])).trace.map(t=>t.id),['trauma']);
});

test('pp.365–366 availability bonuses and experimental failure preserve exact boundaries',()=>{
  for(const [face,expected] of [[14,'이번 임무 후에는 구매 불가'],[15,'구매 가능']])assert.equal(make('gear-check',{}, {},faces([20,face])).headline,expected);
  assert.equal(make('gear-check',{wellConnected:true}, {},faces([20,12])).headline,'구매 가능');
  assert.equal(make('gear-check',{goldTier:true,bribeSteps:1}, {},faces([20,12])).headline,'구매 가능');
  assert.equal(make('gear-check',{bribeSteps:14}, {},faces([20,1])).headline,'구매 가능');
  const good=make('gear-check',{gearAction:'experimental'}, {},faces([20,2]));assert.equal(good.trace.length,1);
  const bad=make('gear-check',{gearAction:'experimental'}, {},faces([20,1],[6,5]));assert.equal(bad.items.find(i=>i.tableId==='experimental-malfunction').roll,5);assert.deepEqual(effectDice(bad).map(d=>d.expression),['2d20']);
});

test('pp.140–141 recurring hazards are available at their actual trigger',()=>{
  const vertical=make('area',{connector:false},{hazard:8},faces([20,20],[10,3],[10,2],[6,3]));assert.equal(get(vertical,'등반 높이').text,'20피트');
  const collapse=make('activity',{}, {hazard:3,knownThreats:false});assert.match(get(collapse,'붕괴하는 시설').text,/DEX.*3D10/);assert.equal(collapse.trace.length,0);
  const distorted=make('time-step',{}, {hazard:7},faces([6,4]));assert.equal(distorted.headline,'시간트랙 −1');
  const surface=make('time-step',{}, {hazard:7,mode:'surface',location:'planet'},()=>{throw new Error('surface must not apply facility distortion');});assert.equal(surface.headline,'시간트랙 +1');
});

test('p.53 PC surprise replaces random PC placement with player choice and retains the discarded roll',()=>{
  const r=make('combat-start',{checkEncounterReaction:false,generateCover:false},{},faces([4,1],[4,2],[6,5],[8,4]));
  assert.equal(r.items.filter(i=>i.tableId==='placement').length,1);assert.match(get(r,'PC 배치').text,/직접 선택/);assert.equal(r.trace.find(t=>t.id==='placement').discarded,true);
});

test('restoring, readopting and following an old place preserve today’s party and twist',()=>{
  for(const mode of ['restore','adopt','unsaved']){
    const campaign=newCampaign();campaign.context={...defaultContext(),crew:3,presentCrew:3,twist:1};
    const source=make('planet');adoptLocation(campaign,source,'이전 행성');const old=structuredClone(campaign.context);
    campaign.context={...defaultContext(),siteId:'today',siteName:'현재',crew:1,presentCrew:1,twist:3};
    if(mode==='restore')restoreLocation(campaign,old.siteId);
    if(mode==='adopt')adoptLocation(campaign,source);
    if(mode==='unsaved'){campaign.locations=[];prepareContinuation(campaign,{context:old},'hex');}
    assert.equal(campaign.context.siteId,old.siteId);assert.equal(campaign.context.crew,1);assert.equal(campaign.context.presentCrew,1);assert.equal(campaign.context.twist,3);assert.equal(old.presentCrew,3);
  }
});

test('effect dice preserve whole arithmetic and never mutate their report',()=>{
  const source={procedureId:'creature',items:[{title:'피해',text:'2D10+5−1D10 피해. D4 라운드. D100×3 rads.',detail:'D4 라운드는 반복 언급.'}]},before=structuredClone(source);
  const expressions=effectDice(source).map(d=>d.expression);assert.deepEqual(expressions,['2d10+5-1d10','d4','d100×3']);assert.deepEqual(source,before);
  assert.equal(make('dice',{diceExpression:'2D10+5−1D10'},{},faces([10,4],[10,6],[10,3])).headline,'12');
});

test('new recovery, followup and aside records roundtrip with all original rolls and references',()=>{
  const c=newCampaign();c.id='audit';const source=make('creature',{species:'Local Fauna'}),box=make('table',{}, {},faces([20,16]),{tableId:'fixed-event'}),branch=runFollowup(box,'metal-box',{rng:()=>.9});
  const aside=make('dice',{diceExpression:'d20'},{},()=>.5,{parentId:branch.id});aside.aside=true;
  const backup=makeBackup([c],[source,box,branch,aside]);assert.deepEqual(validateBackup(backup).records,backup.records);
  const imported=remapBackup(backup);assert.equal(imported.records[3].parentId,imported.records[2].id);assert.deepEqual(imported.records[0].blueprint.recoveryChoices,source.blueprint.recoveryChoices);
  const bad=structuredClone(backup);bad.records[0].blueprint.recoveryChoices.standard=[0,4,6];assert.throws(()=>validateBackup(bad),/원형/);
});

test('combat table modifiers keep raw dice, use adjusted rows, and never invent out-of-range results',()=>{
  const normal=make('table',{}, {},faces([10,4]),{tableId:'hit-humanoid',tableModifier:1});
  assert.equal(normal.trace[0].value,4);assert.deepEqual(normal.trace[0].values,[4]);assert.equal(normal.items.at(-1).roll,5);assert.equal(normal.items.at(-1).rawRoll,4);
  assert.equal(normal.items.at(-1).reused,undefined);assert.equal(normal.tableModifier,1);
  const overflow=make('table',{}, {},faces([6,6]),{tableId:'recovery-status',tableModifier:3});
  assert.match(overflow.headline,/표 범위 밖 · 9/);assert.equal(overflow.items.at(-1).roll,undefined);
  const natural=make('injury',{injuryModifier:2},{},faces([20,1],[10,4]));
  assert.equal(natural.items.find(i=>i.tableId==='injury').roll,1);assert.ok(natural.items.some(i=>i.tableId==='critical-injury'));
  const adjustedOne=make('injury',{injuryModifier:-2},{},faces([20,3]));
  assert.match(adjustedOne.headline,/적용 판단 필요/);assert.equal(adjustedOne.items.some(i=>i.tableId==='critical-injury'),false);
  const c=newCampaign();c.id='audit';assert.deepEqual(validateBackup(makeBackup([c],[normal,overflow,natural])).records,[normal,overflow,natural]);
  assert.throws(()=>make('table',{}, {},()=>.5,{tableId:'action',tableModifier:1}),/표 보정/);
});
