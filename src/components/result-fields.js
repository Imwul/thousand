import {esc,icon} from './icons.js';
import {IMAGE_SIZES} from '../data/image-sizes.js';

// Presentation only: saved rolls (including older string snapshots) stay intact.
export function statEntries(item){
  const text=String(item.text??'');
  if(/^(?:STR|DEX|CON|WIL|INT|CHA)\s/.test(text)){
    const entries=text.split(/\s*\/\s*/).map(part=>part.match(/^(STR|DEX|CON|WIL|INT|CHA)\s+(.+)$/));
    if(entries.length===6&&entries.every(Boolean))return entries.map(([,label,value])=>({label,value}));
  }
  if(/^(?:기본 )?전투 수치$/.test(item.title)){
    const entries=text.split(/\s*\/\s*/).map(part=>part.match(/^(상처|경계|장갑|방어)\s+(.+)$/));
    if(entries.length>=2&&entries.every(Boolean))return entries.map(([,label,value])=>({label,value}));
  }
  if(item.title==='공격과 피해'){
    const match=text.match(/^공격\s+(.+)\s+\/\s+피해\s+(.+)$/);
    if(match)return [{label:'공격',value:match[1]},{label:'피해',value:match[2]}];
  }
  if(item.title==='이동·공격'){
    const entries=text.split(/\s*\/\s*/).map(part=>{
      const match=part.match(/^(이동|공격|사거리)\s+(.+)$/);
      return match?{label:match[1],value:match[2]}:part==='피해는 행동 결과 참조'?{label:'피해',value:'행동 결과 참조'}:null;
    });
    if(entries.every(Boolean))return entries;
  }
  if(item.title==='Site Report 준비'){
    const match=text.match(/^자원 (\d+) \/ 유물 (\d+) \/ 조우 유형 (\d+)칸 \/ 매복 최대 (\d+)회$/);
    if(match)return ['자원 탐사 한도','유물 탐사 한도','조우 유형','최대 매복'].map((label,index)=>({label,value:match[index+1]+(index===2?'칸':index===3?'회':'')}));
  }
  if(item.title==='회복 상태'){
    const entries=text.split(/\s*\/\s*/).map(part=>part.match(/^([^:]+):\s*(.+)$/));
    if(entries.every(Boolean))return entries.map(([,label,value])=>({label,value}));
  }
  if(item.tableId==='activity'){
    const match=text.match(/^(.+?) · 최대 (\d+)회 매복$/);
    if(match)return [{label:'활동도',value:match[1]},{label:'최대 매복',value:`${match[2]}회`}];
  }
  if(item.tableId==='artifact-value'){
    const match=text.match(/^(.+?) · (\d+) DC$/);
    if(match)return [{label:'감정 결과',value:match[1]},{label:'감정가',value:`${match[2]} DC`}];
  }
  if(item.title==='조우 구성'&&/^(쉬움|보통|정예|압도적)\s*\d+(?:\s*\+\s*(쉬움|보통|정예|압도적)\s*\d+)*$/.test(text)){
    return [...text.matchAll(/(쉬움|보통|정예|압도적)\s*(\d+)/g)].map(([,label,count])=>({label,value:`${count}개체`}));
  }
  return null;
}

export function statGrid(entries,label='',kind=''){
  return `<dl class="stat-grid ${esc(kind)}"${label?` aria-label="${esc(label)}"`:''}>${entries.map(entry=>`<div class="stat-cell${String(entry.value).length>15?' stat-word':''}"><dt>${esc(entry.label)}</dt><dd>${esc(entry.value)}</dd></div>`).join('')}</dl>`;
}

export function sourceOriginal(item){return item.sourceText&&item.sourceText.length>32?`<details class="source-original"><summary>영문 원문</summary><p lang="en">${esc(item.sourceText)}</p></details>`:'';}

function source(item){
  if(item.page===undefined&& !item.tableId)return '';
  return `<button type="button" class="source-link" data-action="${item.tableId?'table':'source-info'}" data-id="${esc(item.tableId??'')}" data-page="${esc([item.page].flat().join(', '))}">${item.page!==undefined?`p. ${esc([item.page].flat().join(', '))}`:'표 보기'} ${item.tableId?icon('book',12):''}</button>`;
}

function diagram(item){
  if(!item.image)return '';
  const [width,height]=IMAGE_SIZES[item.image]??[800,600];
  let path=item.image;
  if(path.startsWith('/')&&typeof document!=='undefined'){
    const src=document.querySelector('script[type="module"]')?.getAttribute('src');
    if(src)path=new URL(path.slice(1),new URL('.',new URL(src,document.baseURI))).pathname;
  }
  return `<img class="source-diagram" width="${width}" height="${height}" src="${esc(path)}" alt="${esc(item.title)} 원문 도해" loading="lazy">`;
}

function ruleValues(text){
  const token=/(?:\b\d*[dD]\d+(?:[+−-]\d+)?\b|[+−]\d+(?:\/\d+)?|\b\d+(?:헥스|회|라운드|시간|주|개|%|\s*rads\b|\s*DC\b))/g;
  let html='',last=0;
  for(const match of text.matchAll(token)){html+=esc(text.slice(last,match.index))+`<strong class="rule-value">${esc(match[0])}</strong>`;last=match.index+match[0].length;}
  return html+esc(text.slice(last));
}
function proseValue(item){
  const text=String(item.text??'');
  const feature=/특수 능력|재능|초능력/.test(item.title)?text.match(/^([^:\n]{2,70}):\s*(.+)$/s):null;
  return feature?`<span class="feature-name">${esc(feature[1])}:</span><span class="feature-effect"> ${ruleValues(feature[2])}</span>`:ruleValues(text);
}

export function resultField(item,{compact=false}={}){
  const entries=statEntries(item),text=String(item.text??'');
  const attributes=entries?.length===6&&entries[0].label==='STR';
  const long=!entries&&(text.length>65||!!item.image);
  const die=item.dice?`<span class="dice-value">${item.reused?'기존값':esc(item.dice)} <b>${esc(item.roll)}</b></span>`:'';
  const meta=compact?'':`<div class="field-source">${source(item)}${die}</div>${sourceOriginal(item)}`;
  // Anansi's conditional attack stays one value; the starred condition stays visible.
  const detail=item.detail?ruleValues(item.detail):'';
  const value=entries?statGrid(entries,item.title,attributes?'attribute-grid':/^(?:기본 )?전투 수치$/.test(item.title)?'combat-grid':item.title==='공격과 피해'?'attack-grid':''): `<dl class="value-pair"><dt>${esc(item.title)}</dt><dd class="field-value${long?' field-prose':''}"><span class="field-copy">${proseValue(item)}</span></dd>${detail?`<dd class="field-detail"><span class="detail-label">효과·조건</span>${detail}</dd>`:''}</dl>`;
  return `<div class="result-field${entries?' field-matrix':''}${long?' field-wide':''}${attributes?' field-attributes':''}" data-field="${esc(item.title)}">${entries?`<h4 class="matrix-label">${esc(item.title)}</h4>`:''}${value}${item.en&&item.en!==text?`<span class="english-result">${esc(item.en)}</span>`:''}${diagram(item)}${entries&&detail?`<p class="field-detail stat-note">${detail}</p>`:''}${meta}</div>`;
}

export function resultSections(items,{compact=false}={}){
  const groups=[...new Set(items.map(item=>item.group||'결과'))];
  return groups.map(group=>`<section class="result-section"><h3>${esc(group)}</h3><div class="field-grid">${items.filter(item=>(item.group||'결과')===group).map(item=>resultField(item,{compact})).join('')}</div></section>`).join('');
}

export function appraisalSheet(run){
  const formula=run.items.find(item=>item.title==='정산 내역');
  const match=formula?.text.match(/^유물 (\d+) \+ 데이터 크리스털 (\d+)×50 \+ 합금 큐브 (\d+)×75 \+ 발견·조우 기록 (\d+)×5 = (\d+) DC$/);
  if(!match)return '';
  const [,artifacts,crystals,alloys,records,total]=match;
  const rows=[['유물 감정',String(run.items.filter(item=>item.tableId==='artifact-value').length),'개별 감정',artifacts],['데이터 크리스털',crystals,'50',Number(crystals)*50],['합금 큐브',alloys,'75',Number(alloys)*75],['발견·조우 기록',records,'5',Number(records)*5]];
  return `<section class="appraisal-sheet result-section"><h3>귀환 정산</h3><table class="appraisal-table"><thead><tr><th scope="col">항목</th><th scope="col">수량</th><th scope="col">단가 <small>DC</small></th><th scope="col">금액 <small>DC</small></th></tr></thead><tbody>${rows.map(([label,count,unit,amount])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(count)}</td><td>${esc(unit)}</td><td>${esc(amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row" colspan="3">합계</th><td>${esc(total)} <small>DC</small></td></tr></tfoot></table>${source(formula)}</section>`;
}
