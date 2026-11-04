import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {runProcedure} from '../src/generators/procedures.js';
import {reportView} from '../src/components/render.js';
import {relatedDicePresets} from '../src/domain/model.js';

function roll(id, options, context, faces){
  let index=0;
  const rng=()=>{
    assert.ok(index<faces.length,'Unexpected additional die');
    const [sides,face]=faces[index++];
    return (face-0.5)/sides;
  };
  const result=runProcedure(id,{campaignId:'people-combat-audit',options,context,rng});
  assert.equal(index,faces.length,'Every expected die was rolled');
  return result;
}

test('p.231 selected surprise descriptor rolls only the D8 for detail',()=>{
  const result=roll('surprise',{details:false,surpriseDescriptor:6},{},[[8,2]]);
  assert.equal(result.headline,'NPC · 행동의 변화');
  assert.equal(result.items[0].roll,62);
  assert.deepEqual(result.trace.map(die=>[die.notation,die.values,die.value]),[['d8',[2],2]]);
  const random=roll('surprise',{details:false},{},[[8,6],[8,2]]);
  assert.equal(random.headline,result.headline);
  assert.deepEqual(random.trace[0].values,[6,2]);
});

test('a scene with a chosen descriptor uses it only after a twist',()=>{
  const options={details:false,surpriseDescriptor:8};
  const twisted=roll('scene',options,{twist:1},[[6,1],[8,7]]);
  assert.equal(twisted.subline,'세력·승무원 · 실종');
  const calm=roll('scene',options,{twist:1},[[6,2]]);
  assert.equal(calm.items.some(item=>item.tableId==='surprise'),false);
});

test('p.53 encounter activity 3 determines the other creature without creating a replacement encounter',()=>{
  const options={checkEncounterReaction:false,generateCover:false};
  for(const [location,typeId,type] of [['planet','creature-planet','Aberration'],['space','creature-space','Guardian']]){
    const result=roll('combat-start',options,{location},[[4,1],[4,2],[6,1],[8,3],[6,2],[20,10]]);
    assert.equal(result.items.find(item=>item.tableId===typeId).key,type);
    assert.ok(result.items.some(item=>item.tableId==='creature-size'&&item.group==='다투고 있던 다른 생물'));
    assert.equal(result.encounter,undefined);
    assert.equal(result.enemy,undefined);
  }
  const sameKind=roll('combat-start',options,{},[[4,1],[4,2],[6,1],[8,2]]);
  assert.equal(sameKind.items.some(item=>item.tableId==='creature-space'),false);
});

test('NPC combat values include passive talents in new and older reports',async t=>{
  const window=new Window();
  t.after(()=>window.happyDOM.abort());
  const root=window.document.createElement('main');
  for(const [talent,wounds,defense] of [[6,3,3],[12,4,2],[20,3,2]]){
    const result=roll('npc-profile',{}, {},[[100,1],[100,1],[6,1],[6,1],[10,1],[100,1],[20,1],[100,1],[6,1],[20,talent]]);
    assert.equal(result.items.find(item=>item.title==='기본 전투 수치').text,`상처 ${wounds} / 방어 ${defense}`);
    const older={...result,items:result.items.filter(item=>item.title!=='기본 전투 수치')};
    for(const record of [result,older]){
      const snapshot=structuredClone(record);
      root.innerHTML=reportView(record,[record]);
      assert.deepEqual([...root.querySelectorAll('.combat-grid dd')].map(node=>node.textContent),[String(wounds),String(defense)]);
      assert.deepEqual(record,snapshot);
    }
  }
});

test('p.246 refines an existing general emotion and preserves the ambiguous root choice',()=>{
  const detailed=roll('emotion',{moodStart:8,moodDepth:3},{},[[8,1],[4,4]]);
  assert.deepEqual(detailed.trace.map(die=>die.id),['mood-8','mood-8-1']);
  assert.match(detailed.headline,/Resentful/);
  const ambiguous=roll('emotion',{moodStart:8,moodDepth:3},{},[[8,2]]);
  assert.equal(ambiguous.manualTableId,'mood-8-2');
  assert.deepEqual(ambiguous.trace.map(die=>die.id),['mood-8']);
  const firstImpression=roll('emotion',{moodDepth:3},{},[[8,1]]);
  assert.equal(firstImpression.headline,'알기 어려움');
  assert.equal(firstImpression.trace.length,1);
});

test('p.90 vacuum duration uses D4 minutes and is offered only for space exposure',()=>{
  const result=roll('dice',{dicePreset:'vacuum-death',diceExpression:'d4'},{},[[4,3]]);
  assert.equal(result.subline,'d4 · 3분');
  assert.equal(result.trace[0].page,90);
  const possibleExposure={context:{location:'space'},items:[{tableId:'teleport',roll:10}]};
  assert.ok(relatedDicePresets('area',possibleExposure).some(preset=>preset.id==='vacuum-death'));
  const planetside={...possibleExposure,context:{location:'planet'}};
  assert.ok(!relatedDicePresets('area',planetside).some(preset=>preset.id==='vacuum-death'));
});
