import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {PROCEDURES,defaultContext} from '../src/domain/model.js';
import {runProcedure,runEncounterRoster,runLockAttempt} from '../src/generators/procedures.js';
import {reportView} from '../src/components/render.js';
import {statEntries,resultField} from '../src/components/result-fields.js';
import {enemyDeskView,threatReference} from '../src/components/play-tools.js';
import {GUARDIANS} from '../src/data/guardians.js';
import {localizeRecord} from '../src/data/localization.js';
import {tables} from '../src/data/tables.js';
import {KNOWN_THREATS} from '../src/data/enemies.js';

const make=(id,options={},rng=()=>.5)=>runProcedure(id,{campaignId:'layout',context:defaultContext(),options,rng});
function dom(run){const w=new Window(),root=w.document.createElement('main');root.innerHTML=reportView(run,[run]);return root;}
const values=(root,selector)=>[...root.querySelectorAll(selector)].map(el=>({label:el.querySelector('dt').textContent,value:el.querySelector('dd').textContent}));

test('prose effects have separate label and value areas; emphasis preserves text and escaping',()=>{
  const item={title:'특수 능력',text:'분쇄(Crush): D20 피해, 공격 +5. 3회 사용.',detail:'2라운드 동안 <script>alert(1)</script>는 문자로 남는다.'};
  const before=structuredClone(item),w=new Window(),root=w.document.createElement('main');root.innerHTML=resultField(item);
  assert.equal(root.querySelector('.value-pair>dt').textContent,item.title);
  assert.equal(root.querySelector('.value-pair>.field-value .field-copy').textContent,item.text);
  assert.equal(root.querySelector('.feature-name').textContent,'분쇄(Crush):');
  assert.ok(root.querySelector('.value-pair>.field-detail').textContent.endsWith(item.detail));
  assert.deepEqual([...root.querySelectorAll('.rule-value')].map(el=>el.textContent),['D20','+5','3회','2라운드']);
  assert.equal(root.querySelector('script'),null);
  assert.deepEqual(item,before);
});

test('every Guardian tier has individually labeled stats, including zero and printed dashes',()=>{
  for(const [model,guardian] of Object.entries(GUARDIANS))for(const [tier,stats] of Object.entries(guardian.tiers)){
    const run=make('creature',{species:'Guardian',guardianModel:model,tier}),before=structuredClone(run),root=dom(run);
    assert.deepEqual(values(root,'.enemy-card .attribute-grid .stat-cell').map(x=>x.value),stats.attributes.map(String));
    assert.deepEqual(values(root,'.enemy-card .combat-grid .stat-cell').map(x=>x.value),stats.combat.map(x=>String(x??'—')));
    assert.equal(root.querySelector('[data-field="공격과 피해"] [aria-label="공격과 피해"] dd').textContent,stats.attack);
    assert.equal(root.querySelector('[data-field="공격과 피해"] .stat-cell:last-child dd').textContent,stats.damage);
    assert.equal(root.querySelector('#result-headline').textContent,run.enemy.name);
    assert.equal(root.querySelectorAll('.enemy-card [data-field="기본 능력치"]').length,1);
    if(model==='anansi')assert.match(root.querySelector('[data-field="공격과 피해"] .field-detail').textContent,/直接|직접 공격 대상으로/);
    assert.equal(root.querySelector('.journal-text,[data-action="copy"],[data-action="copy-journal"]'),null);
    assert.deepEqual(run,before);
  }
});

test('NPC attributes and fixed companion combat values precede descriptive fields',()=>{
  const root=dom(make('npc-profile'));
  assert.equal(root.querySelectorAll('.attribute-grid .stat-cell').length,6);
  assert.deepEqual(values(root,'.combat-grid .stat-cell'),[{label:'상처',value:'3'},{label:'방어',value:'2'}]);
  assert.equal(root.querySelector('.report-body>.result-section h3').textContent,'동료 능력치');
  assert.equal(root.querySelectorAll('.report-details [data-field="인물 이름"]').length,1);
});

test('mixed rosters retain separate tier stats and counts while sharing the appearance reference',()=>{
  const source=make('area');source.encounter={type:'Aberration',slot:1,composition:[{tier:'easy',count:3},{tier:'elite',count:1}]};
  const run=runEncounterRoster(source,{rng:()=>.5}),before=structuredClone(run),root=dom(run),cards=[...root.querySelectorAll('.enemy-card')];
  assert.equal(cards.length,2);
  for(let i=0;i<cards.length;i++){
    assert.equal(cards[i].querySelector('.enemy-meta>div:last-child dd').textContent,String(run.cards[i].count));
    assert.deepEqual(values(cards[i],'.attribute-grid .stat-cell'),statEntries(run.cards[i].items.find(item=>item.title==='기본 능력치')));
  }
  const appearance=run.cards[0].items.filter(item=>item.group==='외형');
  assert.equal(root.querySelectorAll('.report-details [data-field]').length,run.cards[0].items.filter(item=>['이름','외형','생물 유형'].includes(item.group)||item.title==='생물 역할'||item.tableId==='creature-role').length);
  assert.ok(appearance.every(item=>root.querySelector('.report-details').textContent.includes(item.text)));
  assert.deepEqual(run,before);
  assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},'creature',{currentId:run.id}).includes('enemy-reference'),false);
  assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},'behavior',{currentId:'action'}).includes('enemy-reference'),true);
});

test('fixed threat references use the same labeled stats and preserve recovery conditions',()=>{
  const w=new Window(),root=w.document.createElement('main');root.innerHTML=threatReference();
  const threats=[...root.querySelectorAll('.threat-reference>details')];
  Object.values(KNOWN_THREATS).forEach((threat,index)=>{
    assert.deepEqual(values(threats[index],'.attribute-grid .stat-cell').map(x=>x.value),threat.attributes.map(String));
    assert.deepEqual(values(threats[index],'.combat-grid .stat-cell').map(x=>x.value),threat.combat.map(x=>String(x??'—')));
    assert.deepEqual(values(threats[index],'[data-field="회복 상태"] .stat-cell').map(x=>x.value),threat.recovery);
  });
});

test('appraisal reads the saved breakdown, rather than recalculating from changed UI options',()=>{
  const run=make('appraisal',{artifactCount:2,crystalCount:2,alloyCount:1,findCount:3,encounterCount:2});
  run.options.crystalCount=999;
  const before=structuredClone(run),root=dom(run),rows=[...root.querySelectorAll('.appraisal-table tbody tr')];
  assert.equal(rows[1].querySelector('td').textContent,'2');
  assert.equal(rows[1].lastElementChild.textContent,'100');
  assert.equal(root.querySelector('.appraisal-table tfoot td').textContent.trim(),'300 DC');
  assert.equal(root.querySelectorAll('[data-field="정산 내역"]').length,0);
  assert.deepEqual(run,before);
});

test('all situation outputs retain their field values without a concatenated journal heading',()=>{
  for(const procedure of PROCEDURES)for(const face of [.01,.5,.99]){
    const run=make(procedure.id,{},()=>face),before=structuredClone(run),root=dom(run);
    assert.ok(root.querySelector('#result-headline'));
    assert.equal(root.querySelector('.journal-text,.copy-line,[data-action="copy-journal"],.dice-ribbon'),null);
    for(const item of localizeRecord(run,tables).items){
      const entries=statEntries(item);
      if(entries){for(const entry of entries)assert.ok(values(root,'.stat-cell').some(x=>x.label===entry.label&&x.value===entry.value),`${procedure.id}: ${entry.label} ${entry.value}`);}
      else if(item.title==='정산 내역')assert.ok(root.querySelector('.appraisal-table'));
      else if(procedure.id==='dice')assert.equal(root.querySelector('.dice-total-grid .stat-cell:last-child dd').textContent,run.headline);
      else assert.ok(root.textContent.includes(item.text),`${procedure.id}: ${item.title}`);
    }
    if(run.hacking)assert.deepEqual([...root.querySelectorAll('.hack-choice b')].map(el=>Number(el.textContent)),run.hacking.values);
    assert.deepEqual(run,before);
  }
  const door=make('door',{},()=>.2),attempt=runLockAttempt(door,'outside',{rng:()=>.99}),root=dom(attempt);
  assert.equal(root.querySelector('[data-field="선택"] dd').textContent,'바깥쪽');
  assert.equal(root.querySelector('[data-field="접근 노드"] dd').textContent,'10');
});
