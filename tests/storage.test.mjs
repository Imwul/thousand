import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {openStore,makeBackup,validateBackup,remapBackup,recordsMarkdown} from '../src/storage/store.js';
import {runProcedure} from '../src/generators/procedures.js';
const run=c=>runProcedure('question',{campaignId:c.id,options:{qualifier:false},context:c.context,rng:()=>.5});

test('real storage module persists a complete result, annotation and selection across reopen',async()=>{
  const name=crypto.randomUUID();let db=await openStore(name);const c=await db.createCampaign('검은 기록'),r=run(c),original=structuredClone(r);
  await db.saveRecord(r);await db.annotateRecord(r.id,{memo:'벽 너머의 생존자',pinned:true});db.close();db=await openStore(name);
  const loaded=await db.load();assert.equal(loaded.selectedId,c.id);assert.equal(loaded.records[0].memo,'벽 너머의 생존자');assert.equal(loaded.records[0].pinned,true);assert.deepEqual(loaded.records[0].trace,original.trace);db.close();
});
test('inserting a duplicate ID cannot overwrite an original roll',async()=>{
  const db=await openStore(crypto.randomUUID()),c=await db.createCampaign('원본'),r=run(c);await db.saveRecord(r);
  await assert.rejects(db.saveRecord({...r,headline:'덮어씀'}));assert.equal((await db.load()).records[0].headline,r.headline);db.close();
});
test('concurrent annotations preserve both memo and pinned metadata',async()=>{
  const db=await openStore(crypto.randomUUID()),c=await db.createCampaign('동시 주석'),r=run(c);await db.saveRecord(r);
  await Promise.all([db.annotateRecord(r.id,{memo:'단서'}),db.annotateRecord(r.id,{pinned:true})]);
  const saved=(await db.load()).records[0];assert.equal(saved.memo,'단서');assert.equal(saved.pinned,true);db.close();
});
test('backup import remaps parent links and adds new campaigns without overwriting',async()=>{
  const db=await openStore(crypto.randomUUID()),c=await db.createCampaign('원래 탐사'),a=run(c),b={...run(c),parentId:a.id};await db.saveRecord(a);await db.saveRecord(b);
  const backup=makeBackup([c],[a,b]),newData=await db.importBackup(backup),loaded=await db.load();
  assert.equal(loaded.campaigns.length,2);assert.equal(loaded.records.length,4);assert.notEqual(newData.campaigns[0].id,c.id);assert.equal(newData.records[1].parentId,newData.records[0].id);assert.equal(loaded.selectedId,newData.campaigns[0].id);assert.deepEqual(loaded.records.find(r=>r.id===a.id),a);db.close();
});
test('invalid imports reject before any transaction and leave old data intact',async()=>{
  const db=await openStore(crypto.randomUUID()),c=await db.createCampaign('안전한 기록'),r=run(c);await db.saveRecord(r);const backup=makeBackup([c],[r]);backup.records[0].trace[0].page=999;
  await assert.rejects(db.importBackup(backup));assert.equal((await db.load()).records.length,1);backup.records[0].trace[0].page=229;backup.records[0].parentId='missing';assert.throws(()=>validateBackup(backup),/이전 굴림/);db.close();
});
test('HTML-shaped notes remain ordinary JSON data; invalid context cannot be imported',()=>{
  const c={id:'c',name:'<img onerror=1>',createdAt:new Date().toISOString(),context:{siteName:'',crew:1,presentCrew:1,location:'space',purpose:0,hazard:0,size:1,twist:1,resources:true,artifacts:true,slots:['','','','']},options:{}};
  const r=run(c);r.memo='<script>alert(1)</script>';const b=validateBackup(makeBackup([c],[r]));assert.equal(b.records[0].memo,r.memo);b.campaigns[0].context.slots=[];assert.throws(()=>validateBackup(b),/슬롯/);
});
test('paper checks and aside questions survive annotation, backup, and markdown',async()=>{
  const db=await openStore(crypto.randomUUID()),c=await db.createCampaign('종이'),r=run(c);
  r.aside=true;r.options={...r.options,question:'소리가 있나?'};await db.saveRecord(r);
  await db.annotateRecord(r.id,{paper:['copied','sheet']});
  const saved=(await db.load()).records[0];
  assert.deepEqual(saved.paper,['copied','sheet']);assert.equal(saved.aside,true);assert.deepEqual(saved.trace,r.trace);
  const backup=makeBackup([{...c,recentProcedures:['question','area']}],[saved]);
  assert.deepEqual(validateBackup(backup).records[0].paper,['copied','sheet']);
  const badPaper=structuredClone(backup);badPaper.records[0].paper=['luck'];assert.throws(()=>validateBackup(badPaper),/종이/);
  const badRecent=structuredClone(backup);badRecent.campaigns[0].recentProcedures=['scenario-oracle'];assert.throws(()=>validateBackup(badRecent),/최근/);
  const badAside=structuredClone(backup);badAside.records[0].aside='yes';assert.throws(()=>validateBackup(badAside),/곁굴림/);
  const md=recordsMarkdown(c,[saved]);assert.match(md,/곁질문: 소리가 있나/);assert.match(md,/결과 요지를 종이에 옮김/);
  await assert.rejects(db.annotateRecord(r.id,{paper:['luck']}));
  assert.deepEqual((await db.load()).records[0].paper,['copied','sheet']);
  db.close();
});
test('Markdown export includes raw dice and original interpretation without mutating results',()=>{
  const c={id:'c',name:'일지',context:{}};const r=run(c);r.memo='귀환 후 확인';const before=JSON.stringify(r);const md=recordsMarkdown(c,[r]);assert.match(md,/귀환 후 확인/);assert.match(md,/d20 \[11\]=11/);assert.equal(JSON.stringify(r),before);
});
