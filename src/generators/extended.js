import {tables} from '../data/tables.js';
import {creatureLabel,creatureName} from '../data/glossary.js';
import {GUARDIANS,guardianItems} from '../data/guardians.js';
import {BIOME_EFFECTS} from '../data/biomes.js';
import {ROLE_RULES} from '../data/enemies.js';
import {DICE_PRESETS,dicePresetOutcome} from '../domain/model.js';

const roles=['Brute','Lurker','Ranged','Swarm','Psychic'];
const tierNames={easy:'쉬움',standard:'보통',elite:'정예',overwhelming:'압도적'};
const base={
  easy:{STR:8,DEX:4,CON:8,WIL:6,INT:6,CHA:0,Wounds:1,Awareness:5,Armor:0,Defense:0,abilities:1},
  standard:{STR:12,DEX:12,CON:10,WIL:10,INT:8,CHA:0,Wounds:1,Awareness:10,Armor:2,Defense:2,abilities:1},
  elite:{STR:14,DEX:14,CON:12,WIL:12,INT:8,CHA:0,Wounds:2,Awareness:15,Armor:4,Defense:4,abilities:2},
  overwhelming:{STR:16,DEX:14,CON:15,WIL:14,INT:8,CHA:0,Wounds:3,Awareness:20,Armor:5,Defense:5,abilities:3}
};
export function creature(r,run){
  const o=run.options,c=run.context,bp=run.blueprint??{id:crypto.randomUUID(),tables:{}};
  bp.id??=crypto.randomUUID();bp.tables??={};
  const identity=(id,group)=>{const result=r.table(id,group,bp.tables[id]);bp.tables[id]=result.value;return result;};
  const type=bp.type??(o.species==='random'?r.table(c.location==='planet'?'creature-planet':'creature-space','생물 유형').row.key:o.species);bp.type=type;
  if(o.species!=='random')r.item('생물 유형',creatureLabel(type),268,{key:type,group:'생물 유형',detail:'굴림 전 직접 선택한 유형.'});
  if(type==='Guardian'){
    const model=bp.guardianModel??o.guardianModel,g=GUARDIANS[model];bp.guardianModel=model;run.headline=`${creatureLabel(g.name)} · ${tierNames[o.tier]}`;run.subline=`수호자(Guardian) / ${creatureLabel(g.role)} / 영역 지배`;
    for(const {title,text,page,...extra} of guardianItems(model,o.tier))r.item(title,text,page,extra);
    run.notes.push(`수호자는 사기·정신 효과에 면역입니다(p.268). 해킹하면 정지시킬 수 있지만 조종할 수는 없습니다. 해킹 판정 보정: ${{easy:'보통(+0)',standard:'까다로움(-5)',elite:'어려움(-10)',overwhelming:'거의 불가능(-15)'}[o.tier]}(p.290). 일반 생물의 역할 보정·무작위 지능을 추가하지 않습니다.`);
    run.blueprint={...bp,name:creatureLabel(g.name),role:g.role};run.enemy={name:creatureLabel(g.name),type,role:g.role,tier:o.tier};
    r.item('수호자 특성',`사기·정신 효과에 면역. 해킹으로 정지시킬 수 있지만 조종할 수 없다. 해킹 판정 보정: ${{easy:'+0',standard:'−5',elite:'−10',overwhelming:'−15'}[o.tier]}.`,290,{group:'수호자 고정 능력치'});
    r.item('역할 참조',g.role==='Lurker'?'잠복형 행동 표를 사용한다. 비표적 상대에 대한 +5는 별표가 붙은 높은 공격 수치에 이미 반영되어 있다.':`${g.role==='Brute'?'돌격형':g.role==='Ranged'?'원거리형':'군집형'} 행동 표를 사용한다. 일반 역할의 수치 보정 대신 위 수호자 고정 능력치를 사용한다.`,ROLE_RULES[g.role].page,{group:'조건부 규칙'});return;
  }
  if(type==='Aberration')r.item('유형 효과','조우하면 대원들이 스트레스(Stress) +5.',268,{group:'조건부 규칙'});
  if(type==='Synthetic')r.item('유형 효과','회복(Recovery) 판정에 성공한 같은 턴에 정상적으로 행동한다. 일반 적의 회복 후 불리점 예외.',[268,269],{group:'조건부 규칙'});
  const size=identity('creature-size','몸과 행동'),drive=identity('creature-drive','몸과 행동');
  const role=o.tier==='easy'&&c.crew===1?'Brute':identity('creature-role','몸과 행동').row.key;
  if(o.tier==='easy'&&c.crew===1)r.item('생물 역할',creatureLabel('Brute'),274,{key:'Brute',group:'몸과 행동',detail:'1인 출발 탐사의 쉬움 난도 적은 항상 돌격형(Brute).'});
  const stats={...base[o.tier]},statPage=o.tier==='easy'||o.tier==='standard'?272:273;let damageBonus=0,meleeBonus=0,rangedBonus=0,attack,damage;
  if(o.tier==='easy'){attack=2;damage='1d10+5';}
  else {
    const variant=bp.statVariant??r.raw('stat-variant','공격·피해 변형',6,statPage);bp.statVariant=variant;const branch=variant<=3;
    const variants={standard:[[5,'1d10+5'],[2,'2d12']],elite:[[8,'2d12'],[4,'2d10+5']],overwhelming:[[10,'3d12'],[5,'3d10+5']]};
    [attack,damage]=variants[o.tier][branch?0:1];
    const defenseVariant=bp.defenseVariant??r.raw('defense-variant','장갑·방어 선택',6,statPage);bp.defenseVariant=defenseVariant;
    stats[defenseVariant<=3?'Defense':'Armor']=0;
  }
  if(role==='Brute'){stats.STR++;stats.DEX--;stats.CON++;damageBonus+=2;attack-=2;stats.Awareness-=2;}
  if(role==='Lurker'){stats.DEX+=2;stats.CON--;stats.Awareness+=2;}
  if(role==='Ranged'){stats.STR--;stats.DEX++;stats.CON--;stats.WIL++;meleeBonus-=2;rangedBonus+=2;stats.Awareness+=2;}
  if(role==='Swarm')attack+=5;
  if(role==='Psychic'){stats.CON--;stats.WIL+=3;}
  let trait;
  if(o.tier!=='easy'){
    trait=identity('creature-trait','고유 특성').value;
    const modifications={1:{Armor:1,Defense:-1},2:{Defense:1,Armor:-1},3:{},4:{},5:{Wounds:1,abilities:-1},6:{CON:2,WIL:-2},7:{WIL:2,CON:-2},8:{STR:2,DEX:-2},9:{DEX:2,STR:-2},10:{Wounds:1,CON:-1,WIL:-1}};
    for(const [k,v] of Object.entries(modifications[trait]))stats[k]+=v;
    if(trait===3){attack+=5;damageBonus-=5;}if(trait===4){damageBonus+=5;attack-=5;}
  }
  if(o.randomIntelligence){if(bp.intelligence===undefined){const n=identity('intelligence','지능').value;bp.intelligence=n<=7?6-r.raw('animal-int','동물 지능 D4',4,271):n<=9?6+r.raw('human-int','인간 지능 D8',8,271):12+r.raw('advanced-int','고등 지능 D8',8,271);}stats.INT=bp.intelligence;}
  const small=size.value<=3?-2:size.value<=8?-1:size.value<=16?0:size.value<=18?1:2;
  r.item('기본 능력치',`STR ${stats.STR} / DEX ${stats.DEX} / CON ${stats.CON} / WIL ${stats.WIL} / INT ${stats.INT} / CHA ${stats.CHA}`,statPage,{group:'능력치',detail:'원문 난도 블록에 역할·고유 특성·선택한 지능 보정을 적용한 값.'});
  const combatStats=r.item('전투 수치',`상처 ${stats.Wounds} / 경계 ${stats.Awareness} / 장갑 ${stats.Armor} / 방어 ${stats.Defense}`,statPage,{group:'능력치',detail:o.tier==='easy'?'쉬움 난도의 기본 장갑·방어는 없음.':`기본 블록의 장갑 또는 방어 중 ${bp.defenseVariant<=3?'장갑':'방어'}를 선택한 뒤 고유 특성을 적용. 선택 확률은 각각 50%.`});
  const extra=damageBonus?`${damageBonus>0?'+':''}${damageBonus}`:'';
  const penalty=['Swarm','Psychic'].includes(role)?'−1d10':'';
  r.item('공격과 피해',`공격 ${attack>=0?'+':''}${attack} / 피해 ${damage}${extra}${penalty}`,statPage,{group:'능력치',detail:`근접 피해에 크기 보정 ${small>=0?'+':''}${small} 추가.${role==='Ranged'?` 근접 공격 ${meleeBonus}, 원거리 공격 +${rangedBonus}.`:''}${o.tier==='overwhelming'?' 매 턴 2회 공격.':''}`});
  if(!['Brute','Swarm'].includes(role)){const rangeDie=bp.rangeDie??r.raw('creature-range','공격 사거리 D10',10,statPage);bp.rangeDie=rangeDie;const range=rangeDie+(o.tier==='easy'?1:o.tier==='standard'?2:3);r.item('원거리 사거리',String(range),statPage,{group:'능력치'});}
  bp.abilities??={};const abilityId=role==='Psychic'?'psychic-ability':'enemy-ability';bp.abilities[abilityId]??=[];
  for(let i=0;i<Math.max(0,stats.abilities);i++){const a=r.table(abilityId,`특수 능력 ${i+1}`,bp.abilities[abilityId][i]);bp.abilities[abilityId][i]=a.value;}
  const carapaces=abilityId==='enemy-ability'?bp.abilities[abilityId].slice(0,Math.max(0,stats.abilities)).filter(value=>value===3).length:0;
  if(carapaces){
    stats.Armor+=3;combatStats.text=`상처 ${stats.Wounds} / 경계 ${stats.Awareness} / 장갑 ${stats.Armor} / 방어 ${stats.Defense}`;
    combatStats.detail+=' Carapace의 장갑 +3이 반영된 값.';
    if(carapaces>1)r.item('중복 Carapace','장갑 +3을 한 번 반영. 원문에 같은 능력의 중첩 지시가 없으므로 추가 중첩 여부는 직접 정하세요.',281,{group:'조건부 규칙'});
  }
  identity('appearance','외형');identity('covering','외형');identity('unique-feature','외형');
  const limbs=identity('limb-count','외형');
  r.item('기본 이동',`${limbs.value>=3?2:1}헥스/라운드 · 역할의 추가 이동 조건은 역할 참조 적용`,269,{group:'능력치'});
  if(limbs.value>1){if(o.aquatic)identity('aquatic-limbs','외형');else{identity('hindlimbs','외형');identity('forelimbs','외형');}}
  identity('mouth','외형');const eyes=identity('eye-type','외형');if(eyes.value>2)identity('eye-count','외형');
  const n=identity('name-syllables','이름').value,count=n<=2?1:n<=6?2:3,parts=[];
  for(let i=0;i<count;i++)parts.push(identity(`creature-name-${i+1}`,'이름').row.key);
  run.headline=bp.name??creatureName(parts);bp.name=run.headline;bp.role=role;run.blueprint=bp;run.enemy={name:run.headline,type,role,tier:o.tier};
  if(o.tier!=='easy'){
    const reactions={standard:[['피해 +2','도주 시도'],['방어 +2','공격 +2'],['방어 −2','도주 시도']],elite:[['피해 +5','방어 +2'],['방어 +5','공격 +5'],['방어 −2','도주 시도']],overwhelming:[['피해 +7','방어 +5'],['방어 +7','공격 +7'],['방어 −2','도주 시도']]}[o.tier];
    const labels=['유혈(Bloodied)','궁지(Cornered)','압도(Overwhelmed)'];bp.recoveryChoices??={};bp.recoveryChoices[o.tier]??=[];
    const chosen=reactions.map((pair,index)=>{const choice=bp.recoveryChoices[o.tier][index]??r.raw(`recovery-choice-${index}`,`${labels[index]} 반응 선택`,6,statPage);bp.recoveryChoices[o.tier][index]=choice;return `${labels[index]}: ${pair[choice<=3?0:1]}`;});
    r.item('회복 상태',chosen.join(' / '),statPage,{group:'능력치',detail:'각 상태의 두 반응 중 하나를 50% 확률로 정했습니다. 해당 회복 상태가 나왔을 때만 적용합니다. 위 기본 수치에는 아직 더하지 않았습니다.'});
  }
  r.item('역할 참조',ROLE_RULES[role].text,ROLE_RULES[role].page,{group:'조건부 규칙'});run.subline=`${creatureLabel(type)} / ${creatureLabel(role)} / ${tierNames[o.tier]} / ${drive.row.text}`;
  run.notes.push(`이 적의 행동 버튼은 ${creatureLabel(role)} 표를 사용합니다. 잠복형(Lurker)의 비표적 상대 공격 +5 등 조건부 보정은 위 수치에 미리 더하지 않았습니다.`);
}

function planet(r,run){
  const name=[1,2,3].map(i=>r.table(`planet-name-${i}`,'행성 명칭').row.text).join('-');
  r.table('planet-diameter','행성');r.table('atmosphere','행성');r.table('climate','행성');
  const single=r.table('single-biome','생물군계'),biome=r.table('landing-biome','생물군계');
  r.table('sky','첫인상');r.table('daylight','낮·밤 길이');const activity=r.table('activity','생물군계 활동도');run.items.at(-1).page=189;run.trace.at(-1).page=189;
  const environment=BIOME_EFFECTS[biome.value];r.item('생물군계 환경',environment.text,environment.page,{group:'탐사 조건'});
  const hex=r.raw('landing-hex','착륙 칸',100,190);
  r.item('착륙 칸',String(hex),190,{roll:hex,dice:'d100',group:'생물군계',detail:'이 생물군계 100칸 중 착륙한 칸.'});
  run.headline=name;run.subline=`${biome.row.text} · 착륙 칸 ${hex}`;run.adopt={location:'planet',mode:'surface',knownThreats:true,biome:biome.value,singleBiome:single.value>=9};run.generatedName=name;
  run.notes.push('최초 착륙 생물군계는 D10, 인접 생물군계는 D12입니다. 단일 생물군계 행성에서는 경계에서 바꾸지 않습니다. 대기 밀도가 적당해도 마스크 없이 호흡할 수 있다는 뜻은 아닙니다.');
}
function hex(r,run,hooks){
  const c=run.context,environment=BIOME_EFFECTS[c.biome];r.item('생물군계 환경',environment.text,environment.page,{group:'탐사 조건'});let terrain=c.biome===10?null:c.terrain;
  if(c.biome!==10){const t=r.table(`terrain-${c.terrain}`,'지형');terrain=['위험 지형','복잡 지형','생물 서식지','생물군계 의존','순탄한 길'].indexOf(t.row.key);}
  else r.item('수역 생물군계','지형 난도 굴림 생략',194,{group:'지형',detail:'수중 탐사에는 full vacc suit 이상의 장비가 필요합니다.'});
  if(terrain!==null)run.terrain=terrain;
  if(terrain===3){const effects=['분화구로 통과 시간트랙 +1.','용융 금속·메탄 등의 강을 우회하면 +3.','빙하 통과에 시간트랙 +1. 틈 추락 확률 10%.','피난처를 찾지 못하면 모두 200 rads.','각자 Oxygen Pellet 1개 추가 소모, 시간트랙 +1.','활화산 우회에 +3.','달려서 통과하며 각자 Oxygen Pellet 1개 추가 소모.','추가 효과 없음.','용암호 우회에 +3.','지형 난도 사용 안 함.'];r.item('생물군계별 지형 효과',effects[c.biome-1],193,{group:'지형'});
    if(c.biome===3&&r.check('glacier-fall','빙하 틈 추락',10,193,'지형'))r.item('추락 피해','무작위 대원 한 명이 상처 1과 장비 1개 손실.',193,{group:'지형'});
  }
  if(c.biome===10||terrain!==4){
    if(c.knownThreats){
    const active=r.raw('biome-activity-check','새 헥스의 추적 위협 확인',10,189);
    if(active<=2){hooks.knownThreat(r,run);run.notes.push('추적 위협은 기본 조우와 독립적입니다. 수기 기록에 남은 위협이 있을 때만 적용하고 적은 Initiative +2를 받습니다.');}
    }
    if(terrain===2){r.item('서식지 조우','Local Fauna와 자동 조우',193,{group:'지형 조우'});hooks.encounter(r,run,{forcedType:'Local Fauna',ignoreHazard:true,location:'planet'});}
  }else r.item('순탄한 지형','이 헥스에서 전투 조우가 일어나지 않음',193,{group:'지형'});
  const e=r.table('planetside','헥스 내용');run.headline=e.row.text;
  if(e.value<=2){const find=r.table('planet-findings','발견');if(find.value===10)r.table('artifact','발견한 유물');}
  else if(e.value>=6&&e.value<=9){
    const hazard=r.table(`biome-hazards-${c.biome}`,'위험·장애물');
    if((c.biome===8&&hazard.value===3)||(c.biome===9&&[3,4].includes(hazard.value))){
      const page=c.biome===8?213:215,face=r.raw('falling-rubble','낙하물 확인',6,page);
      r.item('낙하물',face===1?'낙하물 발생':'낙하물 없음',page,{group:'위험·장애물',roll:face,dice:'d6',values:[face],detail:face===1?'각 대원은 DEX 판정. 실패하면 상처 D4.':'D6 1에서만 발생. 낙하물의 DEX 판정과 상처는 적용하지 않습니다.'});
    }
    if(c.biome===7&&hazard.value===6)r.table('poison','무작위 독 강도');
    if(/^Encounter\./.test(hazard.row.key)){
      const blocked=()=>r.item('전투 제한','순탄한 길이므로 전투 조우를 적용하지 않음',193,{group:'조우'});
      if(c.biome===1){if(terrain===4)blocked();else hooks.encounter(r,run,{forcedType:'Guardian',ignoreHazard:true,location:'planet'});}
      else {const type=r.table('planet-encounter','조우');if(type.value<=6){if(terrain===4)blocked();else hooks.encounter(r,run,{ignoreHazard:true,location:'planet'});}else r.table('close-encounter','가까운 목격');}
    }
    if(c.biome===7&&hazard.value===7)run.notes.push('금속 구체는 다가간다고 선택한 뒤에만 굴립니다. 보고서 위의 버튼이 그 표입니다.');
  }else if(e.value===10)run.notes.push('Àrsaidh 탐사지를 발견했습니다. 도착표는 다시 굴리지 않습니다. 위의 버튼이 용도·규모·위험과 탐사 한도를 굴립니다.');
  if(run.options.sights)r.table(`biome-sights-${c.biome}`,'5헥스마다 보는 풍경');
  run.subline=`${tables['landing-biome'].rows[c.biome-1].text} · ${c.biome===10?'수중 이동':['위험 지형','복잡 지형','생물 서식지','생물군계 의존','순탄한 길'][terrain]}`;
  run.notes.push(`기본 이동 비용: 시간트랙 +${[3,8,9,10].includes(c.biome)?2:1}. 추가 지형 비용과 보호장비 효과를 수기 시트에 적용하세요. 지형 결과는 보고서의 「이 지형을 이전 헥스로 사용」으로 채택할 수 있습니다.`);
}
export function rollExpression(r,expression){
  let text=expression.replace(/\s/g,'').replace(/−/g,'-').toLowerCase(),multiplier=1;
  const m=text.match(/^(.*?)[x*×](\d+)$/);if(m){text=m[1];multiplier=Number(m[2]);}
  if(!text||!Number.isInteger(multiplier)||multiplier<1||multiplier>1000)throw new Error('주사위 식을 확인하세요. 예: 2d10+5, d100×3.');
  const terms=[...text.matchAll(/([+-]?)(\d*d\d+|\d+)/g)];
  if(terms.map(t=>t[0]).join('')!==text||!terms.some(t=>t[2].includes('d')))throw new Error('지원하지 않는 주사위 식입니다. 예: 2d10+5.');
  let total=0,count=0;
  for(const t of terms){
    const sign=t[1]==='-'?-1:1;
    if(t[2].includes('d')){
      const [a,b]=t[2].split('d'),n=Number(a||1),sides=Number(b);count+=n;
      if(!Number.isInteger(n)||n<1||count>100||!Number.isInteger(sides)||sides<2||sides>100)throw new Error('총 100개 이하, 2–100면 주사위를 사용할 수 있습니다.');
      for(let i=0;i<n;i++)total+=sign*r.raw('custom-die',`${sign<0?'빼는 ':''}D${sides}`,sides,34);
    }else{const n=Number(t[2]);if(n>10000)throw new Error('보정값은 10,000 이하여야 합니다.');total+=sign*n;}
  }
  return total*multiplier;
}

export function runExtended(id,r,run,hooks){
  const o=run.options,c=run.context;
  if(id==='planet')planet(r,run);
  else if(id==='biome-border'){
    if(c.singleBiome){run.headline='현재 생물군계를 유지합니다';run.subline='단일 생물군계 행성이므로 인접 생물군계를 다시 굴리지 않습니다.';return true;}
    const result=r.table('biome','인접 생물군계'),biome=result.value<=10?result.value:c.biome;
    const environment=BIOME_EFFECTS[biome];r.item('생물군계 환경',environment.text,environment.page,{group:'탐사 조건'});
    const activity=r.table('activity','새 생물군계 활동도');run.items.at(-1).page=189;run.trace.at(-1).page=189;
    run.headline=tables['landing-biome'].rows[biome-1].text;run.subline=`새 생물군계 · ${activity.row.text}`;
    run.adopt={location:'planet',mode:'surface',biome,singleBiome:false,knownThreats:true,terrain:4};run.generatedName=`${c.siteName.split(' · ')[0].slice(0,160)||'행성'} · ${run.headline}`;
  }
  else if(id==='hex')hex(r,run,hooks);
  else if(id==='creature')creature(r,run);
  else if(id==='npc-profile'){
    const name=`${r.table('given-name','이름').row.text} ${r.table('surname','이름').row.text}`;
    for(const t of ['age','gender','npc-nature','npc-descriptor','npc-quirk','character-motivation'])r.table(t,'인물');
    r.table('npc-attributes','동료 능력치');r.table('npc-talents','동료 재능');
    run.headline=name;run.subline='이름·성향·동기와 간소화한 NPC 대원 능력치';
    run.notes.push('NPC 대원은 기본 Wounds 3, Defense 2. Skills 대신 해당 Attribute를 사용하며 Stamina·Luck·Emotional State는 사용하지 않습니다(p.359).');
  }
  else if(id==='emotion'){
    const mood=r.table('mood','감정');run.headline=mood.row.text;run.subline='전반적 감정';
    if(mood.value>1&&o.moodDepth>=2){const detail=r.table(`mood-${mood.value}`,'세부 감정');run.subline=detail.row.text;
      if(o.moodDepth>=3){const key=`mood-${mood.value}-${detail.value}`;if(tables[key].rollable===false){run.manualTableId=key;run.notes.push(tables[key].sourceNote);}else run.headline=r.table(key,'감정의 뿌리').row.text;}
    }
  }
  else if(id==='information'){const type=r.table('information-type','정보'),topic=r.table('information-topic','정보');run.headline=`${topic.row.text} · ${type.row.text}`;run.subline=o.details?hooks.inspiration(r):'현재 사건과 연결해 해석하세요.';}
  else if(id==='conversation'){
    const topic=r.table('conversation','대화 주제');r.table('reaction','첫 인물의 반응');r.table('reaction','둘째 인물의 반응');run.headline=topic.row.text;run.subline=o.details?hooks.inspiration(r):'반응을 인물들의 관계에 연결하세요.';
    run.notes.push('항해 중 대화에서 긍정 반응은 PC Stress -1, 부정 반응은 +1. 필요하면 Relations 표로 관계도 확인하세요.');
  }
  else if(id==='combat-start'){
    if(!o.combatAmbush&&o.checkEncounterReaction&&c.hazard!==4){const reaction=r.table('encounter-reaction','전투 전 반응');if(reaction.value>=9){run.headline='상대가 대원들을 무시하고 떠납니다';run.subline='전투 배치·기습·엄폐는 굴리지 않았습니다.';return true;}}
    r.table('placement','PC 배치');r.table('placement','상대 배치');
    let surprise=1;if(o.combatAmbush){surprise=3;r.item('기습','이미 확정된 적의 매복 · 적 우선권 +2',138,{group:'전투 시작'});}else if(o.cautious)r.item('기습','대원들이 Cautious이므로 기습 굴림 생략',52,{group:'전투 시작'});else surprise=r.table('combat-surprise','전투 시작').value;
    if(surprise>=5){run.items=run.items.filter(item=>!(item.tableId==='placement'&&item.group==='PC 배치'));run.trace.find(t=>t.id==='placement').discarded=true;r.item('PC 배치','상대를 먼저 배치한 뒤 PC들의 위치를 직접 선택.',53,{group:'PC 배치',detail:'PC가 기습했으므로 먼저 굴린 PC 방향은 적용하지 않습니다.'});}
    if(!o.combatAmbush&&(surprise<=2||surprise>=5))r.table('encounter-activity','상대가 하던 행동');
    if(o.generateCover)r.table('cover','엄폐 배치');run.headline='전투 구역이 준비되었습니다';run.subline=surprise>=3&&surprise<=4?'PC들이 기습당함':surprise>=5?'상대가 기습당함':'기습 없이 조우';run.ambush=o.combatAmbush;run.notes.push('기습한 쪽은 Initiative +2. 같은 방향에 배치되면 가능한 한 멀리 떨어집니다.');
  }
  else if(id==='behavior'){
    if(o.retarget)r.table('target','공격 대상');const b=r.table(`behavior-${o.behavior}`,'이번 행동');run.headline=b.row.text;run.subline=tables[`behavior-${o.behavior}`].title;
    run.notes.push('공격·능력의 선택과 판정은 현재 전장에 맞춰 적용하세요. 부상과 자원은 종이 시트에 기록합니다.');
  }
  else if(id==='injury'){const i=r.modifiedTable('injury',o.injuryModifier??0,'부상');run.headline=i.row.text;if((i.rawValue??i.value)===1)r.table('critical-injury','치명적 부상');run.subline='부상과 효과를 종이 시트에 기록하세요.';}
  else if(id==='stress'){
    if(o.stressMode==='breakdown'){r.table('obsession','강박');hooks.trauma(r,run);run.headline='스트레스 20 누적';run.subline='스트레스 초기화 · 트라우마 +1 · 강박과 트라우마 효과';r.item('시트 반영','스트레스를 초기화하고 트라우마 1점을 받는다.',[96,98],{group:'시트 반영'});run.notes.push('p.96은 스트레스 20에서 강박, p.98은 같은 조건에서 트라우마 +1과 트라우마 표 굴림을 지시합니다. 두 항목을 함께 생성했습니다.');}
    else {const s=r.table(c.presentCrew>1?'stress-group':'stress-alone','스트레스 반응');run.headline=s.row.text;run.subline=c.presentCrew>1?'다른 대원들과 함께 있음':'혼자 있음';run.notes.push('10 Stress 누적 또는 GM 판단 후 Resolve 실패 시 사용합니다. 별도 기간이 없으면 Stress를 조금이라도 잃을 때 반응이 끝납니다(p.94–95).');}
  }
  else if(id==='trauma'){hooks.trauma(r,run);run.subline='장기 효과를 종이 시트에 기록하세요.';}
  else if(id==='gear-check'){
    if(o.gearAction==='availability'){
      const face=r.raw('gear-availability','희귀 장비 입수 D20',20,365),bonus=o.bribeSteps+(o.goldTier?2:0),threshold=o.wellConnected?12:15,total=face+bonus;
      run.headline=total>=threshold?'구매 가능':'이번 임무 후에는 구매 불가';run.subline=`${face} + ${bonus} = ${total} / ${threshold} 이상`;
      r.item('입수 판정',run.headline,365,{group:'입수'});r.item('입수 수치',`D20 ${face} / 보정 +${bonus} / 합계 ${total} / 목표 ${threshold}`,365,{group:'입수',effectDice:false});
      r.item('추가 지출',`${o.bribeSteps*50} DC`,365,{group:'입수 조건',detail:'선택한 뇌물 비용. 장비 자체 가격은 별도이며 종이 시트에 반영하세요.'});
      run.notes.push('임무를 마칠 때마다 희귀 장비 입수 확인은 한 번. 기본 장비는 굴림 없이 구매할 수 있습니다. Gold는 +2, Well Connected는 목표 12(p.21). 실험 장비는 레벨 10 이상이며 캠페인당 종류별 하나만 구매할 수 있습니다.');
    }else{
      const face=r.raw('experimental-check','실험 장비 작동 D20',20,366);r.item('작동 확인',face===1?'오작동':'정상 작동',366,{roll:face,dice:'d20',values:[face],group:'장비'});run.headline=face===1?'실험 장비 오작동':'정상 작동';run.subline='실험 장비를 사용할 때마다 D20 · 1에서 오작동';if(face===1)r.table('experimental-malfunction','오작동 결과');
    }
  }
  else if(id==='station'){
    const ids={carousing:'carousing',night:'last-night',locals:'locals',news:'corporate-news'};
    if(o.stationActivity==='news'){const corporation=r.table('corporation','기업'),news=r.table('corporate-news','뉴스');run.headline=`${corporation.row.text} · ${news.row.text}`;}
    else {const v=r.table(ids[o.stationActivity],'정거장');run.headline=v.row.text;if(o.stationActivity==='carousing'&&v.value===45)r.table('carousing-jewelry','발견한 물건');}
    run.subline='Karum Station에서의 한 장면';
  }
  else if(id==='ship-name'){const adjective=r.table('ship-adjective','우주선 명명'),name=r.table('ship-name','우주선 명명');run.headline=`${adjective.row.text} ${name.row.text}`;run.subline='대원들이 배에 붙인 이름';}
  else if(id==='site-name'){const parts=[1,2,3].map(i=>r.table(`site-name-${i}`,'탐사지 명명').row.text);run.headline=parts[0].replace(/-$/,'')+parts[1]+'-'+parts[2];run.subline='KSA 명명 규칙에 따른 세 음절·코드 굴림';}
  else if(id==='hacking'){
    if(o.hackingRandom){o.hackingDifficulty=r.table('hacking-difficulty','시스템 난도').value;o.hackingRandom=false;}
    const values=Array.from({length:o.hackingDifficulty},()=>r.raw('hacking-node','해킹 D6',6,102));run.hacking={values};
    run.headline=values.includes(1)?'시스템이 잠깁니다':'해킹에 성공합니다';run.subline=`난도 ${o.hackingDifficulty} · ${values.join(' / ')}`;
    run.notes.push('Hacking 재능이 있어야 시도할 수 있습니다. 난도만큼 라운드가 걸립니다. 성공한 Àrsaidh Technology 판정은 1회, Cypher는 1회, Black Cypher는 2회 재굴림을 허용합니다. 사용한 시트 자원에 맞춰 아래 주사위를 선택하세요.');
  }
  else if(id==='dice'){const n=rollExpression(r,o.diceExpression),preset=DICE_PRESETS.find(p=>p.id===o.dicePreset&&p.expression===o.diceExpression);run.headline=String(n);run.subline=o.diceExpression;
    if(preset){run.title=preset.name;run.subline=`${o.diceExpression} · ${n}${preset.unit}`;for(const trace of run.trace)trace.page=preset.page;}
    r.item(preset?.name??'직접 입력한 주사위 식',`${o.diceExpression} = ${n}${preset?.unit??''}`,preset?.page??34,{detail:preset?.note??'앱의 일반 주사위 편의 기능. 특정 판정의 성공 조건이나 시트 수치를 자동 적용하지 않습니다.'});
    const outcome=preset&&dicePresetOutcome(preset.id,n,o);
    if(outcome)r.item('적용 결과',outcome,preset.page,{group:'보조굴림',detail:preset.id==='ship-search'?`${o.searchHexes}번째 헥스 · 발견 확률 ${o.searchHexes*10}%`:''});}
  else if(id==='alternate'){const a=r.table('alternate-access','우회 경로');run.headline=a.row.text;if(a.value<=5)hooks.encounter(r,run);else hooks.security(r,run);run.subline='우회 경로 탐색 · 시간트랙 +1';}
  else if(id==='activity'){
    run.headline='한 시간이 지났습니다';run.subline='소모품과 지속 효과를 종이 시트에서 갱신하세요.';
    if(c.mode==='site'&&c.hazard===3)r.item('붕괴하는 시설','무작위 대원 한 명이 DEX 판정. 실패하면 낙하 잔해로 3D10 피해.',140,{group:'시간 초기화 위험'});
    if(c.mode!=='surface'&&c.knownThreats){const v=r.raw('site-activity-check','장소 활동 확인',10,138);r.item('활동 확인',v<=2?'추적 위협의 매복':'매복 없음',138,{roll:v,dice:'d10'});if(v<=2)hooks.knownThreat(r,run);}
    else r.item('추적 위협',c.mode==='surface'?'야외에서는 새 헥스 진입 때 확인하므로 추가 매복 굴림 없음':'남은 위협이 없어 활동 굴림 생략',c.mode==='surface'?189:138);
    run.notes.push('각 인물 Battery 1개와 Oxygen Pellet 1개 소비. 직전 트랙에서 사격했다면 Ammo 1개 소비. 반전 확률은 1/6로 직접 되돌리고, 남은 매복 횟수·지속 효과를 갱신하세요(p.129, 227).');
  }
  else if(id==='artifact-activate'){const a=r.table('artifact-activation','활성화');run.headline=a.row.text;run.subline='Technology 판정에 성공한 뒤 사용하는 표';if(a.value===7)r.table('talents','장소를 떠날 때까지 얻는 재능');}
  else if(id==='appraisal'){
    let artifacts=0;
    for(let i=0;i<o.artifactCount;i++){const a=r.table('artifact-value',`유물 ${i+1} 감정`);artifacts+=[0,10,25,50,75,100][a.value-1];}
    const resources=o.crystalCount*50+o.alloyCount*75,records=5*(o.findCount+o.encounterCount);
    run.headline=`유물 감정 합계 ${artifacts} DC`;run.subline=`자원 ${resources} DC · 기록 보수 ${records} DC · 합계 ${artifacts+resources+records} DC`;
    r.item('정산 내역',`유물 ${artifacts} + 데이터 크리스털 ${o.crystalCount}×50 + 합금 큐브 ${o.alloyCount}×75 + 발견·조우 기록 ${o.findCount+o.encounterCount}×5 = ${artifacts+resources+records} DC`,153,{group:'정산'});
    run.notes.push('KSA 귀환 후 평가하는 금액입니다. 원문은 자원·유물 발견 기록과 기록한 조우마다 5 DC를 추가 지급합니다. 입력한 기록 수와 팀의 분배를 확인하고 DC·매각 물품은 종이에 반영하세요.');
  }
  else if(id==='scatter'){const d=r.raw('scatter-distance','표적에서 벗어난 거리',4,63),direction=r.table('scatter-direction','산포');run.headline=`${direction.row.text}쪽 ${d}헥스`;run.subline='투척 DEX 판정에 실패한 폭발물';run.notes.push('전투 격자 밖으로 벗어나면 효과 없이 잃어버립니다.');}
  else return false;
  return true;
}
