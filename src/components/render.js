import {PROCEDURES,ODDS,SLOT_COUNTS} from '../domain/model.js';
import {PROCEDURE_GROUPS,guideNext,playGuide} from '../domain/play.js';
import {tables,tableList,CATEGORIES} from '../data/tables.js';
import {icon,esc} from './icons.js';
import {localizeRecord} from '../data/localization.js';
import {localizeTerms} from '../data/glossary.js';
import {RELATED_PROCEDURES} from '../domain/continuation.js';
import {enemyCardsView,threatReference} from './play-tools.js';
import {IMAGE_SIZES} from '../data/image-sizes.js';
const imageSize=path=>{const [width,height]=IMAGE_SIZES[path]??[800,600];return `width="${width}" height="${height}"`;};
export function pageLabel(page){return `p. ${[page].flat().join(', ')}`;}
function assetPath(path){
  if(!path?.startsWith('/')||typeof document==='undefined')return path;
  const src=document.querySelector('script[type="module"]')?.getAttribute('src');
  if(!src)return path;
  const root=new URL('.',new URL(src,document.baseURI));
  return new URL(path.slice(1),root).pathname;
}
function checked(v){return v?'checked':'';}
function selected(a,b){return a===b?'selected':'';}
export function procedureList(current,{recent=[],openGroups=[]}={}){
  const button=(p,extraClass='')=>`<button type="button" class="procedure${extraClass?` ${extraClass}`:''} ${current===p.id?'is-active':''}" data-action="procedure" data-id="${p.id}" aria-pressed="${current===p.id}"><span class="procedure-code" aria-hidden="true">${String(PROCEDURES.indexOf(p)+1).padStart(2,'0')}</span><span><strong>${p.name}</strong><small>${p.en}</small></span><span class="procedure-mark" aria-hidden="true">${current===p.id?'●':''}</span></button>`;
  const chips=recent.map(id=>PROCEDURES.find(p=>p.id===id)).filter(Boolean);
  const recentHtml=chips.length?`<div class="recent-procedures"><span class="recent-label">최근</span>${chips.map(p=>button(p,'procedure-recent')).join('')}</div>`:'';
  const open=new Set(openGroups);
  const groups=PROCEDURE_GROUPS.map(group=>{
    const procedures=group.ids.map(id=>PROCEDURES.find(p=>p.id===id)).filter(Boolean);
    const expanded=open.has(group.id)||procedures.some(p=>p.id===current);
    return `<details class="procedure-group" data-group="${group.id}"${expanded?' open':''}><summary><span>${esc(group.label)}</span><small>${procedures.length}</small>${icon('chevron',16)}</summary><div class="procedure-group-list">${procedures.map(p=>button(p)).join('')}</div></details>`;
  }).join('');
  return recentHtml+`<div class="procedure-groups">${groups}</div>`;
}
export function expeditionReadout(c,count=0){
  const size=tables.size.rows[c.size-1]?.text??String(c.size);
  const hazard=c.hazard?tables.hazard.rows[c.hazard-1]?.text:'미설정';
  const purpose=c.purpose?tables.purpose.rows[c.purpose-1]?.text:'미설정';
  const place=c.location==='planet'?(c.mode==='surface'?'행성 야외':'행성 내 시설'):'우주 시설';
  const biome=c.location==='planet'&&c.mode==='surface'?tables['landing-biome'].rows[c.biome-1]?.text:'';
  const remain=[c.resources?'자원':'',c.artifacts?'유물':'',c.knownThreats?'추적':''].filter(Boolean).join(' · ')||'없음';
  const cells=[
    ['Site','탐사지',c.siteName||'이름 없음'],
    ['Place','장소',biome?`${place} · ${biome}`:place],
    ['Scale','규모',size],
    ['Hazard','위험',hazard],
    ['Purpose','용도',purpose],
    ['Crew','인원',`출발 ${c.crew} · 현재 ${c.presentCrew}`],
    ['Twist','반전',`${c.twist}/6`],
    ['Remain','잔여',remain],
    ['Log','기록',String(count)]
  ];
  return `<div class="expedition-summary"><button type="button" data-action="context" aria-label="탐사 맥락 수정"><strong>${esc(c.siteName||'탐사 맥락')}</strong><span>${esc(place)}${biome&&c.mode==='surface'?' · '+esc(biome):''}</span></button><span>함께 ${c.presentCrew}명 · 출발 ${c.crew}명 · 반전 ${c.twist}/6</span><details class="expedition-details"><summary>맥락 상세</summary><div class="expedition-cells">${cells.map(([en,ko,value])=>`<span class="expedition-cell"><small>${en}</small><b>${esc(ko)}</b><strong>${esc(value)}</strong></span>`).join('')}</div><button class="text-button" type="button" data-action="context">맥락 수정</button></details></div>`;
}
export function nextStepView(procedureId, run){
  const matched=!!run&&(run.procedureId===procedureId||run.siteFromHex===true||run.procedureId==='encounter-roster');
  const steps=guideNext(procedureId, matched?run:null).map(id=>PROCEDURES.find(p=>p.id===id)).filter(Boolean);
  if(!steps.length)return '';
  const note=matched?'이 굴림에서 이어질 상황입니다. 이미 있는 절차만 엽니다.':'이미 있는 상황만 엽니다.';
  return `<section class="desk-card"><h3><span class="desk-kicker">Next</span>이어서 굴릴 상황</h3><div class="next-list">${steps.map(p=>`<button type="button" class="next-step" data-action="follow" data-id="${p.id}"><span>${String(PROCEDURES.indexOf(p)+1).padStart(2,'0')}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.en)}</small></span></button>`).join('')}</div><p class="desk-note">${note}</p></section>`;
}
export function asideLog(records,currentId){
  const list=records.filter(r=>r.aside&&r.parentId===currentId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  if(!list.length)return '';
  const cards=list.map(r=>{const v=localizeRecord(r,tables);return `<div class="aside-card"><strong>${esc(v.headline)}</strong><small>${esc(r.options?.question||v.subline)}</small><button type="button" data-action="record" data-id="${esc(r.id)}">이 기록 열기</button></div>`;}).join('');
  return `<section class="desk-card"><h3><span class="desk-kicker">Aside</span>이 보고서 곁의 질문</h3>${cards}</section>`;
}
function diceRibbon(run){
  const faces=run.trace.filter(t=>!t.discarded).slice(0,8);
  if(!faces.length)return '';
  const more=run.trace.filter(t=>!t.discarded).length-faces.length;
  return `<div class="dice-ribbon" aria-label="이번 굴림의 주사위">${faces.map(t=>`<span class="die-face" title="${esc(t.title)}"><b>${esc(t.value)}</b><small>${esc(t.notation)}</small></span>`).join('')}${more>0?`<span class="die-more">+${more}</span>`:''}</div>`;
}
function sourceOriginal(item){return item.sourceText&&item.sourceText.length>32?`<details class="source-original"><summary>영문 원문</summary><p lang="en">${esc(item.sourceText)}</p></details>`:'';}
export function optionFields(procedure,o,c){
  const toggle=(key,label,description='')=>`<label class="toggle-row"><input type="checkbox" name="${key}" ${checked(o[key])}><span>${esc(localizeTerms(label))}${description?`<small>${esc(localizeTerms(description))}</small>`:''}</span></label>`;
  const select=(key,label,choices)=>`<label class="option-select">${esc(localizeTerms(label))}<select name="${key}">${choices.map(([value,text])=>`<option value="${value}" ${selected(String(o[key]),String(value))}>${esc(localizeTerms(text))}</option>`).join('')}</select></label>`;
  let html='';
  if(procedure==='question')html=`<label class="field-label" for="question">무엇이 궁금한가요?</label><textarea id="question" name="question" maxlength="2000" rows="3" placeholder="이 시설에 다른 생존자가 있을까?">${esc(o.question)}</textarea><div class="field-heading"><span>그럴 가능성</span><span id="odds-hint">${ODDS.find(v=>v.id===o.odds).threshold}+ / D20</span></div><div class="odds-grid" role="group" aria-label="사건의 가능성">${ODDS.map(v=>`<label class="odds-choice"><input type="radio" name="odds" value="${v.id}" ${checked(o.odds===v.id)}><span>${v.label}<small>${v.threshold}+</small></span></label>`).join('')}</div><details class="options-more"><summary>후속 굴림 설정 ${icon('chevron',16)}</summary>${toggle('qualifier','보충어 굴리기','하지만 / 없음 / 그리고')}${toggle('complication','보충어가 있으면 복잡성 추가')}${toggle('details','복잡성을 행동·주제로 구체화')}</details>`;
  if(procedure==='scene')html=`<p class="option-explainer">장면을 떠올린 뒤 굴리세요.<br>반전이 생길 때만 사건을 덧붙입니다.</p><div class="field-heading"><span>현재 반전 확률</span><strong>${c.twist}/6</strong></div><div class="twist-choices" role="group" aria-label="반전 확률">${[1,2,3].map(n=>`<button type="button" data-action="twist" data-value="${n}" class="${c.twist===n?'selected':''}">${n}/6</button>`).join('')}</div>${toggle('details','반전을 행동·주제로 구체화')}`;
  if(procedure==='area')html=`<p class="option-explainer">연결부와 구역의 사건을 이어 굴립니다. 선택이 필요한 지점에서 잠시 멈춥니다.</p>${toggle('connector','연결부도 굴리기','복도에 매복이 있으면 먼저 해결')}<div class="context-summary"><span>${c.location==='planet'?'행성 표면':'우주 시설'} / ${tables.size.rows[c.size-1].text}</span><span>${c.hazard?tables.hazard.rows[c.hazard-1].text:'주된 위험 미설정'}</span></div><button class="text-button" type="button" data-action="context">탐사 맥락 설정 ${icon('arrow',16)}</button>`;
  if(procedure==='arrival')html=`<p class="option-explainer">탐사할 장소가 있다면 용도·과거·첫인상·규모·위험까지 한 번에 펼칩니다.</p>${toggle('known','알려진 목적지','도착표의 16 미만 결과를 제외')}${toggle('history','장소의 과거도 생성')}`;
  if(procedure==='npc')html=`<p class="option-explainer">NPC의 첫 태도에 맞는 행동을 고르고, 지금 상황에 대한 의욕을 함께 알아봅니다.</p>${toggle('details','행동·주제로 속사정 보충')}`;
  if(procedure==='travel')html=select('voyage','항해 방향',[['outbound','목적지로 출발'],['return','Karum Station으로 귀환']])+`<div class="paired-fields"><label>이번 주차<input type="number" name="week" min="1" max="52" value="${o.week}"></label><label>목적지<select name="destination"><option value="unknown" ${selected(o.destination,'unknown')}>미지의 목적지</option><option value="known" ${selected(o.destination,'known')}>알려진 목적지</option></select></label></div><label class="known-weeks ${o.destination==='known'||o.voyage==='return'?'':'hidden'}">알려진 항해 기간 (주)<input type="number" name="knownWeeks" min="1" max="52" value="${o.knownWeeks}"></label><div class="travel-odds"><span>사건 <strong>${Math.min(100,o.week*20)}%</strong></span><span>도착 <strong>${o.destination==='unknown'&&o.voyage!=='return'?Math.min(100,40+(o.week-1)*10)+'%':'일정 기준'}</strong></span></div><p class="option-explainer">출발 정원 ${c.crew}명. 1인선의 사회적 사건은 정신·신체 문제로 처리합니다.</p>`;
  if(procedure==='surprise')html=`<p class="option-explainer">행과 열을 각각 D8로 정합니다. 두 주사위의 합계를 쓰지 않습니다.</p>${toggle('details','행동·주제도 함께 굴리기')}`;
  if(procedure==='inspiration')html=`<p class="option-explainer">행동과 주제를 각각 D100으로 굴립니다. 두 단어를 현재 장면에 연결해 보세요.</p><div class="word-pair-preview"><span>행동</span><b>+</b><span>주제</span></div>`;
  if(procedure==='door')html=`<p class="option-explainer">문 유형과 방화벽 수 두 개를 먼저 확인합니다. 안/밖을 선택한 다음 접근 노드를 굴립니다.</p><div class="rule-callout">문이 열리기 전에는<br>문 너머 결과를 공개하지 않습니다.</div>`;
  if(procedure==='resolution')html=`<p class="option-explainer">기술·능력치 판정 없이 행동의 결과를 정해야 할 때 사용합니다. D20 한 번으로 성공의 정도를 확인합니다.</p>`;
  if(procedure==='planet')html=`<p class="option-explainer">행성 명칭·지름·대기·기후와 최초 착륙 생물군계를 한 번에 생성합니다. 최초 생물군계에는 D10을, 착륙 칸에는 D100을 씁니다.</p>`;
  if(procedure==='biome-border')html=`<p class="option-explainer">생물군계 경계에 도달했을 때만 사용합니다. D12의 11–12는 현재와 같은 유형입니다. 단일 생물군계 행성에서는 다시 굴리지 않습니다.</p><button class="text-button" type="button" data-action="context">현재 생물군계·단일 여부 확인</button>`;
  if(procedure==='hex')html=`<p class="option-explainer">지형 변화, 추적 위협, 탐사 결과와 생물군계별 하위 표를 함께 확인합니다.</p><div class="context-summary"><span>${tables['landing-biome'].rows[c.biome-1].text}</span><span>이전 지형: ${['위험 지형','복잡 지형','생물 서식지','생물군계 의존','순탄한 길'][c.terrain]}</span></div><button class="text-button" type="button" data-action="context">생물군계·이전 지형 설정 ${icon('arrow',16)}</button>${toggle('sights','풍경도 생성','이동 5헥스마다 사용')}`;
  if(procedure==='creature')html=select('species','생물 유형',[['random','장소에 맞춰 굴리기'],['Guardian','Guardian'],['Aberration','Aberration'],['Synthetic','Synthetic'],['Local Fauna','Local Fauna']])+select('tier','생물 난도',[['easy','쉬움'],['standard','보통'],['elite','정예'],['overwhelming','압도적']])+select('guardianModel','Guardian일 때 사용할 모델',[['titan','Titan · Brute'],['anansi','Anansi · Lurker'],['arash','Arash · Ranged'],['brahmari','Brahmari · Swarm']])+toggle('randomIntelligence','지능도 무작위로','선택 규칙 · Guardian에는 적용하지 않음')+toggle('aquatic','수생 생물의 사지 사용');
  if(procedure==='npc-profile')html=`<p class="option-explainer">이름·성·연령·외형·성향·버릇·동기를 만들고, 수기 시트에 옮길 간소화한 NPC 대원 능력치와 재능도 생성합니다.</p>`;
  if(procedure==='emotion')html=select('moodDepth','얼마나 깊이 알아볼까요?',[[1,'전반적 감정만'],[2,'세부 감정까지'],[3,'감정의 뿌리까지']])+`<p class="option-explainer">결과가 「알기 어려움」이면 거기서 멈춥니다.</p>`;
  if(procedure==='information'||procedure==='conversation')html=`<p class="option-explainer">${procedure==='information'?'정보의 성격과 대상을 독립적으로 굴립니다.':'대화 주제와 두 인물의 반응을 각각 굴립니다.'}</p>${toggle('details','행동·주제로 보충')}`;
  if(procedure==='combat-start')html=(o.combatAmbush?'<p class="rule-callout">확정된 적의 매복 · 우선권 +2<br>조우 반응과 기습은 다시 굴리지 않습니다.</p>':toggle('checkEncounterReaction','먼저 상대의 조우 반응 확인','이미 전투가 확정됐다면 끄기')+toggle('cautious','대원들이 Cautious 상태','기습 굴림 생략'))+toggle('generateCover','엄폐 배치도 생성','원문 D20 배치도 사용');
  if(procedure==='behavior')html=select('behavior','적의 유형',[['brute','Brute'],['lurker','Lurker'],['ranged','Ranged'],['swarm','Swarm'],['psychic','Psychic'],['spitter','Spitter'],['clobber','Clobber'],['taker','Taker'],['psybane','Psybane'],['bomber','Bomber'],['cecaelia','Cecaelia']])+toggle('retarget','새 공격 대상도 굴리기','처음 공격하거나 표적을 잃었을 때');
  if(procedure==='injury')html=`<p class="option-explainer">부상이 발생했을 때 사용합니다. 1이 나오면 치명적 부상까지 이어 굴립니다. 수치는 종이 시트에 적용하세요.</p>`;
  if(procedure==='stress')html=`<p class="option-explainer">스트레스 10 누적 또는 GM 판단 후 정신 저항(Resolve) 판정에 실패했다면 굴리세요.</p><div class="context-summary">현재 ${c.presentCrew}명 · ${c.presentCrew>1?'함께 있을 때의 표':'혼자일 때의 표'}</div><button class="text-button" type="button" data-action="context">현재 인원 바꾸기 ${icon('arrow',16)}</button>`;
  if(procedure==='trauma')html=`<p class="option-explainer">트라우마 효과를 확인하고, 해당 결과일 때만 부정적 특성까지 이어 굴립니다.</p>`;
  if(procedure==='station')html=select('stationActivity','정거장에서 할 일',[['carousing','유흥 후 무슨 일이 생겼나'],['night','Red Asteroid의 지난밤'],['locals','눈에 띄는 주민'],['news','기업 소문·뉴스']]);
  if(procedure==='ship-name'||procedure==='site-name')html=`<p class="option-explainer">원문의 이름 구성 열을 각각 따로 굴려 하나의 이름으로 조합합니다.</p>`;
  if(procedure==='hacking')html=toggle('hackingRandom','미정인 시스템 난도도 D6으로 정하기','이미 정해진 시스템·수호자의 난도는 직접 입력')+`<label class="option-select">시스템 난도<input type="number" name="hackingDifficulty" min="1" max="6" value="${o.hackingDifficulty}"></label><p class="option-explainer">해킹(Hacking) 재능이 있어야 합니다. 난도만큼 D6을 굴리고 하나라도 1이면 잠깁니다. 판정·사이퍼(Cypher)로 얻은 재굴림은 결과에서 주사위를 직접 고릅니다.</p>`;
  if(procedure==='dice')html=`<label class="field-label" for="dice-expression">주사위 식</label><input id="dice-expression" name="diceExpression" value="${esc(o.diceExpression)}" placeholder="2d10+5" maxlength="100"><p class="field-help" style="margin-top:12px">예: 1d20, 3d12, 2d10+5, d100×3. 피해·수치를 종이 시트에 옮겨 적으세요.</p>`;
  if(procedure==='alternate')html=`<p class="option-explainer">잠긴 접근점을 지나갈 수 없을 때 사용합니다. 시간트랙 +1을 쓰고 조우 또는 보안 장치의 세부사항까지 생성합니다.</p>`;
  if(procedure==='activity')html=`<p class="option-explainer">수기 시간트랙이 한 바퀴 찼을 때 사용합니다. 남은 추적 위협이 있을 때만 활동 확인을 합니다.</p><button class="text-button" type="button" data-action="context">남은 추적 위협 설정 ${icon('arrow',16)}</button>`;
  if(procedure==='artifact-activate')html=`<p class="option-explainer">유물을 활성화하려는 기계공학(Technology) 판정에 성공한 뒤 굴리세요. 임시 재능 결과라면 재능까지 이어 생성합니다.</p>`;
  if(procedure==='appraisal')html=`<p class="option-explainer">귀환 후 유물을 각각 감정합니다. 아래 수량은 종이 기록에서 입력하고, DC와 매각 물품은 종이에 반영하세요.</p><div class="paired-fields">${[['artifactCount','유물 수',100],['crystalCount','데이터 크리스털 수',10000],['alloyCount','합금 큐브 수',10000],['findCount','발견 기록 수 · 자원·유물',10000],['encounterCount','조우 기록 수',10000]].map(([key,label,max])=>`<label>${label}<input type="number" inputmode="numeric" name="${key}" value="${o[key]}" min="0" max="${max}"></label>`).join('')}</div>`;
  if(procedure==='scatter')html=`<p class="option-explainer">폭발물을 던지는 DEX 판정에 실패했을 때 사용합니다. 벗어난 거리 D4와 방향 D8을 함께 굴립니다.</p>`;
  return html;
}
export function contextFields(c){
  const opts=(id)=>tables[id].rows.map(r=>`<option value="${r.min}" ${selected(c[id],r.min)}>${r.text}</option>`).join('');
  return `<form id="context-form" class="dialog-form"><label>탐사지 이름<input name="siteName" maxlength="200" value="${esc(c.siteName)}" placeholder="종이 탐사지 보고서의 이름"></label><div class="paired-fields"><label>이번 탐사 출발 정원<select name="crew">${[1,3,5].map(n=>`<option value="${n}" ${selected(c.crew,n)}>${n}명</option>`).join('')}</select></label><label>현재 함께 있는 대원<input type="number" name="presentCrew" value="${c.presentCrew}" min="1" max="5"></label></div><p class="field-help">조우 구성은 출발 정원으로 정합니다. 현재 인원은 순간이동 대상 수와 스트레스 반응 표에 사용합니다.</p><details class="slot-settings"><summary>행성 탐사 맥락 ${icon('chevron',16)}</summary><div class="paired-fields" style="margin-top:16px"><label>현재 생물군계<select name="biome">${tables['landing-biome'].rows.map(r=>`<option value="${r.min}" ${selected(c.biome,r.min)}>${r.text}</option>`).join('')}</select></label><label>이전 헥스의 지형<select name="terrain">${['위험 지형','복잡 지형','생물 서식지','생물군계 의존','순탄한 길'].map((t,i)=>`<option value="${i}" ${selected(c.terrain,i)}>${t}</option>`).join('')}</select></label></div><label class="toggle-row"><input type="checkbox" name="singleBiome" ${checked(c.singleBiome)}>단일 생물군계 행성</label></details><div class="paired-fields"><label>탐사 모드<select name="mode"><option value="site" ${selected(c.mode,'site')}>시설 내부</option><option value="surface" ${selected(c.mode,'surface')}>행성 야외</option></select></label><label>장소<select name="location"><option value="space" ${selected(c.location,'space')}>우주 시설</option><option value="planet" ${selected(c.location,'planet')}>행성 표면</option></select></label><label>규모<select name="size">${opts('size')}</select></label></div><label>원래 용도<select name="purpose"><option value="0">미설정</option>${opts('purpose')}</select></label><label>주된 위험<select name="hazard"><option value="0">미설정</option>${opts('hazard')}</select></label><div class="paired-fields"><label class="toggle-row"><input type="checkbox" name="resources" ${checked(c.resources)}>자원이 남아 있음</label><label class="toggle-row"><input type="checkbox" name="artifacts" ${checked(c.artifacts)}>유물이 남아 있음</label></div><label class="toggle-row"><input type="checkbox" name="knownThreats" ${checked(c.knownThreats)}>추적 위협이 남아 있음</label><details class="slot-settings"><summary>기존 조우 ${SLOT_COUNTS[c.size-1]}칸 ${icon('chevron',16)}</summary><p class="field-help">종이에 기록한 유형을 넣으면 해당 칸이 나왔을 때 같은 생물을 다시 사용합니다.</p><div id="slot-inputs">${c.slots.map((v,i)=>`<label class="slot-input"><span>${i+1}</span><input name="slot-${i}" value="${esc(v)}" maxlength="300" placeholder="아직 만나지 않은 유형"></label>`).join('')}</div></details><button class="primary" type="submit">맥락 저장 ${icon('check',18)}</button></form>`;
}
export function emptyReport(procedure){
  const p=PROCEDURES.find(p=>p.id===procedure);
  return `<section class="empty-report"><div class="report-overline"><span>굴림 결과</span><span>대기 중</span></div><h2>${esc(p.name)}</h2><p>옵션을 설정하고 「굴리기」를 누르세요.</p></section>`;
}
function landingMap(cell){
  const cells=Array.from({length:100},(_,index)=>{
    const value=index+1;
    return `<span class="hex-cell${value===cell?' is-land':''}" aria-hidden="true">${value}</span>`;
  }).join('');
  return `<figure class="landing-map"><figcaption>착륙 칸 ${cell} · 10칸씩 열 줄 · 왼쪽 위가 1. 책의 지도가 아니라 D100을 읽기 쉽게 놓은 칸입니다.</figcaption><div class="hex-grid" role="img" aria-label="100칸 중 ${cell}번 착륙">${cells}</div></figure>`;
}
function manualChoices(tableId,parentId=''){const t=tables[tableId];return t?.rollable===false?`<section class="manual-choice"><h3>결과 직접 선택</h3><p>원문 범위가 겹칩니다. 주사위 없이 결과를 골라 기록합니다.</p>${t.rows.map((row,index)=>`<button type="button" data-action="table-select" data-table="${tableId}" data-row="${index}" data-parent="${esc(parentId)}">${esc(row.text)}</button>`).join('')}</section>`:'';}
function playBanner(run,records){
  const guide=playGuide(run,records);
  const acts=guide.acts.map(act=>`<li>${esc(act.text)}</li>`).join('');
  const lock=run.pending?`<section class="lock-choice"><h3>접근 노드는 어디에 있을까요?</h3><p>방화벽 ${run.pending.lo}–${run.pending.hi} · ${run.pending.secure?'보안문 / D10 두 개 중 불리한 결과':'D10 한 개'}</p><div><button type="button" data-action="lock" data-value="inside">안쪽 선택 ${icon('dice',18)}</button><button type="button" data-action="lock" data-value="outside">바깥쪽 선택 ${icon('dice',18)}</button></div></section>`:'';
  const hack=run.hacking?`<section class="hack-choice"><h3>허용된 재굴림 사용</h3><p>판정 성공이나 사이퍼(Cypher)로 얻은 횟수만큼만 사용하세요.</p><div>${run.hacking.values.map((value,index)=>`<button type="button" data-action="hack" data-value="${index}">${index+1}번 D6 <b>${value}</b></button>`).join('')}</div></section>`:'';
  const approach=guide.approach?`<section class="approach-choice"><h3>금속 구체</h3><p>다가가기 전에는 이 표를 굴리지 않습니다. 원래 헥스 기록은 그대로 둡니다.</p>${guide.approach.recordId?`<button type="button" data-action="record" data-id="${esc(guide.approach.recordId)}">${esc(guide.approach.text)}</button>`:`<button type="button" data-action="approach" data-table="toxic-globe">${esc(guide.approach.text)}</button>`}</section>`:'';
  const found=guide.foundSite?`<section class="approach-choice"><h3>Àrsaidh 시설</h3><p>도착표는 다시 굴리지 않습니다. 원래 헥스 기록은 그대로 둡니다.</p>${guide.foundSite.recordId?`<button type="button" data-action="record" data-id="${esc(guide.foundSite.recordId)}">${esc(guide.foundSite.text)}</button>`:`<button type="button" data-action="found-site">${esc(guide.foundSite.text)}</button>`}</section>`:'';
  const encounters=run.encounters??(run.encounter?[run.encounter]:[]);
  const roster=run.procedureId!=='encounter-roster'?encounters.map((spec,index)=>{
    const child=records.find(r=>r.parentId===run.id&&r.procedureId==='encounter-roster'&&(r.encounterIndex??0)===index);
    const label=encounters.length>1?`${index+1}번째 조우의 적`:'이 조우의 적';
    return child?`<button type="button" class="adopt-button" data-action="record" data-id="${esc(child.id)}">${label} 열기</button>`:`<button type="button" class="adopt-button" data-action="follow" data-id="creature" data-encounter="${index}">${label} 생성</button>`;
  }).join(''):'';
  const adopt=[roster,
    Number.isInteger(run.terrain)?`<button type="button" data-action="adopt-terrain" class="adopt-button">이 지형을 이전 헥스로 사용</button>`:'',
    run.adopt?`<button type="button" data-action="adopt" class="adopt-button">${icon('arrival',18)} 이 장소를 현재 탐사 맥락으로 사용</button>`:'',
    run.encounter?`<button type="button" data-action="adopt-encounter" class="adopt-button">${icon('npc',18)} ${run.encounter.slot}번 조우 슬롯에 이 유형 기록</button>`:''
  ].join('');
  const sheet=acts?`<h3><span>Sheet</span>시트에 적을 것</h3><ul class="play-acts">${acts}</ul>`:'';
  const manual=run.manualTableId?manualChoices(run.manualTableId,run.id):'';
  const choices=lock||hack||approach||found||adopt||manual?`<h3><span>Now</span>지금 할 일</h3>${lock}${hack}${approach}${found}${adopt}`:'';
  const now=sheet||choices?`<section class="play-now" aria-label="${[acts&&'시트에 적을 것',choices&&'지금 할 일'].filter(Boolean).join(' · ')}">${sheet}${choices}</section>`:'';
  const copy=guide.copy?`<p class="copy-line"><span>저널에 적을 문장</span><h2 tabindex="-1" id="result-headline" class="journal-text">${esc(guide.copy)}</h2><button type="button" data-action="copy-journal">이 문장 복사</button></p>`:'';
  return copy+enemyCardsView(run)+now+(guide.landing?landingMap(guide.landing):'');
}
export function reportView(run,records,{unsaved=false,saving=false}={}){
  run=localizeRecord(run,tables);
  const groups=[...new Set(run.items.map(i=>i.group||'결과'))],parent=run.parentId?records.find(r=>r.id===run.parentId):null;
  const idx=records.filter(r=>r.campaignId===run.campaignId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).findIndex(r=>r.id===run.id)+1;
  const time=new Date(run.createdAt).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  return `<article class="report tone-${esc(run.tone)}" data-record-id="${esc(run.id)}"><div class="report-overline"><span>${esc(run.title)}<span class="report-number"> / ${String(idx||1).padStart(3,'0')}</span></span><span>${esc(time)}</span></div><header class="report-title">${run.subject?`<p class="subject-label">관련 인물: ${esc(run.subject.name)}</p>`:''}</header>${playBanner(run,records)}${diceRibbon(run)}<div class="report-tools"><span class="record-state ${unsaved?'unsaved':''}">${icon(unsaved?'close':'check',14)}${unsaved?'저장 실패 · 결과는 화면에 유지 중':saving?'저장 중':'브라우저에 저장됨'}</span><div><button data-action="pin" class="tool-button ${run.pinned?'is-pinned':''}" aria-pressed="${run.pinned}">${icon('pin',16)}<span>${run.pinned?'고정됨':'고정'}</span></button><button data-action="copy" class="tool-button">${icon('copy',16)}<span>복사</span></button><button data-action="reroll" class="tool-button">${icon('dice',16)}<span>다시 굴림</span></button></div></div><div class="report-body">${parent?`<button class="parent-link" data-action="record" data-id="${esc(parent.id)}">${icon('history',15)} 이전 굴림에서 이어진 새 기록</button>`:''}<details class="report-details"${run.enemy||run.cards?'':' open'}><summary>세부 표·외형</summary>${groups.map(group=>`<section class="result-section"><h3>${esc(group)}</h3><div class="result-grid">${run.items.filter(i=>(i.group||'결과')===group).map(i=>`<div class="result-item ${i.text.length>90?'long-result':''}"><div class="result-label"><span>${esc(i.title)}</span>${i.dice?`<span class="dice-value">${i.reused?'기존값':esc(i.dice)} <b>${esc(i.roll)}</b></span>`:''}</div><p class="result-text">${esc(i.text)}</p>${i.image?`<img class="source-diagram" ${imageSize(i.image)} src="${esc(assetPath(i.image))}" alt="${esc(i.title)} 원문 도해" loading="lazy">`:''}${i.en?`<span class="english-result">${esc(i.en)}</span>`:''}${i.detail?`<p class="result-detail">${esc(i.detail)}</p>`:''}<button class="source-link" data-action="${i.tableId?'table':'source-info'}" data-id="${esc(i.tableId??'')}" data-page="${esc([i.page].flat().join(', '))}">${pageLabel(i.page)} ${i.tableId?icon('book',12):''}</button>${sourceOriginal(i)}</div>`).join('')}</div></section>`).join('')}</details>${run.notes.length?`<details class="rules-notes"><summary>규칙 메모 ${icon('chevron',16)}</summary><ul>${run.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:''}<details class="roll-trace"><summary>굴림 근거 <span>${run.trace.reduce((n,t)=>n+t.values.length,0)}개 주사위</span>${icon('chevron',16)}</summary><div class="trace-list">${run.trace.map(t=>`<div class="${t.discarded?'discarded':''}"><span>${esc(t.title)}${t.discarded?' · 조건에 따라 재굴림':''}</span><b>${esc(t.notation)} [${t.values.join(', ')}] = ${t.value}</b><small>${pageLabel(t.page)}</small></div>`).join('')}</div></details><label class="memo-label" for="record-memo">나의 해석·메모 <span id="memo-status"></span></label><textarea id="record-memo" maxlength="10000" rows="3" placeholder="해석이나 추가 상황 기록">${esc(run.memo)}</textarea></div><footer class="report-footer"><span>Across a Thousand Dead Worlds · Core 2024</span><span>개인 탐사 기록</span></footer></article>`;
}
export function historyCards(records,currentId,limit=12){
  if(!records.length)return `<div class="history-empty"><p>저장된 굴림이 없습니다.</p></div>`;
  return records.map(r=>localizeRecord(r,tables)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit).map(r=>`<button data-action="record" data-id="${esc(r.id)}" class="history-card ${r.id===currentId?'is-current':''}"><span class="history-type">${esc(r.title)}${r.aside?'<em class="aside-mark">곁질문</em>':''}${r.pinned?icon('pin',13):''}</span><strong>${esc(r.headline)}</strong><small>${esc(r.subline.slice(0,100))}</small><time>${new Date(r.createdAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</time></button>`).join('');
}
const searchAliases={'critical-melee':'펌블 fumble','critical-ranged':'펌블 fumble','morale-creature':'사기 도주','morale-humanoid':'사기 도주'};
const tableSearch=new Map(tableList.map(t=>[t.id,`${t.title} ${t.english} ${searchAliases[t.id]??''} ${t.rows.map(r=>`${r.text} ${r.detail??''} ${r.sourceText??''}`).join(' ')}`.toLocaleLowerCase()]));
export function libraryView(query='',category='all'){
  const q=query.toLocaleLowerCase(),list=tableList.filter(t=>(category==='all'||t.category===category)&&(!q||tableSearch.get(t.id).includes(q)));
  return `<div class="library-results">${list.length?list.map(t=>`<button class="library-row" data-action="table" data-id="${t.id}"><span><strong>${esc(t.title)}</strong><small>${esc(t.english)}</small></span><span>${t.dice}<small>${pageLabel(t.page)}</small></span></button>`).join(''):'<p class="no-results">일치하는 표가 없습니다. 한글이나 영문 제목으로 찾아보세요.</p>'}</div>`;
}
export function tableView(id,{parentId=''}={}){const t=tables[id];return `<div class="table-description"><span>${esc(t.english)}</span><b>${t.dice} / ${pageLabel(t.page)}</b></div><button class="primary table-roll" data-action="roll-table" data-id="${id}" ${t.rollable===false?'disabled':''}>${icon('dice',18)} 이 표만 굴리기</button>${RELATED_PROCEDURES[id]?`<button type="button" class="secondary" data-action="related-procedure" data-table="${id}">관련 상황 열기 · 후속 표 포함</button>`:''}${id==='known-threat'?threatReference():''}${t.rollable===false?manualChoices(id,parentId):''}${t.sourceNote?`<p class="source-note">${esc(t.sourceNote)}</p>`:''}<table class="rule-table"><thead><tr><th scope="col">굴림</th><th scope="col">결과</th></tr></thead><tbody>${t.rows.map(r=>`<tr><td>${r.min===r.max?r.min:`${r.min}–${r.max}`}</td><td>${esc(r.text)}${r.image?`<img class="source-diagram table-diagram" ${imageSize(r.image)} src="${esc(assetPath(r.image))}" alt="${esc(t.title)} ${r.min}번 원문 도해" loading="lazy">`:''}${r.en?`<small>${esc(r.en)}</small>`:''}${r.detail?`<p>${esc(r.detail)}</p>`:''}${sourceOriginal(r)}</td></tr>`).join('')}</tbody></table><p class="field-help">사용자가 제공한 2024 Core Rulebook 기반. 결과 설명은 한국어로 번역했습니다. 인명·지명·기업명은 원문을 유지하며 생물명은 병기합니다. 시나리오 전용 표는 제외했습니다.</p>`;}
