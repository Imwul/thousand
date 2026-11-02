import {PROCEDURES} from './model.js';
import {nextStepIds} from './desk.js';

export const PROCEDURE_GROUPS = [
  {id:'ask',label:'질문',ids:['question','scene','surprise','inspiration','resolution']},
  {id:'voyage',label:'항해',ids:['travel','ship-name','arrival']},
  {id:'site',label:'시설',ids:['site-name','area','door','hacking','alternate','time-step','activity','artifact-activate']},
  {id:'planet',label:'행성',ids:['planet','hex','biome-border']},
  {id:'people',label:'인물',ids:['npc','npc-profile','emotion','information','conversation']},
  {id:'fight',label:'전투',ids:['creature','combat-start','behavior','injury','stress','trauma','dread','scatter','dice']},
  {id:'station',label:'정거장',ids:['station','appraisal','gear-check']}
];

const PROCEDURE_IDS = new Set(PROCEDURES.map(procedure=>procedure.id));
const named = (run,title)=>run.items?.find(item=>item.title===title);
const texts = (run,pred)=>(run.items??[]).filter(pred).map(item=>item.text);

function doorCarry(run){
  const items=run.items??[];
  const effect=items.find(item=>item.tableId==='door')?.detail;
  const behind=items.find(item=>item.tableId==='behind-door');
  const out=[];
  if(effect) out.push(effect);
  if(behind?.text) out.push(behind.text);
  if(behind){
    const crystals=items.find(item=>item.title==='데이터 크리스털');
    const alloys=items.find(item=>item.title==='합금 큐브');
    if(crystals?.text) out.push(`데이터 크리스털 ${crystals.text}`);
    if(alloys?.text) out.push(`합금 큐브 ${alloys.text}`);
  }
  return out;
}
function siteCarry(run){
  const hazard=run.items?.find(item=>item.tableId==='hazard');
  return [named(run,'Site Report 준비')?.text,named(run,'장소의 과거')?.text,named(run,'지상 시설의 주변')?.text,hazard?.detail];
}
function hexCarry(run){
  const items=run.items??[];
  const hazard=items.find(item=>typeof item.tableId==='string'&&item.tableId.startsWith('biome-hazards-'));
  return [
    hazard?.text,
    items.find(item=>item.tableId==='planet-findings')?.text,
    ...texts(run,item=>item.tableId==='artifact'),
    items.find(item=>item.tableId==='planet-encounter')?.text,
    items.find(item=>item.tableId==='close-encounter')?.text,
    ...texts(run,item=>item.title==='조우 구성'||(typeof item.tableId==='string'&&/^encounter-\d+\./.test(item.tableId))),
    ...texts(run,item=>item.title==='생물 유형'||item.tableId==='creature-planet'||item.tableId==='creature-space'),
    ...texts(run,item=>item.tableId==='creature-size'),
    ...texts(run,item=>item.title==='전투 제한'),
    items.find(item=>item.tableId==='known-threat')?.text
  ];
}

function pick(ids){
  const chosen=[];
  for(const id of ids) if(PROCEDURE_IDS.has(id)&&!chosen.includes(id)) chosen.push(id);
  return chosen.slice(0,3);
}

export function guideNext(procedureId,run){
  if(run?.procedureId==='encounter-roster')return pick(['combat-start','behavior','injury']);
  if(run?.enemy?.known)return pick(['combat-start','behavior','injury']);
  if(run?.siteFromHex===true) return pick(['area','site-name','door']);
  if(run?.encounter)return pick(['creature','combat-start','question']);
  const fallback=nextStepIds(procedureId);
  if(!run||run.procedureId!==procedureId) return fallback;
  if(run.pending?.type==='lock') return pick(['hacking','alternate','question']);
  if(run.procedureId==='arrival'){
    if(!run.adopt) return pick(['travel','question','inspiration']);
    return run.adopt.location==='planet'?pick(['planet','site-name','area']):pick(['area','site-name','door']);
  }
  if(run.procedureId==='travel'&&run.options?.voyage==='return')return run.arrived?pick(['appraisal','station','npc']):pick(['travel','question','surprise']);
  if(run.procedureId==='travel') return run.headline==='목적지 도착'?pick(['arrival','planet','site-name']):pick(['travel','question','surprise']);
  if(run.procedureId==='door'&&/열립니다/.test(run.headline??'')) return pick(['area','question','npc']);
  if(run.procedureId==='area'&&run.encounter)return pick(['creature','combat-start','question']);
  if(run.procedureId==='area'&&run.items?.some(i=>i.tableId==='artifact'))return pick(['artifact-activate','area','question']);
  if(run.procedureId==='area'&&run.items?.some(i=>i.title==='데이터 크리스털'))return pick(['area','question','appraisal']);
  if(run.procedureId==='area'&&/매복/.test(run.headline??'')) return pick(['combat-start','creature','injury']);
  if(run.procedureId==='scene') return /예상 밖/.test(run.headline??'')?pick(['question','area','npc']):pick(['area','npc','question']);
  if(run.procedureId==='combat-start'&&/떠납/.test(run.headline??'')) return pick(['question','scene','npc']);
  if(run.procedureId==='biome-border')return pick(['hex','question','inspiration']);
  if(run.procedureId==='planet')return pick(['hex','question','biome-border']);
  if(run.procedureId==='hex'){
    if(run.notes?.some(note=>note.includes('Àrsaidh 탐사지를 발견'))) return pick(['site-name','question','inspiration']);
    if(run.items?.some(item=>item.title==='조우 구성'||item.title==='생물 유형'||item.tableId==='encounter-difficulty')) return pick(['creature','combat-start','injury']);
  }
  if(run.procedureId==='hex')return pick(['hex','question','biome-border']);
  return fallback;
}

const COACHING_SUBLINES=new Set([
  '안쪽 또는 바깥쪽을 선택해 잠금 해제를 시도하세요.',
  '떠올린 장소와 인물로 장면을 이어가세요.'
]);

function journalLine(run,extra=[],skipSubline=false){
  const question=run.procedureId==='question'&&typeof run.options?.question==='string'?run.options.question.trim():'';
  const subline=skipSubline||COACHING_SUBLINES.has(run.subline)?'':run.subline;
  const parts=[question,run.headline,subline,...extra].map(part=>typeof part==='string'?part.trim():'').filter(Boolean);
  const unique=[];
  for(const part of parts) if(!unique.includes(part)) unique.push(part);
  return unique.join(' · ');
}

export function copyLine(run){
  if(!run) return '';
  const door=doorCarry(run);
  if(run.procedureId==='planet') return journalLine(run,[named(run,'장소 활동도')?.text,...door]);
  if(run.procedureId==='creature') return journalLine(run,[named(run,'기본 능력치')?.text,named(run,'전투 수치')?.text,named(run,'공격과 피해')?.text,...door]);
  if((run.procedureId==='arrival'&&run.adopt)||run.siteFromHex===true) return journalLine(run,[...siteCarry(run),...door]);
  if(run.procedureId==='npc-profile') return journalLine(run,[named(run,'NPC 기본 능력치')?.text,...door]);
  if(run.procedureId==='injury') return journalLine(run,[named(run,'치명적 부상')?.text,...door],true);
  if(run.procedureId==='trauma') return journalLine(run,[named(run,'부정적 특성')?.text,...door],true);
  if(run.procedureId==='activity') return journalLine(run,[named(run,'활동 확인')?.text,named(run,'추적 위협')?.text,...door],true);
  if(run.procedureId==='hex') return journalLine(run,[...hexCarry(run),...door]);
  if(run.procedureId==='door') return journalLine(run,door);
  return journalLine(run,door);
}

function timeAct(run){
  const blob=[run.subline,...(run.notes??[])].join('\n');
  const attempt=blob.match(/시도마다 시간트랙 \+(\d+)/);
  if(attempt) return {id:'time',text:`잠금 시도마다 종이 시간트랙 +${attempt[1]}`};
  const move=blob.match(/시간트랙 \+(\d+)/);
  if(move) return {id:'time',text:`종이 시간트랙 +${move[1]}`};
  return null;
}

export function playGuide(run,records=[]){
  if(!run) return {acts:[],copy:'',next:[],approach:null,foundSite:null,landing:null};
  const acts=[];
  const landing=run.items?.find(item=>item.title==='착륙 칸'&&Number.isInteger(item.roll)&&item.roll>=1&&item.roll<=100);
  if(landing) acts.push({id:'landing',text:`착륙 칸 ${landing.roll}을 지도에 표시`});
  const time=timeAct(run);
  if(time) acts.push(time);
  const blob=[run.subline,...(run.notes??[])].join('\n');
  if(/Oxygen Tank 1개와 Supplies 1개|산소 탱크 1개와 보급품 1개/.test(blob)) acts.push({id:'rations',text:'대원마다 산소 탱크 1, 보급품 1'});
  if(/Battery 1개와 Oxygen Pellet 1개|배터리 1개와 산소 펠릿 1개/.test(blob)) acts.push({id:'reset',text:'배터리 1 · 산소 펠릿 1 · 사격했다면 탄약 1'});
  if(run.procedureId==='injury') acts.push({id:'injury',text:'부상과 효과를 시트에'});
  if(run.procedureId==='trauma') acts.push({id:'trauma',text:'장기 효과를 시트에'});
  const gear=run.items?.find(item=>item.title==='보호장비');
  if(gear?.text) acts.push({id:'gear',text:gear.text});
  const globe=run.items?.some(item=>item.tableId==='biome-hazards-7'&&item.roll===7);
  const child=globe?records.find(record=>record.parentId===run.id&&record.tableId==='toxic-globe'):null;
  const approach=globe?{tableId:'toxic-globe',text:child?'다가간 결과 열기':'금속 구체에 다가간다',recordId:child?.id??null}:null;
  const discovered=run.procedureId==='hex'&&run.notes?.some(note=>note.includes('Àrsaidh 탐사지를 발견'));
  const siteChild=discovered?records.find(record=>record.parentId===run.id&&record.siteFromHex===true):null;
  const foundSite=discovered?{text:siteChild?'생성한 시설 열기':'용도·규모·위험 굴리기',recordId:siteChild?.id??null}:null;
  return {acts,copy:copyLine(run),next:guideNext(run.procedureId,run),approach,foundSite,landing:landing?.roll??null};
}
