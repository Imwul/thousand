import {newCampaign,normalizeContext,normalizeOptions} from '../domain/model.js';
export const DATABASE_NAME='thousand-worlds-logbook';
const req = request => new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error??new Error('저장 요청에 실패했습니다.'));});
function done(tx) {return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??new Error('저장 작업이 중단되었습니다.'));tx.onerror=()=>reject(tx.error??new Error('저장 공간에 기록할 수 없습니다.'));});}
export function openStore(name=DATABASE_NAME) {
  return new Promise((resolve,reject)=>{
    const q=indexedDB.open(name,1);
    q.onupgradeneeded=()=>{
      const db=q.result;
      db.createObjectStore('campaigns',{keyPath:'id'});
      const records=db.createObjectStore('records',{keyPath:'id'});records.createIndex('campaignId','campaignId');
      db.createObjectStore('meta',{keyPath:'key'});
    };
    q.onerror=()=>reject(q.error??new Error('브라우저 저장 공간을 열 수 없습니다.'));
    q.onblocked=()=>reject(new Error('다른 탭을 닫고 새로고침하면 저장 공간을 열 수 있습니다.'));
    q.onsuccess=()=>{q.result.onversionchange=()=>q.result.close();resolve(new LogStore(q.result));};
  });
}
class LogStore {
  constructor(db){this.db=db;}
  async load(){
    const tx=this.db.transaction(['campaigns','records','meta'],'readonly'),finished=done(tx);
    const [campaigns,records,selected]=await Promise.all([req(tx.objectStore('campaigns').getAll()),req(tx.objectStore('records').getAll()),req(tx.objectStore('meta').get('selected'))]);await finished;
    return {campaigns,records,selectedId:selected?.value??campaigns[0]?.id??null};
  }
  async createCampaign(name){const c=newCampaign(name),tx=this.db.transaction(['campaigns','meta'],'readwrite'),finished=done(tx);tx.objectStore('campaigns').add(c);tx.objectStore('meta').put({key:'selected',value:c.id});await finished;return c;}
  async selectCampaign(id){const tx=this.db.transaction('meta','readwrite'),finished=done(tx);tx.objectStore('meta').put({key:'selected',value:id});await finished;}
  async saveCampaign(c){normalizeContext(c.context);normalizeOptions(c.options);const tx=this.db.transaction('campaigns','readwrite'),finished=done(tx);tx.objectStore('campaigns').put(c);await finished;}
  async saveRecord(r){const tx=this.db.transaction('records','readwrite'),finished=done(tx);tx.objectStore('records').add(r);await finished;}
  async annotateRecord(id,patch){
    const tx=this.db.transaction('records','readwrite'),finished=done(tx),s=tx.objectStore('records');
    const record=await req(s.get(id));if(!record){tx.abort();await finished;throw new Error('해당 기록을 찾을 수 없습니다.');}
    if(typeof patch.memo==='string')record.memo=patch.memo.slice(0,10000);
    if(typeof patch.pinned==='boolean')record.pinned=patch.pinned;
    s.put(record);await finished;return record;
  }
  async importBackup(backup){
    const valid=validateBackup(backup),mapped=remapBackup(valid),tx=this.db.transaction(['campaigns','records','meta'],'readwrite'),finished=done(tx);
    for(const c of mapped.campaigns)tx.objectStore('campaigns').add(c);
    for(const r of mapped.records)tx.objectStore('records').add(r);
    tx.objectStore('meta').put({key:'selected',value:mapped.campaigns[0].id});await finished;
    return mapped;
  }
  close(){this.db.close();}
}
function string(v,max=10000){return typeof v==='string'&&v.length<=max;}
function date(v){return string(v,60)&&Number.isFinite(Date.parse(v));}
function page(v){return Number.isInteger(v)&&v>=1&&v<=446||Array.isArray(v)&&v.length<=10&&v.length>0&&v.every(n=>Number.isInteger(n)&&n>=1&&n<=446);}
export function validateBackup(input){
  if(!input||input.format!=='thousand-worlds-logbook'||input.schemaVersion!==1||!Array.isArray(input.campaigns)||!Array.isArray(input.records))throw new Error('Thousand Worlds 백업 형식이 아닙니다.');
  if(input.campaigns.length<1||input.campaigns.length>100||input.records.length>20000)throw new Error('백업의 캠페인·기록 개수가 지원 범위를 벗어납니다.');
  const ids=new Set(),rids=new Set();
  for(const c of input.campaigns){
    if(!c||!string(c.id,100)||!c.id||ids.has(c.id)||!string(c.name,200)||!c.name.trim()||!date(c.createdAt))throw new Error('캠페인 정보가 손상되었거나 중복됩니다.');
    normalizeContext(c.context);normalizeOptions(c.options);ids.add(c.id);
  }
  for(const r of input.records){
    if(!r||!string(r.id,100)||!r.id||rids.has(r.id)||!ids.has(r.campaignId)||!date(r.createdAt)||!string(r.title,2000)||!string(r.headline,3000)||!string(r.subline,5000)||!string(r.procedureId,100)||!string(r.memo,10000)||typeof r.pinned!=='boolean'||!['neutral','positive','negative','danger'].includes(r.tone)||!string(r.rulesVersion,100))throw new Error('굴림 기록의 기본 정보가 손상되었습니다.');
    normalizeContext(r.context);normalizeOptions(r.options);
    if(!Array.isArray(r.items)||r.items.length>200||!r.items.every(i=>i&&string(i.title,300)&&string(i.text,10000)&&page(i.page)&&(!i.detail||string(i.detail,10000))&&(!i.en||string(i.en,10000))&&(!i.group||string(i.group,300))))throw new Error('굴림 결과 항목이 손상되었습니다.');
    if(!Array.isArray(r.trace)||r.trace.length>3000||!r.trace.every(t=>t&&string(t.id,200)&&string(t.title,300)&&string(t.notation,50)&&Number.isFinite(t.value)&&Array.isArray(t.values)&&t.values.length<=10&&t.values.every(n=>Number.isInteger(n)&&n>=1&&n<=100)&&page(t.page)))throw new Error('주사위 기록이 손상되었습니다.');
    if(!Array.isArray(r.notes)||r.notes.length>100||!r.notes.every(n=>string(n,10000)))throw new Error('기록 안내가 손상되었습니다.');
    if(r.pending&&!(r.pending.type==='lock'&&Number.isInteger(r.pending.lo)&&Number.isInteger(r.pending.hi)&&r.pending.lo>=1&&r.pending.hi<=10&&r.pending.lo<=r.pending.hi&&typeof r.pending.secure==='boolean'))throw new Error('진행 중인 문 판정이 손상되었습니다.');
    if(r.lockAttempt){const p=r.lockAttempt.pending;if(!['inside','outside'].includes(r.lockAttempt.guess)||!p||p.type!=='lock'||!Number.isInteger(p.lo)||!Number.isInteger(p.hi)||p.lo<1||p.hi>10||p.lo>p.hi||typeof p.secure!=='boolean')throw new Error('잠금 해제 기록이 손상되었습니다.');}
    if(r.hacking&&(!Array.isArray(r.hacking.values)||r.hacking.values.length<1||r.hacking.values.length>6||r.hacking.values.some(v=>!Number.isInteger(v)||v<1||v>6)))throw new Error('해킹 주사위 기록이 손상되었습니다.');
    if(r.items.some(i=>i.image&&!/^\/maps\/(cover-\d+|guardian-\d+)\.png$/.test(i.image)))throw new Error('허용되지 않은 도해 경로가 있습니다.');
    if(r.adopt)normalizeContext({...r.context,...r.adopt});
    if(r.encounter&&(!Number.isInteger(r.encounter.slot)||r.encounter.slot<1||r.encounter.slot>r.context.slots.length||!string(r.encounter.label,300)))throw new Error('조우 슬롯이 손상되었습니다.');
    if(r.parentId!==null&&!string(r.parentId,100))throw new Error('이전 기록 연결이 손상되었습니다.');
    rids.add(r.id);
  }
  for(const r of input.records)if(r.parentId&&!rids.has(r.parentId))throw new Error('연결된 이전 굴림 기록이 백업에 없습니다.');
  return structuredClone(input);
}
export function remapBackup(backup){
  const cmap=new Map(backup.campaigns.map(c=>[c.id,crypto.randomUUID()])),rmap=new Map(backup.records.map(r=>[r.id,crypto.randomUUID()]));
  return {campaigns:backup.campaigns.map(c=>({...c,id:cmap.get(c.id),name:`${c.name} (가져옴)`})),records:backup.records.map(r=>({...r,id:rmap.get(r.id),campaignId:cmap.get(r.campaignId),parentId:r.parentId?rmap.get(r.parentId):null}))};
}
export function makeBackup(campaigns,records){return {format:'thousand-worlds-logbook',schemaVersion:1,exportedAt:new Date().toISOString(),campaigns:structuredClone(campaigns),records:structuredClone(records)};}
export function recordsMarkdown(campaign,records){
  const lines=[`# ${campaign.name}`,'',`Across a Thousand Dead Worlds · ${new Date().toISOString().slice(0,10)}`,''];
  for(const r of [...records].sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){
    lines.push(`## ${r.title}: ${r.headline}`,'',r.subline,'',`생성: ${r.createdAt} / 규칙: ${r.rulesVersion}`,'');
    for(const i of r.items)lines.push(`- **${i.title}**: ${i.text}${i.detail?` — ${i.detail}`:''} (p.${[i.page].flat().join(', ')})`);
    lines.push('','주사위: '+r.trace.map(t=>`${t.title} ${t.notation} [${t.values.join(',')}]=${t.value}${t.discarded?' (재굴림 제외)':''}`).join(' / '),'');
    if(r.memo)lines.push('### 해석 메모','',r.memo,'');
  }
  return lines.join('\n');
}
