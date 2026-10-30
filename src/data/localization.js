import {characterCombatKo} from './ko/character-combat.js';
import {planetKo} from './ko/planet.js';
import {creatureNpcStationKo} from './ko/creature-npc-station.js';
import {coreKo} from './ko/core.js';
import {PROPER_NAME_TABLES,localizeTerms,syllableReading,creatureName} from './glossary.js';
import {GUARDIANS,guardianItems} from './guardians.js';

export const KOREAN_ROWS={...characterCombatKo,...planetKo,...creatureNpcStationKo,...coreKo};
export function applyKorean(tables){
  for(const [id,translations] of Object.entries(KOREAN_ROWS)){
    if(!tables[id]||translations.length!==tables[id].rows.length)throw new Error(`${id}: 한국어 번역의 행 수가 원문과 다릅니다.`);
  }
  for(const t of Object.values(tables)){
    const translated=KOREAN_ROWS[t.id];
    t.rows=t.rows.map((r,i)=>{
      const key=r.key??r.text,rawDetail=r.detail??'',sourceText=r.sourceText??(r.en||key)+(rawDetail&&!/[가-힣]/.test(rawDetail)?'\n'+rawDetail:'');
      let text=translated?.[i]??key,detail=rawDetail;
      if(translated&&rawDetail&&!/[가-힣]/.test(rawDetail))detail='';
      if(t.id.startsWith('creature-name-'))text=`${syllableReading(key)}(${key})`;
      else if(!PROPER_NAME_TABLES.has(t.id))text=localizeTerms(text);
      return {...r,key,text,detail:localizeTerms(detail),...(translated||text!==key?{sourceText}:{})};
    });
    if(translated)t.language='ko';
    if(t.id.startsWith('behavior-'))t.title=localizeTerms(t.title);
  }
}

// A view of old snapshots in current Korean; stored dice, notes and user text are untouched.
export function localizeRecord(run,tables){
  if(!run)return run;
  const pairs=[];
  let items=run.items.map(item=>{
    const t=tables[item.tableId],row=t?.rows.find(r=>r.min<=item.roll&&r.max>=item.roll);
    const translated=row&&(row.sourceText||row.text!==row.key)&&
      (item.text===row.key||item.text===row.text||!/[가-힣]/.test(item.text));
    const next=translated?{...item,text:row.text,detail:row.detail??'',en:row.en??'',sourceText:row.sourceText??''}:
      {...item,text:PROPER_NAME_TABLES.has(item.tableId)?item.text:localizeTerms(item.text),detail:localizeTerms(item.detail??'')};
    if(item.text!==next.text)pairs.push([item.text,next.text]);
    return next;
  });
  const legacyGuardian=items.find(i=>/^\/maps\/guardian-\d+\.png$/.test(i.image??''));
  if(legacyGuardian){
    const model=Object.entries(GUARDIANS).find(([,g])=>legacyGuardian.image===`/maps/guardian-${g.page}.png`)?.[0]??'titan';
    items=items.flatMap(i=>i===legacyGuardian?guardianItems(model,run.options?.tier??'standard'):i);
  }
  const translateLine=(line,allowTerms=true)=>{
    let value=line;
    for(const [before,after] of [...pairs].sort((a,b)=>b[0].length-a[0].length)){
      if(before&&value===before)return after;
      if(value.endsWith('…')&&value.length>50&&before.startsWith(value.slice(0,-1)))return after;
      if(before.length>2)value=value.split(before).join(after);
    }
    return allowTerms?localizeTerms(value):value;
  };
  let headline=translateLine(run.headline,!['ship-name','site-name','planet','npc-profile'].includes(run.procedureId));
  if(run.procedureId==='creature'){
    const parts=run.items.filter(i=>/^creature-name-[123]$/.test(i.tableId??'')).map(i=>tables[i.tableId].rows.find(r=>r.min<=i.roll&&r.max>=i.roll)?.key).filter(Boolean);
    if(parts.length)headline=creatureName(parts);
  }
  return {...run,headline,subline:run.procedureId==='question'?run.subline:translateLine(run.subline),
    title:localizeTerms(run.title),items,notes:run.notes.map(localizeTerms)};
}
