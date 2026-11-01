import {tables} from '../data/tables.js';
import {esc} from './icons.js';
import {COMBAT_TABLES,enemyCards,enemyLabel,tierLabel} from '../domain/continuation.js';
import {creatureLabel} from '../data/glossary.js';
import {KNOWN_THREATS,knownThreatItems} from '../data/enemies.js';

function effectReferences(items){const tiers=new Set();for(const item of items)for(const match of item.text.matchAll(/(?:Poisoned|Poison|중독|독)\s+(IV|III|II|I)\b/g))tiers.add(match[1]);return [...tiers].map(tier=>{const row=tables.poison.rows[['I','II','III','IV'].indexOf(tier)];return `<p class="condition-reference"><small>${esc(row.text)} · p.88</small>${esc(row.detail)}</p>`;}).join('');}
const combatProcedures=new Set(['creature','combat-start','behavior','injury','stress','trauma','scatter']);
export function enemyDeskView(card,procedure){
  const reference=card?`<section class="desk-card enemy-reference"><div class="desk-card-heading"><h3>현재 적</h3><button type="button" data-action="enemy-close" aria-label="현재 적 참조 접기">×</button></div><strong>${esc(enemyLabel(card.enemy))}${card.count>1?` ×${card.count}`:''}</strong>${card.items.filter(i=>['기본 능력치','전투 수치','공격과 피해','이동·공격','기본 이동','유형 효과','수호자 특성','원거리 사거리','표적 우선순위','회복 상태','고유 효과','매복·사기','특수 능력','역할 참조'].includes(i.title)).map(i=>`<p><small>${esc(i.title)}</small>${esc(i.text)}${i.detail?`<span>${esc(i.detail)}</span>`:''}</p>`).join('')}${effectReferences(card.items)}<div class="enemy-actions"><button type="button" data-action="enemy-action" data-source="${esc(card.sourceId)}" data-index="${card.index}">이 적의 행동 굴리기</button><button type="button" data-action="enemy-combat" data-source="${esc(card.sourceId)}" data-index="${card.index}">${card.enemy.ambush||card.enemy.known?'매복 전투 시작':'이 적과 전투 준비'}</button><button type="button" data-action="record" data-id="${esc(card.sourceId)}">상세 기록 열기</button></div></section>`:'';
  const tools=card||combatProcedures.has(procedure)?`<details class="desk-card combat-tools"><summary>전투 중 판정</summary><p class="desk-note">판정이 필요한 순간에만 굴립니다. 전투 돌발사건은 선택 규칙: 전투당 한 번, Luck 1 소비.</p><div>${COMBAT_TABLES.filter(([id])=>!(card?.enemy.type==='Guardian'&&['morale-creature','recovery-status'].includes(id))&&!(card?.enemy.known&&id==='morale-creature')).map(([id,label])=>`<button type="button" data-action="quick-table" data-id="${id}">${esc(label)}</button>`).join('')}</div><button type="button" data-action="table" data-id="known-threat">추적 위협 6종 참조</button></details>`:'';
  return reference+tools;
}

export function enemyCardsView(run){
  const cards=enemyCards(run);if(!cards.length)return '';
  return `<section class="enemy-cards" aria-label="이 조우의 적">${cards.map((card,index)=>`<article class="enemy-card"><h3>${esc(enemyLabel(card.enemy))}${card.count>1?` ×${card.count}`:''}</h3><div class="enemy-actions"><button type="button" data-action="enemy-action" data-source="${esc(run.id)}" data-index="${index}">이 적의 행동 굴리기</button><button type="button" data-action="enemy-combat" data-source="${esc(run.id)}" data-index="${index}">${card.enemy.ambush||card.enemy.known?'매복 전투 시작':'전투 준비'}</button></div>${card.items.filter(i=>i.tableId!=='known-threat').filter(i=>!['이름','외형'].includes(i.group)&&!i.group?.startsWith('특수 능력')).filter(i=>!['몸과 행동','생물 유형'].includes(i.group)).map(i=>`<p><small>${esc(i.title)}</small>${esc(i.text)}${i.detail?`<span>${esc(i.detail)}</span>`:''}</p>`).join('')}${card.items.filter(i=>i.group?.startsWith('특수 능력')).map(i=>`<p><small>${esc(i.title)}</small>${esc(i.text)}${i.detail?`<span>${esc(i.detail)}</span>`:''}</p>`).join('')}${effectReferences(card.items)}</article>`).join('')}</section>`;
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
  return `<section class="threat-reference"><h3>고정 능력치</h3>${Object.keys(KNOWN_THREATS).map(key=>`<details><summary>${esc(creatureLabel(KNOWN_THREATS[key].name))}</summary>${knownThreatItems(key).map(i=>`<p><b>${esc(i.title)}</b> ${esc(i.text)}</p>`).join('')}<button type="button" data-action="table" data-id="behavior-${key}">이 위협의 행동 표 보기</button></details>`).join('')}</section>`;
}
