import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {homeView} from '../src/components/home.js';
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
  assert.equal(document.querySelector('.home-group:last-child h3').textContent,'정거장');
  assert.ok(document.querySelector('.home-group:last-child').classList.contains('home-group-wide'));
  assert.equal(document.querySelector('.home-recent'),null);
  assert.match(document.querySelector('.home-resume').textContent,/작업대 이어가기.*질문하기.*굴림 옵션 열기/);
  for(const button of document.querySelectorAll('button')){
    assert.equal(button.type,'button');
    assert.ok(['home-procedure','workbench','library'].includes(button.dataset.action),button.outerHTML);
  }
  assert.ok(document.querySelector('[data-action="library"]'));
});

test('home recent shortcuts only contain unique, valid procedures in their original order',t=>{
  const document=render(t,{procedureId:'hex',recent:['behavior','missing-oracle','area','behavior','stress','dice','travel','hex']});
  assert.deepEqual([...document.querySelectorAll('.home-recent button')].map(button=>button.dataset.id),['behavior','area','stress','dice','travel']);
  assert.match(document.querySelector('.home-resume').textContent,/행성 헥스 탐사.*굴림 옵션 열기/);
});

test('home resume preserves record text as escaped content',t=>{
  const title='<img src=x onerror="alert(1)">';
  const headline='독침 <script>alert("test")</script> & 상처 1';
  const document=render(t,{procedureId:'creature',record:{title,headline}});
  const resume=document.querySelector('.home-resume');
  assert.equal(resume.dataset.action,'workbench');
  assert.equal(resume.querySelector('strong').textContent,title);
  assert.equal(resume.querySelector('small').textContent,headline);
  assert.equal(document.querySelector('img,script,[onerror]'),null);
});
