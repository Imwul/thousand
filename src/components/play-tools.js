import {tables} from '../data/tables.js';
import {esc} from './icons.js';
import {COMBAT_TABLES,enemyCards,tierLabel} from '../domain/continuation.js';
import {creatureLabel} from '../data/glossary.js';
import {KNOWN_THREATS,knownThreatItems} from '../data/enemies.js';
import {resultField,statEntries} from './result-fields.js';

function effectReferences(items){const tiers=new Set();for(const item of items)for(const match of item.text.matchAll(/(?:Poisoned|Poison|중독|독)\s+(IV|III|II|I)\b/g))tiers.add(match[1]);return [...tiers].map(tier=>{const row=tables.poison.rows[['I','II','III','IV'].indexOf(tier)];return `<div class="condition-reference">${resultField({title:row.text,text:row.detail,page:88},{compact:true})}</div>`;}).join('');}
const identityItem=item=>['이름','외형','생물 유형'].includes(item.group)||['수호자 모델','생물 역할'].includes(item.title)||item.tableId==='creature-role';
export function enemyCoreItems(card){return card.items.filter(item=>(!card.enemy.known||item.group==='추적 위협 고정 능력치')&&!identityItem(item)&&item.title!=='추적 위협');}
export function enemyExtraItems(run){
  const cards=enemyCards(run);if(!cards.length)return {main:run.items,extra:[]};
  if(run.cards?.length)return {main:[],extra:cards[0].items.filter(identityItem)};
  const consumed=new Set(enemyCoreItems(cards[0]));
  const extra=run.items.filter(item=>identityItem(item));
  return {main:run.items.filter(item=>!consumed.has(item)&&!extra.includes(item)),extra};
}
function enemyBadges(card){return `<dl class="enemy-meta"><div><dt>난도</dt><dd>${esc(tierLabel(card.enemy.tier))}</dd></div><div><dt>유형</dt><dd>${esc(creatureLabel(card.enemy.type))}</dd></div><div><dt>역할</dt><dd>${esc(card.enemy.known?'추적 위협':creatureLabel(card.enemy.role))}</dd></div><div><dt>개체 수</dt><dd>${card.count??1}</dd></div></dl>`;}
function enemyActions(card,source,index,{desk=false}={}){return `<div class="enemy-actions"><button type="button" data-action="enemy-action" data-source="${esc(source)}" data-index="${index}">이 적의 행동 굴리기</button><button type="button" data-action="enemy-combat" data-source="${esc(source)}" data-index="${index}">${card.enemy.ambush||card.enemy.known?'매복 전투 시작':desk?'이 적과 전투 준비':'전투 준비'}</button>${desk?`<button type="button" data-action="record" data-id="${esc(source)}">상세 기록 열기</button>`:''}</div>`;}
function enemyValues(card,{compact=false}={}){
  const items=enemyCoreItems(card),stats=items.filter(item=>statEntries(item)||['기본 이동','원거리 사거리'].includes(item.title)),effects=items.filter(item=>!stats.includes(item));
  const model=card.items.find(item=>item.title==='수호자 모델');
  return `${!compact&&model?.detail?`<p class="enemy-description">${esc(model.detail)}</p>`:''}<div class="enemy-layout"><div class="enemy-stats">${stats.map(item=>resultField(item,{compact})).join('')}</div><div class="enemy-abilities">${effects.length?`<section class="enemy-effects"><h4>특성·능력</h4><div class="field-grid">${effects.map((item,index)=>resultField(item.title==='특수 능력'?{...item,title:`특수 능력 ${effects.slice(0,index+1).filter(i=>i.title==='특수 능력').length}`}:item,{compact})).join('')}</div></section>`:''}${effectReferences(items)}</div></div>`;
}
const combatProcedures=new Set(['creature','combat-start','behavior','injury','stress','trauma','scatter']);
export function enemyDeskView(card,procedure,{currentId}={}){
  const reference=card&&card.sourceId!==currentId?`<section class="desk-card enemy-reference"><div class="desk-card-heading"><h3>현재 적</h3><button type="button" data-action="enemy-close" aria-label="현재 적 참조 접기">×</button></div><strong>${esc(card.enemy.name)}</strong>${enemyBadges(card)}${enemyValues(card,{compact:true})}${enemyActions(card,card.sourceId,card.index,{desk:true})}</section>`:'';
  const tools=card||combatProcedures.has(procedure)?`<details class="desk-card combat-tools"><summary>전투 중 판정</summary><p class="desk-note">판정이 필요한 순간에만 굴립니다. 전투 돌발사건은 선택 규칙: 전투당 한 번, Luck 1 소비.</p><div>${COMBAT_TABLES.filter(([id])=>!(card?.enemy.type==='Guardian'&&['morale-creature','recovery-status'].includes(id))&&!(card?.enemy.known&&id==='morale-creature')).map(([id,label])=>`<button type="button" data-action="quick-table" data-id="${id}">${esc(label)}</button>`).join('')}</div><button type="button" data-action="table" data-id="known-threat">추적 위협 6종 참조</button></details>`:'';
  return reference+tools;
}

export function enemyCardsView(run){
  const cards=enemyCards(run);if(!cards.length)return '';
  return `<section class="enemy-cards" aria-label="이 조우의 적">${cards.map((card,index)=>`<article class="enemy-card">${run.procedureId==='creature'&&!run.cards?'':`<h3>${esc(card.enemy.name)}${cards.length>1?` <span>${esc(tierLabel(card.enemy.tier))} ×${card.count}</span>`:''}</h3>`}${enemyBadges(card)}${enemyValues(card)}${enemyActions(card,run.id,index)}</article>`).join('')}</section>`;
}

export function rosterOptions(source,o){
  const spec=source.encounter;
  const types=['Guardian','Aberration','Synthetic','Local Fauna'];
  return `<p class="option-explainer">${esc(spec.composition?.map(x=>`${tierLabel(x.tier)} ${x.count}`).join(' + ')??source.subline)}. 같은 종의 이름·외형을 공유하는 난도별 카드를 생성합니다.</p>${spec.type?`<p class="context-summary">${esc(creatureLabel(spec.type))} · 앞선 조우의 유형과 크기 사용</p>`:`<label>기존 슬롯의 생물 유형<select name="species">${types.map(type=>`<option value="${type}"${o.species===type?' selected':''}>${esc(creatureLabel(type))}</option>`).join('')}</select></label>`}<label class="option-select">수호자일 때 사용할 모델<select name="guardianModel">${[['titan','Titan'],['anansi','Anansi'],['arash','Arash'],['brahmari','Brahmari']].map(([key,name])=>`<option value="${key}"${o.guardianModel===key?' selected':''}>${esc(creatureLabel(name))}</option>`).join('')}</select></label><label class="toggle-row"><input type="checkbox" name="randomIntelligence"${o.randomIntelligence?' checked':''}>지능도 무작위로</label><label class="toggle-row"><input type="checkbox" name="aquatic"${o.aquatic?' checked':''}>수생 생물의 사지 사용</label>`;
}

export function locationList(campaign){
  const list=campaign.locations??[];if(!list.length)return '';
  return `<details class="location-list"><summary>저장된 장소 ${list.length}곳</summary>${list.map(place=>`<button type="button" data-action="restore-location" data-id="${esc(place.id)}"${place.id===campaign.context.siteId?' disabled':''}>${esc(place.name||'이름 없는 장소')} · ${place.context.mode==='surface'?'야외':'시설'}${place.id===campaign.context.siteId?' · 현재':''}</button>`).join('')}</details>`;
}
export function threatReference(){
  return `<section class="threat-reference"><h3>고정 능력치</h3>${Object.keys(KNOWN_THREATS).map(key=>`<details><summary>${esc(creatureLabel(KNOWN_THREATS[key].name))}</summary>${enemyValues({enemy:{known:true},items:knownThreatItems(key)},{compact:true})}<button type="button" data-action="table" data-id="behavior-${key}">이 위협의 행동 표 보기</button></details>`).join('')}</section>`;
}
