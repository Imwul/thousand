import {PROCEDURES,SLOT_COUNTS,newCampaign,normalizeContext,normalizeOptions,endScene} from './domain/model.js';
import {tableList,tables,CATEGORIES} from './data/tables.js';
import {runProcedure,runLockAttempt,runHackReroll} from './generators/procedures.js';
import {openStore,makeBackup,validateBackup,recordsMarkdown} from './storage/store.js';
import {procedureList,optionFields,emptyReport,reportView,historyCards,contextFields,libraryView,tableView,expeditionReadout,nextStepView,paperDesk,asideLog} from './components/render.js';
import {icon,esc} from './components/icons.js';
import {localizeRecord} from './data/localization.js';

const $=s=>document.querySelector(s);
const state={db:null,campaigns:[],records:[],persisted:new Set(),selectedId:null,procedure:'question',currentId:null,filter:'all',historyQuery:'',unsaved:new Set(),saving:new Set(),queue:Promise.resolve(),modal:null,backup:null,historyLimit:50};
let toastTimer,optionTimer,pendingMemo=null;
const campaign=()=>state.campaigns.find(c=>c.id===state.selectedId);
const current=()=>state.records.find(r=>r.id===state.currentId);
const ownRecords=()=>state.records.filter(r=>r.campaignId===state.selectedId);
function message(text,error=false){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').className=`show${error?' error':''}`;toastTimer=setTimeout(()=>{$('#toast').className='';},error?6500:3000);}
function status(){
  const el=$('#storage-status');
  el.classList.toggle('is-error',!state.db||state.unsaved.size>0);
  el.textContent=!state.db?'브라우저 저장 연결 안 됨':state.unsaved.size?'저장되지 않은 기록 있음':state.saving.size?'저장 중':'브라우저에 기록 중';
}
function enqueue(task,onFailure){
  const promise=state.queue.then(task);
  state.queue=promise.then(()=>true).catch(error=>{onFailure?.(error);message(error.message||'저장하지 못했습니다. 백업을 내려받아 기록을 보관하세요.',true);status();return false;});
  return state.queue;
}
function saveCampaign(){const snapshot=structuredClone(campaign());return enqueue(async()=>{if(!state.db)throw new Error('브라우저 저장 공간에 연결하지 못했습니다. 현재 기록은 백업으로 보관하세요.');await state.db.saveCampaign(snapshot);});}
function recentIds(){
  const stored=campaign()?.recentProcedures;
  if(Array.isArray(stored)&&stored.length)return stored.filter(id=>PROCEDURES.some(p=>p.id===id)).slice(0,5);
  const seen=[];
  for(const r of [...ownRecords()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){
    if(!PROCEDURES.some(p=>p.id===r.procedureId)||seen.includes(r.procedureId))continue;
    seen.push(r.procedureId);if(seen.length===5)break;
  }
  return seen;
}
function touchRecent(id){
  if(!PROCEDURES.some(p=>p.id===id))return;
  const c=campaign();
  c.recentProcedures=[id,...(Array.isArray(c.recentProcedures)?c.recentProcedures:[]).filter(v=>v!==id&&PROCEDURES.some(p=>p.id===v))].slice(0,5);
}
function renderDesk(){
  const c=campaign();if(!c||!$('#next-steps'))return;
  const keepMore=$('#procedures .more-procedures')?.open;
  $('#procedures').innerHTML=procedureList(state.procedure,{compact:innerWidth<801,recent:recentIds()});
  if(keepMore){const more=$('#procedures .more-procedures');if(more)more.open=true;}
  $('#expedition-readout').innerHTML=expeditionReadout(c.context,ownRecords().length);
  $('#next-steps').innerHTML=nextStepView(state.procedure);
  $('#paper-desk').innerHTML=paperDesk(current());
  $('#aside-log').innerHTML=asideLog(ownRecords(),state.currentId);
}
function renderControls(){
  const p=PROCEDURES.find(p=>p.id===state.procedure),c=campaign();
  $('#procedure-title').textContent=p.name;$('#procedure-english').textContent=p.en;$('#procedure-source').textContent=`Core p. ${p.pages}`;
  $('#options').innerHTML=optionFields(state.procedure,c.options,c.context);
  $('#context-label').textContent=c.context.siteName||'탐사 맥락';
  renderDesk();
}
function renderReport(animate=false){
  const host=$('#report-host'),r=current();
  host.innerHTML=r?reportView(r,state.records,{unsaved:state.unsaved.has(r.id),saving:state.saving.has(r.id)}):emptyReport(state.procedure);
  host.classList.toggle('report-entrance',animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
  renderDesk();
}
function updateRecordStatus(){
  const r=current(),el=$('.record-state');if(!r||!el)return;
  const failed=state.unsaved.has(r.id),saving=state.saving.has(r.id);
  el.classList.toggle('unsaved',failed);
  el.innerHTML=`${icon(failed?'close':'check',14)}${failed?'저장 실패 · 결과는 화면에 유지 중':saving?'저장 중':'브라우저에 저장됨'}`;
}
function renderHistory(){
  const all=ownRecords(),q=state.historyQuery.toLowerCase();
  const filtered=all.filter(r=> (state.filter==='all'||r.pinned)&&recordHaystack(r).includes(q));
  $('#history-count').textContent=all.length;$('#total-count').textContent=all.length;
  $('#history-list').innerHTML=filtered.length?historyCards(filtered,state.currentId):all.length?'<p class="no-results">일치하는 기록이 없습니다.</p>':historyCards([],null);
  document.querySelector('[data-action="filter-all"]').classList.toggle('selected',state.filter==='all');
  document.querySelector('[data-action="filter-pinned"]').classList.toggle('selected',state.filter==='pinned');
}
function renderCampaigns(){
  $('#campaign').innerHTML=state.campaigns.map(c=>`<option value="${esc(c.id)}" ${c.id===state.selectedId?'selected':''}>${esc(c.name)}</option>`).join('');
}
function recordHaystack(r){const v=localizeRecord(r,tables);return `${v.title} ${v.headline} ${v.subline} ${v.memo} ${r.headline} ${r.subline} ${r.options?.question??''}`.toLowerCase();}
function refresh(){renderCampaigns();renderControls();renderReport();renderHistory();status();}
function collectOptions(){
  const form=$('#roll-form'),c=campaign(),next={...c.options};
  for(const input of form.querySelectorAll('input,textarea,select')){
    if(input.type==='radio'){if(input.checked)next[input.name]=input.value;}
    else if(input.type==='checkbox')next[input.name]=input.checked;
    else if(input.type==='number'||['moodDepth'].includes(input.name))next[input.name]=Number(input.value);
    else next[input.name]=input.value;
  }
  c.options=normalizeOptions(next);return c.options;
}
function flushOptions(){clearTimeout(optionTimer);try{collectOptions();return saveCampaign();}catch(e){message(e.message,true);return Promise.resolve();}}
function flushMemo(){
  if(!pendingMemo)return state.queue;
  const {id,memo}=pendingMemo;pendingMemo=null;
  return enqueue(async()=>{
    if(!state.db)throw new Error('메모가 저장되지 않았습니다. 백업을 내려받아 보관하세요.');
    if(!state.persisted.has(id)){const r=state.records.find(r=>r.id===id);await state.db.saveRecord(r);state.persisted.add(id);}
    else await state.db.annotateRecord(id,{memo});
    state.unsaved.delete(id);
    if(state.currentId===id&&$('#memo-status'))$('#memo-status').textContent='저장됨';
    status();
  },()=>{state.unsaved.add(id);if(state.currentId===id&&$('#memo-status'))$('#memo-status').textContent='저장 실패';});
}
function showDialog(title,html,{wide=false,type=null}={}){
  flushMemo();$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;$('#dialog').classList.toggle('wide-dialog',wide);state.modal=type;
  if(!$('#dialog').open)$('#dialog').showModal();
}
function closeDialog(){state.modal=null;state.backup=null;$('#dialog').close();}
async function retain(run,{keyboard=false}={}){
  await flushMemo();state.records.push(run);state.currentId=run.id;state.saving.add(run.id);renderReport(!keyboard);renderHistory();status();
  const heading=$('#result-headline');if(keyboard)heading?.focus({preventScroll:true});
  const reportTop=$('#report-host').getBoundingClientRect().top;
  if(innerWidth<801||reportTop<0||reportTop>innerHeight*.6)$('#report-host').scrollIntoView({behavior:'instant',block:'start'});
  await enqueue(async()=>{
    if(!state.db)throw new Error('저장 공간에 연결하지 못했습니다. 결과는 화면과 메모리에 유지됩니다. 백업을 내려받으세요.');
    await state.db.saveRecord(run);state.persisted.add(run.id);state.saving.delete(run.id);state.unsaved.delete(run.id);
    if(current()?.id===run.id)updateRecordStatus();status();
  },()=>{state.saving.delete(run.id);state.unsaved.add(run.id);if(current()?.id===run.id)updateRecordStatus();});
}
async function roll({keyboard=false,tableId,parent=null,lockGuess=null,hackIndex=null}={}){
  const button=$('#roll-button');button.disabled=true;
  try{
    collectOptions();if(!tableId)touchRecent(parent?.procedureId??state.procedure);await saveCampaign();
    let run;
    if(Number.isInteger(hackIndex))run=runHackReroll(parent,hackIndex);
    else if(lockGuess)run=runLockAttempt(parent,lockGuess,{campaignId:state.selectedId});
    else if(parent?.lockAttempt)run=runLockAttempt({...parent,pending:parent.lockAttempt.pending},parent.lockAttempt.guess,{campaignId:state.selectedId});
    else run=runProcedure(tableId?'table':parent?.procedureId??state.procedure,{context:parent?.context??campaign().context,options:parent?.options??campaign().options,campaignId:state.selectedId,parentId:parent?.id,tableId:tableId??parent?.tableId});
    await retain(run,{keyboard});
  }catch(e){message(e.message,true);}finally{button.disabled=false;}
}
function contextDialog(){showDialog('현재 탐사 맥락',contextFields(campaign().context),{type:'context'});}
function libraryDialog(){showDialog(`표 찾아보기 · ${tableList.length}개`,`<div class="library-toolbar"><input class="dialog-search" id="library-search" type="search" aria-label="표 검색" placeholder="한글 또는 영문으로 표 찾기"><select id="library-category" aria-label="표 분류">${Object.entries(CATEGORIES).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></div><div id="library-results">${libraryView()}</div>`,{type:'library'});$('#library-search').focus();}
function historyDialog(){
  state.historyLimit=50;
  showDialog('탐사 기록',`<div class="history-dialog-tools"><input class="dialog-search" type="search" id="all-history-search" aria-label="모든 기록 검색" placeholder="질문·결과·메모에서 찾기"><label><input type="checkbox" id="all-history-pinned">고정한 기록만</label></div><div id="all-history-list" class="history-dialog-list"></div><div id="history-more"></div>`,{wide:true,type:'history'});renderHistoryDialog();
}
function renderHistoryDialog(){
  if(state.modal!=='history')return;
  const q=($('#all-history-search')?.value??'').toLowerCase(),pinned=$('#all-history-pinned')?.checked;
  const records=ownRecords().filter(r=>(!pinned||r.pinned)&&recordHaystack(r).includes(q));
  $('#all-history-list').innerHTML=records.length?historyCards(records,state.currentId,state.historyLimit):'<p class="no-results">찾는 기록이 없습니다.</p>';
  $('#history-more').innerHTML=records.length>state.historyLimit?`<button class="secondary" data-action="more-history">50개 더 보기 (${Math.min(state.historyLimit,records.length)}/${records.length})</button>`:'';
}
function download(name,content,type='application/json'){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function backupDialog(){
  showDialog('백업·가져오기',`<section class="backup-section"><h3>백업 내보내기</h3><p>전체 ${state.campaigns.length}개 캠페인, ${state.records.length}개 굴림을 백업합니다. 저장 공간이 달라지는 다른 브라우저·기기로 옮길 때도 사용할 수 있습니다.</p><div class="button-row"><button class="primary" data-action="export-json">${icon('download',18)}전체 JSON 백업</button><button class="secondary" data-action="export-md">${icon('book',18)}현재 탐사 Markdown</button></div></section><section class="backup-section"><h3>백업 가져오기</h3><p>내용을 먼저 검사한 뒤 새 캠페인으로 추가합니다. 기존 기록을 덮어쓰지 않습니다.</p><input class="file-input" id="backup-file" type="file" accept="application/json,.json" aria-label="JSON 백업 파일 선택"><div id="import-preview"></div></section><p class="field-help" style="margin-top:25px">저장된 플레이 기록은 이 브라우저에만 있습니다. 사이트 로그인은 기기 사이의 기록을 동기화하지 않습니다.</p>`,{type:'backup'});
}
async function previewImport(file){
  state.backup=null;const host=$('#import-preview');if(!file)return;
  try{
    if(file.size>20*1024*1024)throw new Error('20MB 이하의 JSON 백업을 선택하세요.');
    const backup=validateBackup(JSON.parse(await file.text()));state.backup=backup;
    host.innerHTML=`<div class="import-preview"><strong>검사 완료</strong><p>${backup.campaigns.length}개 캠페인 / ${backup.records.length}개 굴림</p><p>${backup.campaigns.slice(0,8).map(c=>esc(c.name)).join('<br>')}</p></div><button data-action="import-json" class="primary">새 캠페인으로 가져오기</button>`;
  }catch(e){host.innerHTML=`<p class="import-error">${esc(e.message)} 기존 기록은 그대로 있습니다.</p>`;}
}
async function saveContext(form){
  const f=new FormData(form),size=Number(f.get('size')),c=campaign();
  const context=normalizeContext({...c.context,siteName:String(f.get('siteName')).trim(),crew:Number(f.get('crew')),presentCrew:Number(f.get('presentCrew')),location:f.get('location'),size,purpose:Number(f.get('purpose')),hazard:Number(f.get('hazard')),resources:f.has('resources'),artifacts:f.has('artifacts'),knownThreats:f.has('knownThreats'),biome:Number(f.get('biome')),terrain:Number(f.get('terrain')),singleBiome:f.has('singleBiome'),slots:Array.from({length:SLOT_COUNTS[size-1]},(_,i)=>String(f.get(`slot-${i}`)??''))});
  c.context=context;if(!await saveCampaign())return;closeDialog();renderControls();message('현재 탐사 맥락을 저장했습니다.');
}
async function adoptSite(){
  const r=current();if(!r?.adopt)return;
  showDialog('새 장소로 이어가기',`<form id="adopt-form" class="dialog-form"><p class="field-help">${r.procedureId==='planet'?'행성의 생물군계를 현재 맥락으로 사용합니다.':'이 결과의 용도·위험·규모를 현재 맥락으로 사용하고 새 장소의 조우 슬롯을 준비합니다.'} 이전 굴림 기록은 보존됩니다.</p><label>장소 이름<input name="name" maxlength="200" placeholder="종이에 적은 이름" value="${esc(r.generatedName??((tables.purpose.rows[r.adopt.purpose-1]?.text??'새 장소')+' 탐사지'))}"></label><button class="primary" type="submit">이 장소를 현재 맥락으로 사용</button></form>`,{type:'adopt'});
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled||!campaign())return;
  const action=button.dataset.action;
  try{
    if(action==='procedure'){
      await flushMemo();touchRecent(button.dataset.id);await flushOptions();state.procedure=button.dataset.id;
      state.currentId=ownRecords().filter(r=>r.procedureId===state.procedure).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]?.id??null;
      renderControls();renderReport();renderHistory();
      const panel=$('.control-panel'),top=panel.getBoundingClientRect().top;
      if(innerWidth<801||top<0||top>innerHeight-160)panel.scrollIntoView({behavior:'instant',block:'start'});
    }
    else if(action==='workbench'){await flushMemo();closeDialog();$('#workbench').scrollIntoView({behavior:'instant'});}
    else if(action==='record'){
      await flushMemo();const record=state.records.find(r=>r.id===button.dataset.id);if(!record)return;
      state.currentId=record.id;if(PROCEDURES.some(p=>p.id===record.procedureId))state.procedure=record.procedureId;
      if($('#dialog').open)closeDialog();renderControls();renderReport();renderHistory();$('#result-headline')?.focus({preventScroll:true});
      const top=$('#report-host').getBoundingClientRect().top;
      if(innerWidth<801||top<0||top>innerHeight*.6)$('#report-host').scrollIntoView({behavior:'instant'});
    }
    else if(action==='reroll'){await roll({parent:current(),keyboard:event.detail===0});}
    else if(action==='lock'){await roll({parent:current(),lockGuess:button.dataset.value,keyboard:event.detail===0});}
    else if(action==='hack'){await roll({parent:current(),hackIndex:Number(button.dataset.value),keyboard:event.detail===0});}
    else if(action==='paper'){
      const r=current(),key=button.dataset.key;if(!r)return;
      const next=new Set(r.paper??[]);next.has(key)?next.delete(key):next.add(key);r.paper=[...next];renderDesk();
      await flushMemo();
      await enqueue(async()=>{
        if(!state.db)throw new Error('종이 체크를 저장할 수 없습니다.');
        if(!state.persisted.has(r.id)){await state.db.saveRecord(r);state.persisted.add(r.id);}
        else await state.db.annotateRecord(r.id,{paper:r.paper});
        state.unsaved.delete(r.id);status();
      },()=>{state.unsaved.add(r.id);status();});
    }
    else if(action==='pin'){
      const r=current();await flushMemo();
      r.pinned=!r.pinned;renderReport();renderHistory();
      await enqueue(async()=>{if(!state.db)throw new Error('고정 상태를 저장할 수 없습니다.');if(!state.persisted.has(r.id)){await state.db.saveRecord(r);state.persisted.add(r.id);}else await state.db.annotateRecord(r.id,{pinned:r.pinned,memo:r.memo});state.unsaved.delete(r.id);},()=>state.unsaved.add(r.id));
    }
    else if(action==='copy'){
      const r=current(),text=recordsMarkdown(campaign(),[localizeRecord(r,tables)]);
      try{await navigator.clipboard.writeText(text);message('보고서와 주사위 근거를 복사했습니다.');}
      catch{showDialog('보고서 복사',`<p class="field-help">브라우저가 자동 복사를 허용하지 않았습니다. 아래 내용을 선택해 복사하세요.</p><textarea rows="12" readonly id="copy-text">${esc(text)}</textarea>`);$('#copy-text').select();}
    }
    else if(action==='context')contextDialog();
    else if(action==='twist'){campaign().context.twist=Number(button.dataset.value);await saveCampaign();renderControls();}
    else if(action==='library')libraryDialog();
    else if(action==='table'){
      const id=button.dataset.id;if(!tables[id])return;showDialog(tables[id].title,tableView(id),{type:'table'});
    }
    else if(action==='roll-table'){const id=button.dataset.id;closeDialog();await roll({tableId:id,keyboard:event.detail===0});}
    else if(action==='history')historyDialog();
    else if(action==='more-history'){state.historyLimit+=50;renderHistoryDialog();}
    else if(action==='filter-all'||action==='filter-pinned'){state.filter=action==='filter-all'?'all':'pinned';renderHistory();}
    else if(action==='backup')backupDialog();
    else if(action==='close-dialog')closeDialog();
    else if(action==='new-campaign')showDialog('새 탐사 만들기',`<form id="campaign-form" class="dialog-form"><label>캠페인 이름<input name="name" maxlength="200" required placeholder="캠페인 이름 입력"></label><button class="primary" type="submit">새 탐사 시작</button></form>`,{type:'campaign'});
    else if(action==='export-json'){
      await flushMemo();await flushOptions();download(`thousand-worlds-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(makeBackup(state.campaigns,state.records),null,2));message('전체 기록의 JSON 백업을 내려받았습니다.');
    }
    else if(action==='export-md'){
      await flushMemo();download(`thousand-worlds-log-${new Date().toISOString().slice(0,10)}.md`,recordsMarkdown(campaign(),ownRecords().map(r=>localizeRecord(r,tables))),'text/markdown;charset=utf-8');
    }
    else if(action==='import-json'){
      if(!state.backup||!state.db)return;button.disabled=true;
      const result=await state.db.importBackup(state.backup);state.campaigns.push(...result.campaigns);state.records.push(...result.records);for(const r of result.records)state.persisted.add(r.id);state.selectedId=result.campaigns[0].id;state.currentId=null;closeDialog();refresh();message('기존 기록을 보존하고 새 캠페인으로 가져왔습니다.');
    }
    else if(action==='adopt')await adoptSite();
    else if(action==='adopt-terrain'){const r=current();if(r.context.siteId!==campaign().context.siteId)throw new Error('현재 장소가 기록 당시와 다릅니다. 탐사 맥락에서 지형을 직접 선택하세요.');campaign().context.terrain=r.terrain;if(await saveCampaign()){renderControls();message('다음 헥스의 이전 지형으로 사용합니다.');}}
    else if(action==='adopt-encounter'){
      const r=current(),c=campaign();
      if(c.context.siteId!==r.context.siteId||c.context.size!==r.context.size)throw new Error('현재 장소가 기록 당시와 달라졌습니다. 탐사 맥락에서 조우 슬롯을 직접 지정하세요.');
      c.context.slots[r.encounter.slot-1]=r.encounter.label;if(!await saveCampaign())return;renderControls();message(`${r.encounter.slot}번 슬롯에 유형을 기록했습니다.`);
    }
    else if(action==='source-info')showDialog('원문 확인',`<p class="about-copy">이 결과의 규칙은 제공하신 Core Rulebook의 p. ${esc(button.dataset.page)}를 사용합니다. 원본 PDF는 앱에 업로드하거나 포함하지 않았습니다.</p>`);
    else if(action==='about')showDialog('규칙·사용 안내',`<div class="about-copy"><p>종이 캐릭터 시트 옆에 펼쳐 두는 <strong>Across a Thousand Dead Worlds</strong> 개인용 오라클 작업대입니다.</p><ul><li>상황을 선택하고 「굴리기」를 누르면 필요한 하위 표까지 한 보고서로 펼칩니다.</li><li>모든 새 결과는 이 브라우저에 자동 보관합니다. 「다시 굴림」은 이전 값을 보존한 새 기록입니다.</li><li>현재 맥락은 결과 생성에 필요한 값만 사용합니다. 화면 위 탐사 막대에서 장소·인원·반전을 확인합니다.</li><li>곁질문은 열린 보고서를 유지한 채 예/아니오를 기록합니다. 종이 체크는 옮긴 표시만 남기며, Wounds·Stress·소지품과 시간트랙은 앱이 바꾸지 않습니다.</li><li>장면 종료 시 통제를 잃었다면 반전 확률을 올리고, 수기 시간트랙 초기화 때 1/6로 되돌리세요.</li></ul><p>2024 Core Rulebook의 기본 플레이용 ${tableList.length}개 표를 제공합니다. 솔로 GM·탐사지·행성·인물·생물·전투·정신 상태·항해·정거장·캐릭터 생성 표를 한국어로 번역했습니다. 인명·지명·기업명은 원문을 유지하며 생물명은 한글과 원문을 병기합니다. 수록 시나리오 전용 표는 제외했습니다. 원문 범위가 겹치는 감정 하위 표 1개는 직접 선택하도록 남겼고, 잘못 인쇄된 낮·밤 길이 값도 추정하지 않았습니다.</p><p>「반반」은 책의 기준인 D20 10 이상(55%)을 그대로 사용합니다. 돌발사건은 D8 두 개의 행·열 선택입니다. 자동 보안은 D10 표의 이름을 기준으로 본문 효과를 연결했습니다.</p><p>PC와 3440px 화면, 모바일을 지원합니다. ⌘/Ctrl+Enter: 굴리기, ⌘/Ctrl+K: 표 검색. 모든 기록은 브라우저에 저장되며 로그인만으로 기기 간 동기화되지 않습니다.</p><p>비공식 개인용 팬 도구. 원작 © Blackoath Entertainment. <a href="https://blackoathgames.com/across-a-thousand-dead-worlds" target="_blank" rel="noopener noreferrer">공식 게임 소개</a></p></div>`,{type:'about'});
  }catch(e){message(e.message||'작업을 완료하지 못했습니다.',true);}
});
document.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target;
  try{
    if(form.id==='roll-form')await roll({keyboard:event.submitter?.matches(':focus-visible')??false});
    else if(form.id==='quick-form')await askAside();
    else if(form.id==='context-form')await saveContext(form);
    else if(form.id==='campaign-form'){
      await flushMemo();await flushOptions();const name=new FormData(form).get('name');
      const c=state.db?await state.db.createCampaign(String(name)):newCampaign(String(name));state.campaigns.push(c);state.selectedId=c.id;state.currentId=null;state.historyQuery='';$('#history-search').value='';closeDialog();refresh();
    }
    else if(form.id==='adopt-form'){
      const r=current(),c=campaign(),name=String(new FormData(form).get('name')).trim();
      c.context=normalizeContext({...c.context,...r.adopt,siteId:crypto.randomUUID(),siteName:name||'이름 없는 탐사지'});if(!await saveCampaign())return;closeDialog();renderControls();message('새 장소의 맥락과 조우 슬롯을 준비했습니다.');
    }
  }catch(e){message(e.message,true);}
});
document.addEventListener('input',event=>{
  const target=event.target;
  if(target.id==='record-memo'){
    const r=current();if(!r)return;r.memo=target.value;pendingMemo={id:r.id,memo:target.value};$('#memo-status').textContent='저장 중';flushMemo();
  }
  else if(target.id==='history-search'){state.historyQuery=target.value;renderHistory();}
  else if(target.id==='library-search')$('#library-results').innerHTML=libraryView(target.value,$('#library-category')?.value??'all');
  else if(target.id==='all-history-search'){state.historyLimit=50;renderHistoryDialog();}
  else if(target.closest('#roll-form')){
    try{collectOptions();clearTimeout(optionTimer);optionTimer=setTimeout(saveCampaign,350);}catch{/* number fields can be temporarily empty while typing */}
  }
});
document.addEventListener('change',async event=>{
  const t=event.target;
  try{
    if(t.id==='campaign'){
      await flushMemo();await flushOptions();state.selectedId=t.value;if(state.db)await state.db.selectCampaign(t.value);state.currentId=ownRecords().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]?.id??null;state.historyQuery='';$('#history-search').value='';refresh();
    }
    else if(t.id==='backup-file')await previewImport(t.files[0]);
    else if(t.id==='library-category')$('#library-results').innerHTML=libraryView($('#library-search').value,t.value);
    else if(t.id==='all-history-pinned')renderHistoryDialog();
    else if(t.closest('#roll-form')){
      collectOptions();await saveCampaign();
      if(t.name==='odds')$('#odds-hint').textContent=`${({impossible:16,'very-unlikely':14,unlikely:12,even:10,likely:8,'very-likely':6,certain:4})[t.value]}+ / D20`;
      if(['week','destination'].includes(t.name)){
        const o=campaign().options;$('.known-weeks')?.classList.toggle('hidden',o.destination!=='known');
        if($('.travel-odds'))$('.travel-odds').innerHTML=`<span>사건 <strong>${Math.min(100,o.week*20)}%</strong></span><span>도착 <strong>${o.destination==='unknown'?Math.min(100,40+(o.week-1)*10)+'%':'일정 기준'}</strong></span>`;
      }
    }
    else if(t.closest('#context-form')&&t.name==='size'){
      const old=[...document.querySelectorAll('#slot-inputs input')].map(i=>i.value),count=SLOT_COUNTS[Number(t.value)-1];
      $('#slot-inputs').innerHTML=Array.from({length:count},(_,i)=>`<label class="slot-input"><span>${i+1}</span><input name="slot-${i}" value="${esc(old[i]??'')}" maxlength="300" placeholder="아직 만나지 않은 유형"></label>`).join('');
    }
  }catch(e){message(e.message,true);}
});
document.addEventListener('keydown',event=>{
  if(!(event.metaKey||event.ctrlKey)||event.isComposing)return;
  if(event.key.toLowerCase()==='k'){event.preventDefault();libraryDialog();}
  if(event.key==='Enter'&&!$('#dialog').open){
    if(event.target.closest('#quick-form')){event.preventDefault();askAside();return;}
    if(!$('#roll-button').disabled){event.preventDefault();roll({keyboard:true});}
  }
});
$('#dialog').addEventListener('cancel',()=>{state.modal=null;state.backup=null;});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushMemo();flushOptions();}});
window.addEventListener('pagehide',()=>{flushMemo();flushOptions();});

async function fileAside(run){
  await flushMemo();state.records.push(run);state.saving.add(run.id);renderHistory();renderDesk();status();
  await enqueue(async()=>{
    if(!state.db)throw new Error('저장 공간에 연결하지 못했습니다. 곁질문은 화면에 남아 있습니다. 백업을 내려받으세요.');
    await state.db.saveRecord(run);state.persisted.add(run.id);state.saving.delete(run.id);state.unsaved.delete(run.id);status();
  },()=>{state.saving.delete(run.id);state.unsaved.add(run.id);status();});
}
async function askAside(){
  const text=$('#quick-question').value.trim();
  if(!text){message('곁질문을 입력하세요.',true);return;}
  const button=$('#quick-form button[type="submit"]');button.disabled=true;
  try{
    touchRecent('question');await flushOptions();
    const options=normalizeOptions({...campaign().options,question:text,odds:$('#quick-odds').value||'even'});
    const run=runProcedure('question',{context:campaign().context,options,campaignId:state.selectedId,parentId:state.currentId});
    run.aside=true;await fileAside(run);$('#quick-question').value='';
    message(`곁질문 기록: ${localizeRecord(run,tables).headline}`);
  }catch(e){message(e.message,true);}finally{button.disabled=false;}
}
async function start(){
  try{
    state.db=await openStore();const data=await state.db.load();Object.assign(state,data);state.persisted=new Set(state.records.map(r=>r.id));
    if(!state.campaigns.length){const c=await state.db.createCampaign('첫 번째 탐사');state.campaigns=[c];state.selectedId=c.id;}
    if(!campaign())state.selectedId=state.campaigns[0].id;
    for(const c of state.campaigns){c.context=normalizeContext(c.context);c.options=normalizeOptions(c.options);}
    state.currentId=ownRecords().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]?.id??null;
    const r=current();if(r&&PROCEDURES.some(p=>p.id===r.procedureId))state.procedure=r.procedureId;
  }catch(e){
    state.db=null;if(!state.campaigns.length){const c=newCampaign('첫 번째 탐사');state.campaigns=[c];state.selectedId=c.id;}message('저장 공간을 열지 못했습니다. 굴림은 사용할 수 있으며 결과를 백업으로 보관하세요.',true);
  }
  refresh();
}
start();
