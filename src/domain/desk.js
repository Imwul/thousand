import {PROCEDURES} from './model.js';

export const PAPER_CHECKS = [
  {id:'copied',label:'결과 요지를 종이에 옮김'},
  {id:'named',label:'이름·장소를 종이에 적음'},
  {id:'time',label:'시간트랙은 종이에만 반영'},
  {id:'sheet',label:'상처·스트레스·물품은 시트에'}
];

/** Existing procedures only. These links do not add tables or change the paper sheet. */
export const NEXT_STEPS = {
  question:['scene','inspiration','surprise'],
  scene:['area','npc','surprise'],
  area:['door','creature','npc'],
  arrival:['area','site-name','hex'],
  npc:['conversation','information','npc-profile'],
  travel:['arrival','surprise','planet'],
  surprise:['question','combat-start','inspiration'],
  inspiration:['question','scene','resolution'],
  door:['area','hacking','alternate'],
  resolution:['injury','question','inspiration'],
  planet:['hex','site-name','arrival'],
  hex:['creature','surprise','area'],
  creature:['combat-start','behavior','injury'],
  'npc-profile':['conversation','emotion','information'],
  emotion:['conversation','information','question'],
  information:['question','inspiration','conversation'],
  conversation:['information','emotion','npc'],
  'combat-start':['behavior','injury','stress'],
  behavior:['injury','resolution','stress'],
  injury:['stress','trauma','question'],
  stress:['trauma','question','scene'],
  trauma:['stress','question'],
  'biome-border':['hex','question','inspiration'],
  appraisal:['station','npc','travel'],
  station:['appraisal','npc','information'],
  'ship-name':['travel','arrival'],
  'site-name':['arrival','area'],
  hacking:['door','alternate','area'],
  dice:['resolution','injury'],
  alternate:['area','activity','door'],
  activity:['surprise','creature','area'],
  'artifact-activate':['question','inspiration'],
  scatter:['injury','combat-start']
};

const PROCEDURE_IDS = new Set(PROCEDURES.map(p=>p.id));
const PAPER_IDS = new Set(PAPER_CHECKS.map(item=>item.id));

export function nextStepIds(procedureId){
  return (NEXT_STEPS[procedureId]??[]).filter(id=>PROCEDURE_IDS.has(id));
}
export function sanitizePaper(value){
  if(!Array.isArray(value)||value.length>PAPER_CHECKS.length||new Set(value).size!==value.length||value.some(id=>!PAPER_IDS.has(id)))throw new Error('종이 체크가 손상되었습니다.');
  return [...value];
}
export function sanitizeRecent(value){
  if(!Array.isArray(value)||value.length>8||new Set(value).size!==value.length||value.some(id=>!PROCEDURE_IDS.has(id)))throw new Error('최근 상황 목록이 손상되었습니다.');
  return [...value];
}
