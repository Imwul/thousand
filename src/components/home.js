import {PROCEDURES} from '../domain/model.js';
import {PROCEDURE_GROUPS} from '../domain/play.js';
import {esc,icon} from './icons.js';

const QUICK_PROCEDURES=[
  ['question','예·아니오와 해석 단서'],
  ['area','새 구역과 연결부·발견'],
  ['hex','지형과 생물군계별 사건'],
  ['behavior','역할에 맞는 전투 행동'],
  ['stress','스트레스 반응·정신 붕괴'],
  ['dice','주사위 식과 룰북 보조굴림']
];
const procedureById=new Map(PROCEDURES.map(procedure=>[procedure.id,procedure]));

function procedureButton(procedure,className='home-procedure'){
  return `<button type="button" class="${className}" data-action="home-procedure" data-id="${esc(procedure.id)}"><span>${esc(procedure.name)}</span><small>${esc(procedure.en)}</small></button>`;
}

export function homeView({procedureId='question',record=null,recent=[]}={}){
  const procedure=procedureById.get(procedureId)??procedureById.get('question');
  const resumeTitle=record?.title||procedure.name;
  const resumeDetail=record?(record.headline||'저장된 굴림'):'굴림 옵션 열기';
  const recentProcedures=[...new Set(recent)].map(id=>procedureById.get(id)).filter(Boolean).slice(0,5);
  return `<header class="home-heading"><h2 id="home-title" tabindex="-1">오라클 바로가기</h2><button type="button" class="home-resume" data-action="workbench"><span>작업대 이어가기</span><strong>${esc(resumeTitle)}</strong><small>${esc(resumeDetail)}</small>${icon('arrow',22)}</button></header>
    <section class="home-frequent" aria-labelledby="home-frequent-title"><h3 id="home-frequent-title">자주 쓰는 오라클</h3><div class="home-quick-grid">${QUICK_PROCEDURES.map(([id,description])=>{const p=procedureById.get(id);return `<button type="button" class="home-quick" data-action="home-procedure" data-id="${esc(id)}">${icon(p.icon,26)}<span><strong>${esc(p.name)}</strong><small>${esc(description)}</small></span></button>`;}).join('')}</div></section>
    ${recentProcedures.length?`<section class="home-recent" aria-labelledby="home-recent-title"><h3 id="home-recent-title">최근 사용</h3><div>${recentProcedures.map(p=>procedureButton(p)).join('')}</div></section>`:''}
    <div class="home-groups" aria-label="상황별 오라클">${PROCEDURE_GROUPS.map((group,index)=>`<section class="home-group${index===PROCEDURE_GROUPS.length-1?' home-group-wide':''}" aria-labelledby="home-group-${esc(group.id)}"><h3 id="home-group-${esc(group.id)}">${esc(group.label)}</h3><div class="home-procedures">${group.ids.map(id=>procedureButton(procedureById.get(id))).join('')}</div></section>`).join('')}</div>
    <button type="button" class="home-library" data-action="library">${icon('search',22)}<span>전체 표 찾아보기</span></button>`;
}
