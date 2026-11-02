import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {PROCEDURES,defaultContext} from '../src/domain/model.js';
import {runProcedure,runEncounterRoster,runLockAttempt} from '../src/generators/procedures.js';
import {reportView} from '../src/components/render.js';
import {statEntries,resultField,fieldGrid} from '../src/components/result-fields.js';
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

test('short and long fields stay paired; matrices and final odd fields never leave half rows empty',()=>{
  const items=[{title:'첫 칸',text:'짧은 값'},{title:'긴 칸',text:'긴 설명이어도 같은 행에 유지한다. '.repeat(12)},{title:'행 끝',text:'단독 값'},{title:'전투 수치',text:'상처 1 / 경계 10 / 장갑 — / 방어 2'},{title:'후속 A',text:'A'},{title:'후속 B',text:'B'},{title:'마지막 칸',text:'C'}];
  const before=structuredClone(items),w=new Window(),root=w.document.createElement('main');root.innerHTML=fieldGrid(items);
  const fields=[...root.querySelector('.field-grid').children];
  assert.equal(fields[0].classList.contains('field-wide'),false);
  assert.equal(fields[1].classList.contains('field-wide'),false);
  assert.equal(fields[1].querySelector('.field-copy').textContent,items[1].text);
  assert.equal(fields[2].classList.contains('field-wide'),true);
  assert.equal(fields[3].classList.contains('field-matrix'),true);
  assert.equal(fields[4].classList.contains('field-wide'),false);
  assert.equal(fields[5].classList.contains('field-wide'),false);
  assert.equal(fields[6].classList.contains('field-wide'),true);
  assert.deepEqual(items,before);
});

test('source, original text disclosure and dice share one metadata row below the value',()=>{
  const item={title:'위험',text:'결과 값',page:193,dice:'d10',roll:6,sourceText:'An original rulebook description that remains available for reference.'};
  const w=new Window(),root=w.document.createElement('main');root.innerHTML=resultField(item);
  const footer=root.querySelector('.field-source');
  assert.equal(footer.querySelectorAll(':scope>.source-link,:scope>.source-original,:scope>.dice-value').length,3);
  assert.equal(root.querySelector('.value-pair .field-copy').textContent,item.text);
  assert.equal(footer.querySelector('.source-original p').textContent,item.sourceText);
});

test('every Guardian tier has individually labeled stats, including zero and printed dashes',()=>{
  assert.deepEqual(Object.keys(GUARDIANS),['titan','anansi','arash','brahmari']);
  assert.deepEqual(Object.values(GUARDIANS).map(guardian=>Object.keys(guardian.tiers)),Array(4).fill(['easy','standard','elite','overwhelming']));
  for(const [model,guardian] of Object.entries(GUARDIANS))for(const [tier,stats] of Object.entries(guardian.tiers)){
    const run=make('creature',{species:'Guardian',guardianModel:model,tier}),before=structuredClone(run),root=dom(run);
    assert.deepEqual(values(root,'.enemy-card .attribute-grid .stat-cell').map(x=>x.value),stats.attributes.map(String));
    assert.deepEqual(values(root,'.enemy-card .combat-grid .stat-cell').map(x=>x.value),stats.combat.map(x=>String(x??'—')));
    assert.equal(root.querySelector('[data-field="공격과 피해"] [aria-label="공격과 피해"] dd').textContent,stats.attack);
    assert.equal(root.querySelector('[data-field="공격과 피해"] .stat-cell:last-child dd').textContent,stats.damage);
    assert.equal(root.querySelector('#result-headline').textContent,run.enemy.name);
    assert.equal(root.querySelectorAll('.enemy-card [data-field="기본 능력치"]').length,1);
    assert.ok(root.querySelector('.enemy-stats [data-field="공격과 피해"]'));
    assert.ok(root.querySelector('.enemy-abilities [data-field="수호자 특성"]'));
    assert.equal(root.querySelector('.enemy-stats [data-field="수호자 특성"]'),null);
    assert.equal(root.querySelector('.journal-text,[data-action="copy"],[data-action="copy-journal"]'),null);
    assert.deepEqual(run,before);
  }
});

test('Anansi shows the starred attack condition and each tier’s poison reference',()=>{
  for(const [tier,poison] of [['easy',null],['standard','IV'],['elite','III'],['overwhelming','I']]){
    const root=dom(make('creature',{species:'Guardian',guardianModel:'anansi',tier}));
    assert.match(root.querySelector('.enemy-stats [data-field="공격 조건"] .field-copy').textContent,/높은 공격 수치를 사용/);
    const reference=root.querySelector('.enemy-abilities .condition-reference');
    assert.equal(reference?.querySelector('dt').textContent.match(/(?:독|중독)\s+(IV|III|II|I)/)?.[1]??null,poison);
  }
});

test('NPC attributes and fixed companion combat values precede descriptive fields',()=>{
  const root=dom(make('npc-profile'));
  assert.equal(root.querySelectorAll('.attribute-grid .stat-cell').length,6);
  assert.deepEqual(values(root,'.combat-grid .stat-cell'),[{label:'상처',value:'3'},{label:'방어',value:'2'}]);
  const columns=root.querySelectorAll('.report-columns>.report-column');
  assert.equal(columns.length,2);
  assert.equal(columns[0].querySelector('.result-section h3').textContent,'동료 능력치');
  assert.ok(columns[0].querySelector('.attribute-grid'));
  assert.equal(columns[1].querySelector('.attribute-grid'),null);
  assert.ok(columns[1].querySelector('[data-field="인물 묘사"]'));
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
  assert.ok(appearance.every(item=>root.querySelector('.report-details:not(.effect-dice)').textContent.includes(item.text)));
  assert.deepEqual(run,before);
  assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},'creature',{currentId:run.id}).includes('enemy-reference'),false);
  assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},'behavior',{currentId:'action'}).includes('enemy-reference'),true);
  for(const procedure of ['planet','npc-profile','station','travel','appraisal'])assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},procedure,{currentId:'other'}),'');
  assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},'question',{currentId:'question'}).includes('enemy-reference'),true);
  assert.equal(enemyDeskView({...run.cards[0],sourceId:run.id,index:0},'table',{currentId:'quick',related:true}).includes('enemy-reference'),true);
});

test('fixed threat references use the same labeled stats and preserve recovery conditions',()=>{
  const w=new Window(),root=w.document.createElement('main');root.innerHTML=threatReference();
  const threats=[...root.querySelectorAll('.threat-reference>details')];
  assert.equal(threats.length,6);
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
  const valuesRows=[...root.querySelectorAll('.appraisal-values tbody tr')];
  assert.equal(valuesRows.length,2);
  assert.deepEqual(valuesRows.map(row=>row.querySelector('th').textContent),['1','2']);
  assert.deepEqual(valuesRows.map(row=>row.querySelectorAll('td')[1].textContent),['50','50']);
  assert.deepEqual(run,before);
});

test('custom dice display a labeled expression and total without a concatenated journal heading',()=>{
  const run=make('dice',{dicePreset:'custom',diceExpression:'2d10+5'}),root=dom(run);
  assert.deepEqual(values(root,'.dice-total-grid .stat-cell'),[{label:'주사위 식',value:'2d10+5'},{label:'합계',value:'17'}]);
  assert.equal(root.querySelector('#result-headline').textContent,'일반 주사위');
  assert.equal(root.querySelector('.journal-text'),null);
});

test('all other situation outputs retain their field values without a concatenated journal heading',()=>{
  assert.equal(PROCEDURES.length,36);
  for(const procedure of PROCEDURES.filter(procedure=>procedure.id!=='dice'))for(const face of [.01,.5,.99]){
    const run=make(procedure.id,{},()=>face),before=structuredClone(run),root=dom(run);
    assert.ok(root.querySelector('#result-headline'));
    assert.equal(root.querySelector('.journal-text,.copy-line,[data-action="copy-journal"],.dice-ribbon'),null);
    const items=localizeRecord(run,tables).items;
    const artifacts=items.filter(item=>item.tableId==='artifact-value');
    const artifactRows=[...root.querySelectorAll('.appraisal-values tbody tr')];
    assert.equal(artifactRows.length,artifacts.length,`${procedure.id}: 유물 감정 행 수`);
    assert.ok(artifacts.every((item,index)=>(statEntries(item)?.map(entry=>entry.value.replace(/ DC$/,''))??[item.text]).every(value=>artifactRows[index].textContent.includes(value))),`${procedure.id}: 유물 감정 값`);
    const matrixValues=items.filter(item=>item.tableId!=='artifact-value').flatMap(item=>statEntries(item)??[]);
    const renderedStats=values(root,'.stat-cell');
    assert.ok(matrixValues.every(entry=>renderedStats.some(x=>x.label===entry.label&&x.value===entry.value)),`${procedure.id}: 수치와 라벨`);
    const prose=items.filter(item=>!statEntries(item)&&item.tableId!=='artifact-value'&&item.title!=='정산 내역');
    assert.ok(prose.every(item=>root.textContent.includes(item.text)),`${procedure.id}: 설명 값`);
    assert.equal(root.querySelectorAll('.appraisal-table').length,items.filter(item=>item.title==='정산 내역').length,`${procedure.id}: 정산 내역`);
    assert.deepEqual([...root.querySelectorAll('.hack-choice b')].map(el=>Number(el.textContent)),run.hacking?.values??[]);
    assert.deepEqual(run,before);
  }
  const door=make('door',{},()=>.2),attempt=runLockAttempt(door,'outside',{rng:()=>.99}),root=dom(attempt);
  assert.equal(root.querySelector('[data-field="선택"] dd').textContent,'바깥쪽');
  assert.equal(root.querySelector('[data-field="접근 노드"] dd').textContent,'10');
});
