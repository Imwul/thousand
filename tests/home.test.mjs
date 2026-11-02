import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {homeView,homeCatalog} from '../src/components/home.js';
import {PROCEDURES} from '../src/domain/model.js';

function render(t,options){
  const window=new Window();
  t.after(()=>window.happyDOM.abort());
  window.document.body.innerHTML=homeView(options);
  return window.document;
}

test('home exposes major shortcuts and every existing procedure without rolling',t=>{
  const document=render(t);
  assert.equal(document.querySelector('#home-title').textContent,'오라클 바로가기');
  assert.equal(document.querySelector('#home-title').getAttribute('tabindex'),'-1');
  assert.deepEqual([...document.querySelectorAll('.home-quick')].map(button=>button.dataset.id),['question','area','hex','behavior','stress','dice']);
  const listed=[...document.querySelectorAll('.home-groups .home-procedure')].map(button=>button.dataset.id);
  assert.equal(listed.length,36);
  assert.deepEqual(new Set(listed),new Set(PROCEDURES.map(procedure=>procedure.id)));
  assert.equal(document.querySelectorAll('.home-group').length,7);
  assert.equal(document.querySelectorAll('.home-group-wide').length,1);
  assert.equal(document.querySelector('.home-group:last-child h4').textContent,'정거장');
  assert.ok(document.querySelector('.home-group:last-child').classList.contains('home-group-wide'));
  assert.equal(document.querySelector('.home-recent'),null);
  assert.match(document.querySelector('.home-resume').textContent,/작업대 이어가기.*질문하기.*굴림 옵션 열기/);
  for(const button of document.querySelectorAll('button')){
    assert.equal(button.type,'button');
    assert.ok(['home-procedure','workbench','home-library','home-clear'].includes(button.dataset.action),button.outerHTML);
  }
  assert.ok(document.querySelector('[data-action="home-library"]'));
  for(const link of document.querySelectorAll('.home-index a'))assert.ok(document.querySelector(link.getAttribute('href')));
});

test('home recent shortcuts exclude duplicates and major shortcuts while preserving order',t=>{
  const document=render(t,{procedureId:'hex',recent:['behavior','missing-oracle','area','travel','travel','stress','dice','planet','hacking','npc','emotion','conversation']});
  assert.deepEqual([...document.querySelectorAll('.home-recent button')].map(button=>button.dataset.id),['travel','planet','hacking','npc','emotion']);
  assert.match(document.querySelector('.home-resume').textContent,/행성 헥스 탐사.*굴림 옵션 열기/);
});

test('home resume preserves record text as escaped content',t=>{
  const title='<img src=x onerror="alert(1)">';
  const headline='독침 <script>alert("test")</script> & 상처 1';
  const document=render(t,{procedureId:'creature',record:{title,headline}});
  const resume=document.querySelector('.home-resume');
  assert.equal(resume.dataset.action,'workbench');
  assert.equal(resume.querySelector('strong').textContent,title);
  assert.equal(resume.querySelector('small').textContent,'저장된 결과 보기');
  assert.ok(!resume.textContent.includes(headline));
  assert.equal(document.querySelector('img,script,[onerror]'),null);
});

test('home search finds Korean situations, English names and helper dice without changing the catalog',t=>{
  const document=render(t);
  const matches=query=>{
    const result=homeCatalog(query);
    document.querySelector('#home-catalog').innerHTML=result.html;
    const ids=[...document.querySelectorAll('#home-catalog .home-procedure')].map(button=>button.dataset.id);
    assert.equal(ids.length,result.count);
    return ids;
  };
  assert.deepEqual(matches('시간 트랙'),['time-step','activity']);
  assert.deepEqual(matches('  hAcKing  '),['hacking']);
  assert.deepEqual(matches('예·아니오'.normalize('NFD')),['question']);
  assert.deepEqual(matches('탄약'),['dice']);
  assert.deepEqual([...document.querySelectorAll('.home-helper')].map(button=>button.dataset.id),['burst','turret-ammo']);
  assert.deepEqual(matches('재건 수술'),['dice']);
  assert.deepEqual(matches('전투 준비'),['combat-start']);
  assert.deepEqual(matches('존재하지않는오라클'),[]);
  assert.match(document.querySelector('.home-empty').textContent,/개별 표/);
  assert.equal(matches('').length,36);
  assert.equal(document.querySelector('.home-helpers'),null);
});

test('home search safely preserves its query without repeating it in the empty result',t=>{
  const query='\"><img src=x onerror=alert(1)>';
  const document=render(t,{query});
  assert.equal(document.querySelector('#home-search').value,query);
  assert.equal(document.querySelector('.home-empty').textContent.includes(query),false);
  assert.equal(document.querySelector('img,[onerror]'),null);
  assert.equal(document.querySelector('.home-index').hidden,true);
  assert.equal(document.querySelector('[data-action="home-clear"]').hidden,false);
  assert.equal(document.querySelector('#home-search-status').textContent,'0개 상황이 검색되었습니다.');
});
