import {PROCEDURES} from './model.js';
import {nextStepIds} from './desk.js';

export const PROCEDURE_GROUPS = [
  {id:'ask',label:'질문',ids:['question','scene','surprise','inspiration','resolution']},
  {id:'voyage',label:'항해',ids:['travel','ship-name','arrival']},
  {id:'site',label:'시설',ids:['site-name','area','door','hacking','alternate','activity','artifact-activate']},
  {id:'planet',label:'행성',ids:['planet','hex']},
  {id:'people',label:'인물',ids:['npc','npc-profile','emotion','information','conversation']},
  {id:'fight',label:'전투',ids:['creature','combat-start','behavior','injury','stress','trauma','scatter','dice']},
  {id:'station',label:'정거장',ids:['station']}
];

const PROCEDURE_IDS = new Set(PROCEDURES.map(procedure=>procedure.id));
const named = (run,title)=>run.items?.find(item=>item.title===title);

function pick(ids){
  const chosen=[];
  for(const id of ids) if(PROCEDURE_IDS.has(id)&&!chosen.includes(id)) chosen.push(id);
  return chosen.slice(0,3);
}

export function guideNext(procedureId,run){
  const fallback=nextStepIds(procedureId);
  if(!run||run.procedureId!==procedureId) return fallback;
  if(run.pending?.type==='lock') return pick(['hacking','alternate','question']);
  if(run.procedureId==='arrival'){
    if(!run.adopt) return pick(['travel','question','inspiration']);
    return run.adopt.location==='planet'?pick(['planet','site-name','area']):pick(['area','site-name','door']);
  }
  if(run.procedureId==='travel') return run.headline==='목적지 도착'?pick(['arrival','planet','site-name']):pick(['travel','question','surprise']);
  if(run.procedureId==='door'&&/열립니다/.test(run.headline??'')) return pick(['area','question','npc']);
  if(run.procedureId==='area'&&/매복/.test(run.headline??'')) return pick(['combat-start','creature','injury']);
  if(run.procedureId==='scene') return /예상 밖/.test(run.headline??'')?pick(['question','area','npc']):pick(['area','npc','question']);
  if(run.procedureId==='combat-start'&&/떠납/.test(run.headline??'')) return pick(['question','scene','npc']);
  if(run.procedureId==='hex'){
    if(run.notes?.some(note=>note.includes('Àrsaidh 탐사지를 발견'))) return pick(['site-name','question','inspiration']);
    if(run.items?.some(item=>item.title==='조우 구성'||item.title==='생물 유형'||item.tableId==='encounter-difficulty')) return pick(['creature','combat-start','injury']);
  }
  return fallback;
}

export function copyLine(run){
  if(!run) return '';
  if(run.procedureId==='planet') return [run.headline,run.subline,named(run,'장소 활동도')?.text].filter(Boolean).join(' · ');
  if(run.procedureId==='creature') return [run.headline,named(run,'기본 능력치')?.text,named(run,'전투 수치')?.text,named(run,'공격과 피해')?.text].filter(Boolean).join(' · ');
  if(run.procedureId==='travel') return [run.headline,run.subline].filter(Boolean).join(' · ');
  if(run.procedureId==='arrival'&&run.adopt) return [run.headline,run.subline,named(run,'Site Report 준비')?.text].filter(Boolean).join(' · ');
  if(run.procedureId==='npc-profile') return [run.headline,named(run,'NPC 기본 능력치')?.text].filter(Boolean).join(' · ');
  return '';
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
  if(!run) return {acts:[],copy:'',next:[],approach:null,landing:null};
  const acts=[];
  const landing=run.items?.find(item=>item.title==='착륙 칸'&&Number.isInteger(item.roll)&&item.roll>=1&&item.roll<=100);
  if(landing) acts.push({id:'landing',text:`착륙 칸 ${landing.roll}을 지도에 표시`});
  const time=timeAct(run);
  if(time) acts.push(time);
  const blob=[run.subline,...(run.notes??[])].join('\n');
  if(/Oxygen Tank 1개와 Supplies 1개|산소 탱크 1개와 보급품 1개/.test(blob)) acts.push({id:'rations',text:'대원마다 산소 탱크 1, 보급품 1'});
  if(/Battery 1개와 Oxygen Pellet 1개|배터리 1개와 산소 펠릿 1개/.test(blob)) acts.push({id:'reset',text:'배터리 1 · 산소 펠릿 1 · 사격했다면 탄약 1'});
  if(run.procedureId==='hex'&&run.notes?.some(note=>note.includes('Àrsaidh 탐사지를 발견'))) acts.push({id:'site',text:'용도·규모·위험은 표 찾아보기에서 따로 굴리세요'});
  const globe=run.items?.some(item=>item.tableId==='biome-hazards-7'&&item.roll===7);
  const child=globe?records.find(record=>record.parentId===run.id&&record.tableId==='toxic-globe'):null;
  const approach=globe?{tableId:'toxic-globe',text:child?'다가간 결과 열기':'금속 구체에 다가간다',recordId:child?.id??null}:null;
  return {acts,copy:copyLine(run),next:guideNext(run.procedureId,run),approach,landing:landing?.roll??null};
}
