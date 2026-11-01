import {normalizeOptions} from './model.js';
import {creatureLabel} from '../data/glossary.js';
import {KNOWN_THREATS,knownThreatItems} from '../data/enemies.js';
import {GUARDIANS} from '../data/guardians.js';

export function enemyCards(run){
  if(!run)return [];
  if(run.cards?.length)return run.cards;
  if(run.enemy)return [{count:1,enemy:run.enemy,items:run.items,notes:run.notes}];
  const oldThreat=run.items?.find(i=>i.tableId==='known-threat');
  if(oldThreat){const key=Object.keys(KNOWN_THREATS)[oldThreat.roll-1];if(key)return [{count:1,enemy:{name:creatureLabel(KNOWN_THREATS[key].name),type:'Aberration',role:key,tier:'elite',known:true,ambush:true},items:knownThreatItems(key),notes:[]}];}
  if(run.procedureId!=='creature')return [];
  const model=Object.values(GUARDIANS).find(g=>run.headline?.includes(g.name));
  const role=run.items?.find(i=>i.tableId==='creature-role')?.key??['Brute','Lurker','Ranged','Swarm','Psychic'].find(role=>run.items?.some(i=>i.tableId==='creature-role'&&i.text.includes(role)))??model?.role??(run.options?.tier==='easy'&&run.context?.crew===1?'Brute':null);
  if(!role)return [];
  const typeItem=run.items.find(i=>i.tableId==='creature-planet'||i.tableId==='creature-space'||i.title==='생물 유형');
  const type=typeItem?.key??['Guardian','Aberration','Synthetic','Local Fauna'].find(type=>typeItem?.text.includes(type))??run.options?.species;
  return [{count:1,enemy:{name:run.headline,type,role,tier:run.options.tier},items:run.items,notes:run.notes}];
}

export function continuationOptions(run,target,options,enemy){
  const next={...options};
  if(target==='arrival'&&run.procedureId==='travel')next.known=run.options.destination==='known';
  if(target==='travel'&&run.procedureId==='travel'&&!run.arrived&&run.headline==='항해 계속')next.week=Math.min(52,run.options.week+1);
  if(target==='creature'&&run.encounter){
    if(run.encounter.type)next.species=run.encounter.type;
    next.tier=run.encounter.composition?.[0]?.tier??'standard';
    const model=run.encounter.label?.match(/Titan|Anansi|Arash|Brahmari/i)?.[0];if(model)next.guardianModel=model.toLowerCase();
  }
  const actor=enemy??enemyCards(run)[0]?.enemy;
  if(target==='behavior'&&actor)next.behavior=actor.role.toLowerCase();
  if(target==='combat-start'){
    next.combatAmbush=!!(run.ambush||run.headline?.includes('매복')||run.encounter?.ambush||actor?.ambush||actor?.known);
    next.checkEncounterReaction=!next.combatAmbush;
  }
  return normalizeOptions(next);
}

export const RELATED_PROCEDURES={
  'artifact-activation':'artifact-activate',injury:'injury',trauma:'trauma',mood:'emotion',
  biome:'biome-border','hacking-difficulty':'hacking',
  exploration:'area',planetside:'hex',arrival:'arrival',carousing:'station',
  'combat-surprise':'combat-start','alternate-access':'alternate'
};

export const COMBAT_TABLES=[
  ['critical-melee','근접 치명적 실패'],['critical-ranged','원거리 치명적 실패'],
  ['morale-creature','생물 사기 저하'],['morale-humanoid','인간형 사기 저하'],
  ['demoralized','NPC 대원 사기 저하'],['parasite-attack','기생체의 공격'],['variable-difficulty','선택: 조우 난도 변화'],['recovery-status','적 회복 상태'],['combat-event','전투 돌발사건'],
  ['hit-humanoid','인간형 명중 부위'],['hit-quadruped','네발·여섯발 명중 부위'],
  ['hit-serpentine','뱀형 명중 부위'],['poison','독의 강도']
];
export const tierLabel=tier=>({easy:'쉬움',standard:'보통',elite:'정예',overwhelming:'압도적'})[tier]??tier;
export const enemyLabel=enemy=>`${enemy.name} · ${tierLabel(enemy.tier)} · ${enemy.known?'추적 위협':creatureLabel(enemy.role)}`;
