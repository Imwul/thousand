import {PROCEDURES,DICE_PRESETS} from '../domain/model.js';
import {PROCEDURE_GROUPS} from '../domain/play.js';
import {esc,icon} from './icons.js';

const QUICK_PROCEDURES=['question','area','hex','behavior','stress','dice'];
const HOME_ICONS={hex:'hex',behavior:'combat',stress:'stress'};
const HINTS={
  question:'예·아니오와 해석 단서',
  scene:'새 장면의 반전 여부',
  surprise:'예상 밖 사건과 해석 단서',
  inspiration:'상황을 해석할 행동·주제',
  resolution:'능력치 판정 없는 성공 정도',
  travel:'항해 사건과 도착 여부',
  'ship-name':'우주선 명칭',
  arrival:'탐사지의 용도·규모·위험',
  'site-name':'탐사지 식별 명칭',
  area:'새 구역의 연결부·발견',
  door:'잠금과 방화벽 확인·해제',
  hacking:'해킹 판정과 재굴림',
  alternate:'잠긴 구역으로 가는 다른 길',
  'time-step':'시간 한 칸 경과 처리',
  activity:'트랙이 찼을 때 활동 확인',
  'artifact-activate':'유물의 작동 여부',
  planet:'행성 환경과 시작 생물군계',
  hex:'지형과 생물군계별 사건',
  'biome-border':'경계 너머의 생물군계',
  npc:'첫 태도·행동·의욕',
  'npc-profile':'인물의 배경과 특성',
  emotion:'현재 감정과 반응',
  information:'인물이 알고 있는 정보',
  conversation:'대화의 주제와 반응',
  creature:'생물 유형·능력치·특성',
  'combat-start':'전투 배치·기습·엄폐',
  behavior:'역할에 맞는 전투 행동',
  injury:'부상 효과·치명적 부상',
  stress:'스트레스 반응·정신 붕괴',
  trauma:'정신 붕괴 뒤의 트라우마',
  dread:'공포 사건과 지속 효과',
  scatter:'빗나간 투척의 방향·거리',
  dice:'주사위 식·탄약·회복 등 보조굴림',
  station:'임무 사이 정거장 활동',
  appraisal:'회수한 기술과 유물의 가치',
  'gear-check':'장비 재고·작동 여부'
};
const procedureById=new Map(PROCEDURES.map(procedure=>[procedure.id,procedure]));
const searchable=new Map(PROCEDURE_GROUPS.flatMap(group=>group.ids.map(id=>{
  const p=procedureById.get(id);
  const helpers=id==='dice'?DICE_PRESETS.map(preset=>preset.name).join(' '):'';
  return [id,`${group.label} ${p.name} ${p.en} ${HINTS[id]} ${p.description??''} ${helpers}`.normalize('NFC').toLowerCase().replace(/\s+/g,'')];
})));

function procedureButton(procedure){
  return `<button type="button" class="home-procedure" data-action="home-procedure" data-id="${esc(procedure.id)}"><span>${esc(procedure.name)}</span><small>${esc(HINTS[procedure.id])}</small></button>`;
}

export function homeCatalog(query=''){
  const words=query.normalize('NFC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const helpers=words.length?DICE_PRESETS.filter(preset=>words.every(word=>preset.name.normalize('NFC').toLowerCase().replace(/\s+/g,'').includes(word))):[];
  const groups=PROCEDURE_GROUPS.map(group=>({...group,ids:group.ids.filter(id=>words.every(word=>searchable.get(id).includes(word)))})).filter(group=>group.ids.length);
  const count=groups.reduce((sum,group)=>sum+group.ids.length,0);
  const status=helpers.length?`${count}개 상황 · 보조굴림 ${helpers.length}개`:words.length?`${count}개 상황이 검색되었습니다.`:`전체 ${count}개 상황`;
  const helperHtml=helpers.length?`<section class="home-helpers" aria-labelledby="home-helper-title"><h4 id="home-helper-title">보조굴림 바로가기</h4><div class="home-helper-grid">${helpers.map(preset=>`<button type="button" class="home-helper" data-action="home-dice" data-id="${esc(preset.id)}">${icon('dice',22)}<span><strong>${esc(preset.name)}</strong><small>${esc(preset.expression.toUpperCase())} · p.${preset.page}</small></span></button>`).join('')}</div></section>`:'';
  const html=count?`<div class="home-groups" aria-label="상황별 오라클">${groups.map((group,index)=>`<section class="home-group${groups.length%2&&index===groups.length-1?' home-group-wide':''}" aria-labelledby="home-group-${esc(group.id)}"><h4 id="home-group-${esc(group.id)}" tabindex="-1">${esc(group.label)}</h4><div class="home-procedures">${group.ids.map(id=>procedureButton(procedureById.get(id))).join('')}</div></section>`).join('')}</div>${helperHtml}`:
    `<div class="home-empty"><p>일치하는 굴림 상황이 없습니다.</p><p>다른 단어를 입력하거나 룰북의 개별 표에서 찾아보세요.</p><button type="button" class="secondary" data-action="home-library">${icon('search',18)}이 검색어로 전체 표 찾기</button></div>`;
  return {count,helperCount:helpers.length,status,html};
}

export function homeView({procedureId='question',record=null,recent=[],query=''}={}){
  const procedure=procedureById.get(procedureId)??procedureById.get('question');
  const resumeTitle=record?.title||procedure.name;
  const resumeDetail=record?'저장된 결과 보기':'굴림 옵션 열기';
  const recentProcedures=[...new Set(recent)].filter(id=>!QUICK_PROCEDURES.includes(id)).map(id=>procedureById.get(id)).filter(Boolean).slice(0,5);
  const catalog=homeCatalog(query);
  return `<header class="home-heading"><div><h2 id="home-title" tabindex="-1">오라클 바로가기</h2><p>상황을 선택하면 굴림 옵션을 엽니다.</p></div><button type="button" class="home-resume" data-action="workbench"><span>작업대 이어가기</span><strong>${esc(resumeTitle)}</strong><small>${resumeDetail}</small>${icon('arrow',22)}</button></header>
    <div class="home-directory-heading"><div class="home-search"><label for="home-search">이름·상황으로 찾기</label><div class="home-search-field">${icon('search',20)}<input id="home-search" name="oracle-search" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="예: 시간, 탄약, NPC…" value="${esc(query)}" aria-controls="home-catalog" aria-describedby="home-search-status"><button type="button" data-action="home-clear" aria-label="오라클 검색 지우기" ${query?'':'hidden'}>${icon('close',18)}</button></div></div><div class="home-search-meta"><p id="home-search-status" role="status" aria-live="polite" aria-atomic="true">${catalog.status}</p><button type="button" class="home-library" data-action="home-library">${icon('book',20)}<span>전체 표 찾아보기</span></button></div></div>
    <nav class="home-index" aria-label="오라클 분류로 이동" ${query.trim()?'hidden':''}>${PROCEDURE_GROUPS.map(group=>`<a href="#home-group-${esc(group.id)}">${esc(group.label)}</a>`).join('')}</nav>
    <div class="home-shortcuts" ${query.trim()?'hidden':''}><section class="home-frequent" aria-labelledby="home-frequent-title"><h3 id="home-frequent-title">주요 오라클</h3><div class="home-quick-grid">${QUICK_PROCEDURES.map(id=>{const p=procedureById.get(id);return `<button type="button" class="home-quick" data-action="home-procedure" data-id="${esc(id)}">${icon(HOME_ICONS[id]??p.icon,26)}<span><strong>${esc(p.name)}</strong><small>${esc(HINTS[id])}</small></span></button>`;}).join('')}</div></section>
    ${recentProcedures.length?`<section class="home-recent" aria-labelledby="home-recent-title"><h3 id="home-recent-title">최근 사용</h3><div>${recentProcedures.map(p=>procedureButton(p)).join('')}</div></section>`:''}
    </div><section class="home-directory" aria-labelledby="home-directory-title"><h3 id="home-directory-title">상황별 전체 오라클</h3><div id="home-catalog">${catalog.html}</div></section>`;
}
