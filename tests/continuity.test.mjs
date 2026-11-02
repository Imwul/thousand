import test from 'node:test';
import assert from 'node:assert/strict';
import {runProcedure,runEncounterRoster,runManualTable} from '../src/generators/procedures.js';
import {newCampaign,normalizeContext,defaultOptions} from '../src/domain/model.js';
import {adoptLocation,restoreLocation,rememberLocation,prepareContinuation} from '../src/domain/locations.js';
import {continuationOptions,enemyCards} from '../src/domain/continuation.js';
import {KNOWN_THREATS} from '../src/data/enemies.js';
import {makeBackup,validateBackup,remapBackup} from '../src/storage/store.js';
import {reportView} from '../src/components/render.js';
import {guideNext} from '../src/domain/play.js';

const make=(id,options={},context={},rng=()=>.5)=>runProcedure(id,{campaignId:'test',options,context,rng});
const sequence=values=>{let i=0;return()=>values[i++]??.5;};
const mixed=()=>make('area',{connector:false},{crew:1},sequence([.1,0,.7,.8,.5,.4]));

test('all fixed threats have their own stats, recovery effects and matching behavior',()=>{
  assert.equal(Object.keys(KNOWN_THREATS).length,6);
  for(let i=0;i<6;i++){
    const run=make('activity',{}, {},sequence([0,(i+.1)/6]));
    const [key,source]=Object.entries(KNOWN_THREATS)[i];
    assert.equal(run.enemy.role,key);assert.equal(run.enemy.ambush,true);
    assert.ok(run.items.some(item=>item.title==='기본 능력치'&&item.text.includes(`STR ${source.attributes[0]}`)));
    assert.ok(run.items.some(item=>item.title==='회복 상태'&&item.text.includes(source.recovery[2])));
    assert.equal(continuationOptions(run,'behavior',defaultOptions()).behavior,key);
  }
  assert.equal(KNOWN_THREATS.clobber.combat[2],6);
  assert.match(KNOWN_THREATS.clobber.effect,/머리/);
  assert.match(KNOWN_THREATS.psybane.effect,/라운드마다.*\+2/);
});

test('a mixed encounter creates versions of one species, without rerolling its identity',()=>{
  const source=mixed(),snapshot=structuredClone(source);
  assert.deepEqual(source.encounter.composition,[{tier:'standard',count:1},{tier:'easy',count:2}]);
  const roster=runEncounterRoster(source,{rng:()=>.5});
  assert.deepEqual(roster.cards.map(card=>card.count),[1,2]);
  assert.ok(roster.cards.every(card=>card.enemy.type==='Aberration'&&card.enemy.name===roster.headline));
  for(const [id,rollCount] of [['creature-size',0],['creature-drive',1],['appearance',1],['covering',1],['unique-feature',1]]){
    const values=roster.cards.map(card=>card.items.find(item=>item.tableId===id).roll);
    assert.equal(new Set(values).size,1,id);
    assert.equal(roster.trace.filter(roll=>roll.id===id).length,rollCount,id);
  }
  assert.ok(roster.cards.every(card=>card.items.find(item=>item.tableId==='creature-size').reused));
  assert.equal(roster.cards[1].enemy.role,'Brute','solo easy exception still applies');
  assert.equal(roster.parentId,source.id);assert.deepEqual(source,snapshot);
  const revisited=runEncounterRoster(source,{blueprint:roster.blueprint,rng:()=>.99});
  assert.equal(revisited.headline,roster.headline);
  assert.deepEqual(revisited.cards.map(c=>c.enemy),roster.cards.map(c=>c.enemy));
});

test('Anansi keeps its role in the next action and does not inherit a prior ambush toggle',()=>{
  const anansi=make('creature',{species:'Guardian',guardianModel:'anansi'});
  assert.equal(enemyCards(anansi)[0].enemy.role,'Lurker');
  assert.equal(continuationOptions(anansi,'behavior',defaultOptions()).behavior,'lurker');
  assert.equal(continuationOptions(anansi,'combat-start',{...defaultOptions(),combatAmbush:true}).combatAmbush,false);
});

test('a confirmed ambush never rolls reaction, surprise, or enemy downtime again',()=>{
  const source=make('activity',{}, {},()=>0);
  const options=continuationOptions(source,'combat-start',defaultOptions());
  const setup=make('combat-start',options,{},()=>.99);
  assert.ok(!setup.trace.some(t=>['encounter-reaction','combat-surprise','encounter-activity'].includes(t.id)));
  assert.match(setup.subline,/기습당함/);
  assert.ok(setup.items.some(i=>i.title==='기습'&&i.text.includes('+2')));
});

test('new planet and facility contexts cannot inherit exhausted threats or old creature slots',()=>{
  const campaign=newCampaign();
  campaign.context=normalizeContext({...campaign.context,siteId:'old',siteName:'이전 시설',hazard:4,knownThreats:false,slots:['Anansi','','',''],slotRefs:[null,null,null,null]});
  const planet=make('planet');
  adoptLocation(campaign,planet,'새 행성');const planetId=campaign.context.siteId;
  assert.equal(campaign.context.mode,'surface');assert.equal(campaign.context.hazard,0);
  assert.equal(campaign.context.knownThreats,true);assert.ok(campaign.context.slots.every(v=>v===''));
  campaign.context.terrain=2;rememberLocation(campaign);
  restoreLocation(campaign,'old');assert.equal(campaign.context.knownThreats,false);assert.equal(campaign.context.slots[0],'Anansi');
  adoptLocation(campaign,planet,'다른 이름');assert.equal(campaign.context.siteId,planetId);assert.equal(campaign.context.terrain,2);
  const site=make('arrival',{known:true},{},()=>.7);adoptLocation(campaign,site,'다음 시설');
  assert.equal(campaign.context.mode,'site');assert.equal(campaign.context.knownThreats,true);
  assert.ok(campaign.context.slotRefs.every(v=>v===null));
});

test('surface time reset has no second activity check; a new hex still checks threats',()=>{
  const context={location:'planet',mode:'surface',biome:10};
  const reset=make('activity',{},context,()=>0),hex=make('hex',{},context,()=>0);
  assert.equal(reset.trace.length,0);assert.ok(reset.items.some(i=>i.text.includes('추가 매복 굴림 없음')));
  assert.ok(hex.trace.some(t=>t.id==='biome-activity-check'));
  assert.ok(!hex.trace.some(t=>t.id==='site-activity-check'));
});

test('return voyage leads to appraisal and bulk valuation rolls exactly once per artifact',()=>{
  const travel=make('travel',{voyage:'return',knownWeeks:1,week:1},{},()=>.99);
  assert.equal(travel.arrived,true);assert.equal(travel.headline,'Karum Station 귀환');
  assert.ok(!travel.trace.some(t=>t.id==='destination-check'));
  assert.equal(guideNext('travel',travel)[0],'appraisal');
  const app=make('appraisal',{artifactCount:3,crystalCount:2,alloyCount:1,findCount:1,encounterCount:2},{},()=>.99);
  assert.equal(app.trace.length,3);assert.match(app.headline,/300 DC/);assert.match(app.subline,/합계 490 DC/);
  assert.equal(make('appraisal',{artifactCount:0}).trace.length,0);
});

test('outbound known destinations and next travel week carry forward explicitly',()=>{
  const known=make('travel',{destination:'known',knownWeeks:1});
  assert.equal(continuationOptions(known,'arrival',defaultOptions()).known,true);
  const continuing=make('travel',{week:2},{},()=>.99);
  assert.equal(continuationOptions(continuing,'travel',defaultOptions()).week,3);
});

test('backup import remaps enemy, location, subject and slot references together',()=>{
  const campaign=newCampaign();campaign.id='test';const source=mixed(),roster=runEncounterRoster(source,{rng:()=>.5});
  campaign.context=normalizeContext({...campaign.context,siteId:'place',slotRefs:[roster.id,null,null,null]});
  campaign.activeEnemy={recordId:roster.id,index:1};campaign.currentRecordId=roster.id;rememberLocation(campaign);
  const action=make('behavior');action.actor={recordId:roster.id,index:1};action.parentId=roster.id;
  const npc=make('npc-profile');npc.subject={name:npc.headline,recordId:npc.id};
  const backup=makeBackup([campaign],[source,roster,action,npc]);validateBackup(backup);
  const imported=remapBackup(backup),newRoster=imported.records.find(r=>r.procedureId==='encounter-roster');
  assert.notEqual(newRoster.id,roster.id);assert.equal(imported.campaigns[0].context.slotRefs[0],newRoster.id);
  assert.equal(imported.campaigns[0].locations[0].context.slotRefs[0],newRoster.id);
  assert.equal(imported.campaigns[0].activeEnemy.recordId,newRoster.id);
  assert.equal(imported.records.find(r=>r.procedureId==='behavior').actor.recordId,newRoster.id);
  assert.equal(imported.records.find(r=>r.procedureId==='npc-profile').subject.recordId,imported.records.find(r=>r.procedureId==='npc-profile').id);
  validateBackup({...backup,...imported});
  const broken=structuredClone(backup);broken.records[1].blueprint.tables['creature-size']=1000;
  assert.throws(()=>validateBackup(broken),/원형/);
});

test('two encounters in one hex keep separate types and independent child rosters',()=>{
  let found;
  for(let seed=1;seed<2000&&!found;seed++){let value=seed;const rng=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};const run=make('hex',{}, {location:'planet',mode:'surface',biome:2,terrain:2,knownThreats:false},rng);if(run.encounters?.length===2)found=run;}
  assert.ok(found,'fixture must have a habitat encounter and a second exploration encounter');
  assert.equal(found.encounters[0].type,'Local Fauna');
  const first=runEncounterRoster(found,{encounterIndex:0,rng:()=>.5});
  const second=runEncounterRoster(found,{encounterIndex:1,rng:()=>.5});
  assert.equal(first.encounterIndex,0);assert.equal(second.encounterIndex,1);
  assert.ok(first.cards.every(c=>c.enemy.type===found.encounters[0].type));
  assert.ok(second.cards.every(c=>c.enemy.type===found.encounters[1].type));
});


test('continuation uses the adopted place and latest terrain; source snapshots stay unchanged',()=>{
  const campaign=newCampaign(),arrival=make('arrival',{known:true},{},()=>.7),original=structuredClone(arrival);
  prepareContinuation(campaign,arrival,'area');assert.equal(campaign.context.hazard,arrival.adopt.hazard);
  assert.notEqual(campaign.context.siteId,arrival.context.siteId);assert.equal(campaign.context.mode,'site');
  campaign.context.resources=false;rememberLocation(campaign);
  prepareContinuation(campaign,arrival,'area');assert.equal(campaign.context.resources,false);
  const hex=make('hex',{}, {...campaign.context,mode:'surface',location:'planet'},()=>.5);hex.terrain=2;
  prepareContinuation(campaign,hex,'hex');assert.equal(campaign.context.terrain,2);
  assert.deepEqual(arrival,original);
});

test('adjacent biome supports same-type D12 results and skips single-biome planets',()=>{
  const context={location:'planet',mode:'surface',biome:7,knownThreats:false};
  const border=make('biome-border',{},context,()=>.99);
  assert.equal(border.adopt.biome,7);assert.equal(border.adopt.knownThreats,true);
  assert.equal(border.trace[0].notation,'d12');assert.equal(border.trace.length,2);
  assert.ok(border.items.some(i=>i.title==='생물군계 환경'&&i.text.includes('독 III')&&i.text.includes('상처 1')));
  const single=make('biome-border',{}, {...context,singleBiome:true});assert.equal(single.trace.length,0);assert.equal(single.adopt,undefined);
  const frozen=make('hex',{}, {...context,biome:3});assert.ok(frozen.items.some(i=>i.title==='생물군계 환경'&&i.text.includes('−3')&&i.text.includes('+2')));
});

test('random system difficulty is rolled once and retained for subsequent node rerolls',()=>{
  const hack=make('hacking',{hackingRandom:true},{},sequence([.99,.5,.5,.5,.5,.5,.5]));
  assert.equal(hack.options.hackingDifficulty,6);assert.equal(hack.hacking.values.length,6);
  assert.equal(hack.options.hackingRandom,false);assert.equal(hack.trace[0].id,'hacking-difficulty');
  const next=make('hacking',hack.options,{},()=>.5);assert.equal(next.hacking.values.length,6);
  assert.ok(!next.trace.some(t=>t.id==='hacking-difficulty'));
});

test('ambiguous printed ranges can be chosen and backed up without inventing a die result',()=>{
  const emotion=make('emotion',{moodDepth:3},{},sequence([.99,.2]));
  assert.equal(emotion.manualTableId,'mood-8-2');
  const html=reportView(emotion,[emotion]);assert.equal((html.match(/data-action="table-select"/g)??[]).length,2);assert.ok(html.includes(`data-parent="${emotion.id}"`));
  const run=runManualTable('mood-8-2',1,{campaignId:'test'});
  assert.equal(run.manual,true);assert.equal(run.trace.length,0);assert.equal(run.items[0].roll,undefined);
  const campaign=newCampaign();campaign.id='test';validateBackup(makeBackup([campaign],[run]));
  assert.throws(()=>runManualTable('injury',0,{campaignId:'test'}),/직접 선택/);
});
