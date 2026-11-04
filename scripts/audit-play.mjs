import assert from 'node:assert/strict';
import {runProcedure,runLockAttempt,runHackReroll,runEncounterRoster,runFollowup} from '../src/generators/procedures.js';
import {PROCEDURES,DICE_PRESETS,SLOT_COUNTS,defaultContext,newCampaign} from '../src/domain/model.js';
import {followupChoices,effectDice} from '../src/domain/followups.js';
import {makeBackup,validateBackup} from '../src/storage/store.js';

const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const traceIds=new Set(),stats=[];
const campaign={...newCampaign('Play audit'),id:'audit'};
let runs=0,locks=0,hacks=0,rosters=0,followups=0,effects=0,backupRecords=0;
for(const p of PROCEDURES){
  let longest=0;
  const records=[];
  for(let i=0;i<300;i++){
    const context={...defaultContext(),crew:[1,3,5][i%3],presentCrew:1+i%5,
      location:i%2?'planet':'space',mode:i%4===1?'surface':'site',biome:1+i%10,terrain:i%5,size:1+i%4,
      hazard:1+i%8,purpose:i%21,resources:!!(i%2),artifacts:!!(i%3),knownThreats:!!(i%4),
      slots:Array(SLOT_COUNTS[i%4]).fill(i%7===0?'Guardian':'')};
    const options={week:1+i%8,destination:i%2?'known':'unknown',knownWeeks:1+i%6,
      known:!!(i%2),connector:!!(i%2),species:['random','Guardian','Aberration','Synthetic','Local Fauna'][i%5],
      tier:['easy','standard','elite','overwhelming'][i%4],guardianModel:['titan','anansi','arash','brahmari'][i%4],
      randomIntelligence:!!(i%2),aquatic:!!(i%2),moodDepth:1+i%3,
      stationActivity:['carousing','night','locals','news'][i%4],
      behavior:['brute','lurker','ranged','swarm','psychic','spitter','clobber','taker','psybane','bomber','cecaelia'][i%11],
      artifactCount:i%7,injuryModifier:[0,2,-2][i%3],retarget:!!(i%2),cautious:!!(i%3),checkEncounterReaction:!!(i%2),generateCover:!!(i%2),
      hackingDifficulty:1+i%6,diceExpression:['2d10+5','d100×3','3d12-2','100d100'][i%4],sights:!!(i%2),stressMode:i%2?'reaction':'breakdown',gearAction:i%2?'availability':'experimental',goldTier:!!(i%3),wellConnected:!!(i%2),bribeSteps:i%15,
      surpriseDescriptor:i%9,moodStart:[0,2,3,4,5,6,7,8][i%8]};
    const r=runProcedure(p.id,{campaignId:'audit',context,options,rng:seeded(9001+i*37)});
    records.push(r);
    for(const item of r.items){
      assert.equal(typeof item.text,'string',`${p.id}/${i}: result must have text`);
      assert.ok(item.text.trim(),`${p.id}/${i}: empty result`);
      assert.doesNotMatch(item.text,/undefined|NaN|\+-\d/,`${p.id}/${i}: malformed result`);
      longest=Math.max(longest,item.text.length);
    }
    for(const t of r.trace){
      traceIds.add(t.id);
      assert.ok(Number.isFinite(t.value)&&t.values.every(Number.isFinite),`${p.id}/${i}: invalid dice`);
    }
    if(r.pending)for(const guess of ['inside','outside']){
      const snapshot=structuredClone(r);
      const next=runLockAttempt(r,guess,{rng:seeded(333+i)});
      assert.equal(next.parentId,r.id);assert.deepEqual(r,snapshot);records.push(next);locks++;
    }
    if(r.hacking)for(let j=0;j<r.hacking.values.length;j++){
      const snapshot=structuredClone(r),next=runHackReroll(r,j,{rng:seeded(i+j+1)});
      assert.equal(next.parentId,r.id);
      next.hacking.values.forEach((value,k)=>{if(k!==j)assert.equal(value,r.hacking.values[k]);});
      assert.deepEqual(r,snapshot);records.push(next);hacks++;
    }
    for(let index=0;index<(r.encounters?.length??0);index++){
      const before=structuredClone(r),next=runEncounterRoster(r,{encounterIndex:index,rng:seeded(i+12)});
      assert.deepEqual(r,before);assert.equal(next.parentId,r.id);assert.equal(new Set(next.cards.map(c=>c.enemy.name)).size,1);
      assert.ok(next.cards.every(c=>c.enemy.type===next.blueprint.type));records.push(next);rosters++;
    }
    for(const choice of followupChoices(r)){
      const before=structuredClone(r),next=runFollowup(r,choice.id,{rng:seeded(i+19)});assert.equal(next.parentId,r.id);assert.deepEqual(r,before);records.push(next);followups++;
    }
    for(const {expression} of effectDice(r)){
      const next=runProcedure('dice',{campaignId:'audit',context:r.context,options:{diceExpression:expression},rng:seeded(i+44)});assert.ok(Number.isFinite(Number(next.headline)));records.push(next);effects++;
    }
    runs++;
  }
  validateBackup(makeBackup([campaign],records));
  backupRecords+=records.length;
  stats.push({procedure:p.id,runs:300,longestResult:longest});
}
const presetRuns=DICE_PRESETS.flatMap(preset=>[0,.999].map(value=>{
  const result=runProcedure('dice',{campaignId:campaign.id,options:{dicePreset:preset.id,diceExpression:preset.expression},rng:()=>value});
  assert.equal(result.trace[0]?.page,preset.page,`Wrong source for ${preset.id}`);
  return result;
}));
validateBackup(makeBackup([campaign],presetRuns));
backupRecords+=presetRuns.length;
console.log(JSON.stringify({runs,lockContinuations:locks,hackingContinuations:hacks,rosterContinuations:rosters,conditionalContinuations:followups,effectDice:effects,helperDice:presetRuns.length,backupRecords,distinctTraceIds:traceIds.size,stats},null,2));
