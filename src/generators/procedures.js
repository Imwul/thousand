import {tables,RULES_VERSION} from '../data/tables.js';
import {ODDS,PROCEDURES,SLOT_COUNTS,normalizeContext,normalizeOptions} from '../domain/model.js';
import {die,rollDice,lookup,random} from './dice.js';
import {runExtended} from './extended.js';
import {creatureLabel} from '../data/glossary.js';

function createRun(procedureId,context,options,campaignId,parentId) {
  return {id:crypto.randomUUID(),campaignId,procedureId,createdAt:new Date().toISOString(),parentId:parentId??null,
    title:PROCEDURES.find(p=>p.id===procedureId)?.name??'표 굴림',headline:'',subline:'',tone:'neutral',
    context:normalizeContext(context),options:normalizeOptions(options),items:[],trace:[],notes:[],
    memo:'',pinned:false,rulesVersion:RULES_VERSION};
}
function runner(run,rng) {
  return {
    raw(id,title,sides,page,detail='') {
      const value=die(sides,rng);
      run.trace.push({id,title,notation:`d${sides}`,values:[value],value,page});
      return value;
    },
    item(title,text,page,extra={}) {const v={title,text,page,...extra};run.items.push(v);return v;},
    table(id,group='결과') {
      const t=tables[id];if(!t)throw new Error('해당 표를 찾을 수 없습니다.');if(t.rollable===false)throw new Error(t.sourceNote||'원문의 범위를 먼저 확인하세요.');
      const rolled=rollDice(t.dice,rng),row=lookup(t,rolled.value);
      run.trace.push({id,title:t.title,page:t.page,...rolled});
      run.items.push({title:t.title,text:row.text,key:row.key,detail:row.detail??'',en:row.en??'',...(row.sourceText?{sourceText:row.sourceText}:{}),page:row.page??t.page,tableId:id,roll:rolled.value,dice:t.dice,values:rolled.values,group,...(row.image?{image:row.image}:{})});
      return {value:rolled.value,row};
    },
    check(id,title,percent,page,group='결과') {
      const value=this.raw(id,title,100,page),success=value<=percent;
      this.item(title,success?'발생':'발생하지 않음',page,{roll:value,dice:'d100',values:[value],detail:`${percent}% · ${percent} 이하`,group});
      return success;
    }
  };
}
function inspiration(r,group='해석 단서') {const a=r.table('action',group),t=r.table('theme',group);return `${a.row.text} / ${t.row.text}`;}
function surprise(r,o) {const s=r.table('surprise','돌발사건');if(o.details)inspiration(r);return s.row.text;}
function encounter(r,run,{forcedTier,forcedType,ignoreHazard=false,location}={}) {
  const c=run.context;
  const slot=r.raw('encounter-slot','기존 조우 슬롯',SLOT_COUNTS[c.size-1],143);
  const tier=forcedTier??r.table('encounter-difficulty','조우').value;
  const tierKey=typeof tier==='string'?tier:tier<=5?'easy':tier<=13?'standard':tier<=18?'elite':'overwhelming';
  let composition;
  if(c.crew===1&&tierKey==='easy') {composition='쉬움 1';r.item('조우 구성',composition,264,{group:'조우'});}
  else composition=r.table(`encounter-${c.crew}.${tierKey}`,'조우').row.text;
  r.item(`조우 슬롯 ${slot}`,forcedType?'지형이 지정한 유형 사용':c.slots[slot-1]||'처음 만나는 유형',143,{group:'조우',detail:`이번 탐사 출발 정원 ${c.crew}명 기준. 동일 조우의 모든 개체는 같은 유형이다.`});
  if(c.slots[slot-1]&&!forcedType) return `${c.slots[slot-1]} · ${composition}`;
  let type;
  if(forcedType){type=forcedType;r.item('생물 유형',creatureLabel(type),193,{key:type,group:'조우',detail:'현재 지형·생물군계가 지정한 유형.'});}
  else if(c.hazard===4&&!ignoreHazard) {type='Aberration';r.item('생물 유형',creatureLabel(type),140,{key:type,group:'조우',detail:'주된 위험이 「괴물에게 점령됨」이므로 모든 조우는 변이체(Aberration).'});}
  else type=r.table((location??c.location)==='planet'?'creature-planet':'creature-space','조우').row.key;
  const size=r.table('creature-size','조우').row.text;
  if(type==='Aberration')run.notes.push('Aberration과 조우하면 Stress +5. 상세 능력치·특성은 룰북 p.270–289를 참조하세요.');
  else run.notes.push('생물의 상세 능력치·특성·역할은 룰북 p.270–299에서 정하세요.');
  run.encounter={slot,label:`${creatureLabel(type)} · ${size}`};
  return `${creatureLabel(type)} · ${composition}`;
}
function dread(r,run) {const d=r.table('dread','공포');if(d.value===1)r.table('taint','공포');run.notes.push('지속 효과, 피해와 Stress는 종이 시트에 기록하세요. 조건이 충족된 경우에만 효과 주사위를 굴립니다.');return d.row.text;}
function security(r,run) {
  const s=r.table('security','보안');
  if(s.value===9)for(let i=0;i<run.context.presentCrew;i++) {r.table('teleport',`대원 ${i+1}의 이동`);}
  if(s.value===4)r.check('gravity-site','탐사지 전체의 중력 역전',20,165,'보안');
  return s.row.text;
}
function resources(r,run) {
  const crystals=r.raw('crystals','데이터 크리스털',10,148),alloys=r.raw('alloys','합금 큐브',6,148);
  r.item('데이터 크리스털',`${crystals}개`,148,{detail:'각 50 DC · Light',group:'발견',roll:crystals,dice:'d10'});
  r.item('합금 큐브',`${alloys}개`,148,{detail:'각 75 DC · 각각 1 Gear Slot',group:'발견',roll:alloys,dice:'d6'});
  run.notes.push('발견한 개수와 수용 한도는 종이 Site Report에 기록하세요.');
  return `크리스털 ${crystals}개 / 합금 큐브 ${alloys}개`;
}
function artifacts(r,run) {
  const n=r.raw('artifact-count','유물 발견 개수',4,150);r.item('발견 개수',`${n}개`,150,{roll:n,dice:'d4',group:'발견'});
  for(let i=0;i<n;i++)r.table('artifact',`유물 ${i+1}`);
  run.notes.push('유물의 정확한 가치는 귀환 후 KSA가 평가합니다. 지금은 가격을 굴리지 않습니다.');
  return `외계 문화 유물 ${n}개`;
}
function door(r,run) {
  const d=r.table('door','접근점');
  const pair=[r.raw('firewall-a','방화벽 첫 번째 수',10,156),r.raw('firewall-b','방화벽 두 번째 수',10,156)].sort((a,b)=>a-b);
  r.item('방화벽',`${pair[0]} ─ ${pair[1]}`,156,{detail:'이 두 수를 제외한 안쪽 또는 바깥쪽을 선택하세요. 경계와 같은 값이면 항상 실패합니다.',group:'접근점'});
  run.pending={type:'lock',lo:pair[0],hi:pair[1],secure:d.value===4};
  run.notes.push('잠금 해제 시도마다 시간트랙 +1. 문 너머는 문이 열린 뒤 확인합니다. 경보문·공포문 등 선행 조건은 종이 판정으로 해결하세요.');
  return d.row.text;
}
function occurrence(r,run) {
  const t=r.table('occurrence','무작위 상황');
  if(t.value===1) {const d=r.table('danger','위험');if(d.value===1)security(r,run);else if(d.value===2)encounter(r,run);}
  if(t.value===2)r.table('discovery','발견');
  if(t.value===3)r.table('random-event','사건');
  if(t.value===4) {
    r.table('situation-verb','상황 단서');
    const id=`noun-${run.context.purpose}`;
    if(tables[id])r.table(id,'상황 단서');
    else {inspiration(r);run.notes.push(run.context.purpose===3?'원문의 상황 명사표(p.173–175)에 생물 연구·격리 전용 목록이 없어 일반 행동·주제로 보충했습니다.':'시설의 원래 용도가 설정되지 않아 일반 행동·주제로 보충했습니다. 장소 맥락에서 용도를 지정할 수 있습니다.');}
  }
  return t.row.text;
}
function misjump(r,run) {
  const m=r.table('misjump','잘못된 도약');
  if(m.value>=3&&m.value<=4) {
    const unit=r.table('time-dilation','시간 차이').row.text;
    const amount=r.raw('time-difference','시간 차이 크기',10,123);
    const sign=r.raw('time-direction','시간 차이 방향',6,123);
    r.item('시간 차이',`${amount}${unit} · ${sign<=3?'선내에서만 시간이 흐름':'외부에서만 시간이 흐름'}`,123,{group:'시간 차이',detail:'방향은 원문의 무작위 선택을 D6의 1–3 / 4–6으로 나누었습니다.'});
  }
  if(m.value>=5) {
    const t=r.table('transit-dilation','항해 변동');
    if(t.value>=3) {const n=r.raw('transit-weeks','변동 주 수',4,123);r.item('기간 변동',`${n}주 ${t.value<=4?'단축':'연장'}`,123,{group:'항해 변동'});}
  }
  r.table('misjump-secondary','부차 효과');
}
function travel(r,run) {
  const o=run.options,c=run.context;
  const chance=Math.min(100,o.week*20),arrival=Math.min(100,40+(o.week-1)*10);
  const event=r.check('travel-check',`${o.week}주차 사건 확인`,chance,118,'항해');
  if(event) {
    const type=r.table('travel-type','항해 사건');
    const v=(type.value===1&&c.crew===1)?4:type.value;
    if(type.value===1&&c.crew===1)r.item('1인선 예외','사회적 사건을 정신·신체 문제로 처리',118,{group:'항해 사건'});
    const ids={1:'travel-social',2:'travel-malfunction',3:'travel-anomaly',4:'travel-issue'};
    const detail=r.table(ids[v],'항해 사건');
    if(v===1&&detail.value<=5){r.table('conversation','대화');r.table('reaction','첫 번째 대원의 반응');r.table('reaction','두 번째 대원의 반응');run.notes.push('항해 중 대화의 긍정 반응(+)은 PC Stress -1, 부정 반응(-)은 +1입니다.');}
    if(v===1&&detail.value===6&&o.details)inspiration(r);
    if((v===3&&detail.value===7)||(v===4&&detail.value===3))misjump(r,run);
  }
  let arrived;
  if(o.destination==='unknown')arrived=r.check('destination-check','목적지 확인',arrival,126,'도착 여부');
  else {arrived=o.week>=o.knownWeeks;r.item('알려진 항해 일정',arrived?'목적지에 도착':'항해 계속',118,{detail:`예정 ${o.knownWeeks}주 / 현재 ${o.week}주. 귀환은 최초 기간, 다른 팀의 장소는 최초 D6+1주로 정한 값을 사용하세요.`,group:'도착 여부'});}
  run.headline=arrived?'목적지 도착':'항해 계속';
  run.subline=`${o.week}주차 · ${event?'항해 사건 발생':'항해 사건 없음'}${o.destination==='unknown'?` · 도착 확률 ${arrival}%`:''}`;
  run.notes.push('이번 주 대원마다 Oxygen Tank 1개와 Supplies 1개를 종이 시트에서 소비하세요. 사건 확률은 사건 발생으로 초기화되지 않으며 목적지 도착 시 초기화됩니다.');
}
function fillSite(r,run,location){
  const purpose=r.table('purpose','시설의 정체');
  if(run.options.history)r.table('site-story','시설의 정체');
  const descriptor=r.table('site-descriptor','첫인상');
  if(location==='planet')r.table('planet-descriptor','첫인상');
  const protective=r.check('protection','추가 보호장비 필요',20,130,'탐사 조건');
  if(protective){const levelA=r.check('level-a','A등급 보호 필요',40,130,'탐사 조건');r.item('보호장비',levelA?'A등급 방호복 필요':'방호복 또는 진공복 필요',130,{group:'탐사 조건'});}
  const size=r.table('size','탐사 조건'),activity=r.table('activity','탐사 조건'),hazard=r.table('hazard','탐사 조건');
  const sides=[4,10,20,20][size.value-1],offset=[10,20,20,40][size.value-1];
  const resourcesTotal=r.raw('resource-slots','자원 탐사 한도',sides,143)+offset;
  const artifactsTotal=r.raw('artifact-slots','유물 탐사 한도',sides,143)+offset;
  r.item('Site Report 준비',`자원 ${resourcesTotal} / 유물 ${artifactsTotal} / 조우 유형 ${SLOT_COUNTS[size.value-1]}칸 / 매복 최대 ${activity.value}회`,143,{group:'종이에 기록',detail:`활동도에 따른 최대 매복 ${activity.value}회. 자원·유물 한도는 실제 아이템 개수가 아닙니다.`});
  run.subline=`${purpose.row.text} · ${size.row.text} · ${hazard.row.text} · ${descriptor.row.text}`;
  run.adopt={location,purpose:purpose.value,hazard:hazard.value,size:size.value,resources:true,artifacts:true,slots:Array(SLOT_COUNTS[size.value-1]).fill('')};
  run.notes.push('기본 대기는 산소가 부족하므로 호흡 장비가 필요합니다. 인공 중력은 별도 결과가 없으면 1.5g. 맥락에 채택하면 이 장소용 조우 슬롯을 새로 준비합니다.');
}
function site(r,run) {
  let arrival;
  for(let i=0;i<1000;i++){
    arrival=r.table('arrival','도착');
    if(!run.options.known||arrival.value>=16)break;
    run.items.pop();run.trace.at(-1).discarded=true;
    if(i===999)throw new Error('알려진 목적지의 도착 굴림을 완료하지 못했습니다.');
  }
  run.headline=arrival.row.text;
  if(arrival.value<16) {run.tone='danger';run.subline='이 좌표에서는 탐사지 상세를 생성하지 않습니다.';return;}
  fillSite(r,run,arrival.value>=36&&arrival.value<=60?'planet':'space');
}
export function runFoundSite(previous,{campaignId=previous?.campaignId,rng=random}={}){
  if(!previous?.id)throw new Error('먼저 헥스에서 Àrsaidh 탐사지를 찾으세요.');
  const run=createRun('site-from-hex',previous.context,previous.options,campaignId,previous.id),r=runner(run,rng);
  run.siteFromHex=true;run.title='발견한 Àrsaidh 시설';run.headline='Àrsaidh 시설';
  fillSite(r,run,'planet');
  run.notes.unshift('도착표는 굴리지 않았습니다. 이 시설은 이미 행성 헥스에서 찾았습니다.');
  return run;
}
function area(r,run) {
  const o=run.options,c=run.context;
  if(o.connector) {
    const connector=r.table('connector','이동');
    if(connector.value<=10||(connector.value>=13&&connector.value<=16)){
      if(r.check('hallway-ambush','복도 매복',20,144,'이동')){
        const e=encounter(r,run);run.headline='새 구역에 닿기 전, 매복';run.subline=e;run.tone='danger';
        run.notes.push('먼저 매복을 해결하세요. 이후 「연결부도 굴리기」를 끄고 새 구역을 탐사하면 됩니다. 아직 구역 내용은 생성하지 않았습니다.');return;
      }
    }
  }
  let event;
  for(let i=0;i<1000;i++) {
    event=r.table('exploration','구역');
    if(!((event.value===3&&!c.resources)||(event.value===4&&!c.artifacts)))break;
    run.items.pop();run.trace.at(-1).discarded=true;
    if(i===999)throw new Error('고갈된 자원·유물을 제외한 탐사 결과를 얻지 못했습니다.');
  }
  run.headline=event.row.text;
  if(event.value<=2){run.subline=encounter(r,run);run.tone='danger';}
  else if(event.value===3)run.subline=resources(r,run);
  else if(event.value===4)run.subline=artifacts(r,run);
  else if(event.value===5) {
    if(c.hazard)r.item('현재 장소의 위험',tables.hazard.rows[c.hazard-1].text,139,{group:'위험'});
    else run.notes.push('현재 장소의 주된 위험을 지정하면 아래 발현을 그 위험에 맞춰 해석할 수 있습니다.');
    run.subline=r.table('manifestation','위험').row.text;
  }
  else if(event.value===6)run.subline=door(r,run);
  else if(event.value===7)run.subline=dread(r,run);
  else if(event.value===8)run.subline=security(r,run);
  else if(event.value===9)run.subline=r.table('fixed-event','사건').row.text;
  else if(event.value===10)run.subline=occurrence(r,run);
  run.notes.push('새 구역 진입은 시간트랙 +1. 앱은 수기 시간트랙을 자동 변경하지 않습니다.');
}
export function runProcedure(procedureId,{context={},options={},campaignId,parentId,rng=random,tableId}={}) {
  const run=createRun(procedureId,context,options,campaignId,parentId),r=runner(run,rng),o=run.options;
  if(procedureId==='question') {
    const odds=ODDS.find(v=>v.id===o.odds),v=r.raw('prediction','예/아니오 판정',20,229);
    const yes=v===20||(v!==1&&v>=odds.threshold),exceptional=v===1||v===20;
    run.headline=exceptional?(yes?'극단적인 예':'극단적인 아니오'):(yes?'예':'아니오');
    run.tone=yes?'positive':'negative';run.subline=o.question||'말로 떠올린 질문에 대한 답입니다.';
    r.item('예측 서브루틴',run.headline,229,{group:'답',roll:v,dice:'d20',detail:`${odds.label} · ${odds.threshold} 이상 · 원문 기준 ${Math.round((21-odds.threshold)/20*100)}%`});
    if(o.qualifier){const q=r.table('qualifier','답');if(q.value===1||q.value===6){run.headline+=q.value===1?', 하지만…':', 그리고…';if(o.complication){r.table('complication','복잡성');if(o.details)inspiration(r);}}}
  }
  else if(procedureId==='scene') {
    const n=r.raw('twist','반전 확인',6,227),twist=n<=run.context.twist;
    run.headline=twist?'예상 밖의 사건으로 시작합니다':'예상대로 장면이 시작됩니다';run.tone=twist?'danger':'neutral';
    r.item('장면 반전',twist?'반전 발생':'반전 없음',227,{roll:n,dice:'d6',detail:`1–${run.context.twist}에서 반전 · ${run.context.twist}/6`,group:'장면'});
    if(twist)run.subline=surprise(r,o);else run.subline='떠올린 장소와 인물로 장면을 이어가세요.';
    run.notes.push('장면이 끝날 때 통제하지 못했다면 반전 확률 +1(최대 3/6). 시간트랙이 초기화되면 직접 1/6로 되돌리세요.');
  }
  else if(procedureId==='surprise'){run.headline=surprise(r,o);run.subline='현재 장소·인물·미해결 단서에 연결해 해석하세요.';}
  else if(procedureId==='inspiration'){run.headline=inspiration(r,'두 단어');run.subline='행동 D100 · 주제 D100';}
  else if(procedureId==='arrival')site(r,run);
  else if(procedureId==='area')area(r,run);
  else if(procedureId==='npc') {
    const a=r.table('attitude','첫 만남');
    const id=a.value<=2?'npc-hostile':a.value<=4?'npc-neutral':'npc-friendly';
    const b=r.table(id,'첫 만남');r.table('motivation','의욕');
    run.headline=b.row.text;run.subline=`첫 태도: ${a.row.text}`;if(o.details)inspiration(r);
    run.notes.push('상황의 사회적 맥락에 맞지 않는 행동은 직접 조정하세요. 이 결과는 NPC의 첫 반응이며 전체 캐릭터 시트 생성은 아닙니다.');
  }
  else if(procedureId==='travel')travel(r,run);
  else if(procedureId==='door'){run.headline=door(r,run);run.subline='안쪽 또는 바깥쪽을 선택해 잠금 해제를 시도하세요.';}
  else if(procedureId==='resolution'){const v=r.table('resolution');run.headline=v.row.text;run.subline='능력치·기술 판정을 대신할 필요가 있을 때만 사용하세요.';}
  else if(procedureId==='table'){const t=r.table(tableId);run.title=tables[tableId].title;run.headline=t.row.text;run.tableId=tableId;}
  else if(runExtended(procedureId,r,run,{encounter,inspiration,site,resources,artifacts,door,security})){}
  else throw new Error('알 수 없는 굴림 묶음입니다.');
  if(run.headline.length>160)run.headline=run.headline.slice(0,110).trimEnd()+'…';
  return run;
}
export function runLockAttempt(previous,guess,{campaignId=previous.campaignId,rng=random}={}) {
  if(previous.pending?.type!=='lock'||!['inside','outside'].includes(guess))throw new Error('먼저 방화벽을 생성하고 안/밖을 선택하세요.');
  const run=createRun('door',previous.context,previous.options,campaignId,previous.id),r=runner(run,rng),p=previous.pending;
  run.title='잠금 해제 시도';
  run.lockAttempt={guess,pending:structuredClone(p)};
  const values=Array.from({length:p.secure?2:1},()=>r.raw('access-node','접근 노드',10,156));
  const won=v=>v!==p.lo&&v!==p.hi&&(guess==='inside'?(v>p.lo&&v<p.hi):(v<p.lo||v>p.hi));
  const success=values.every(won);
  run.headline=success?'접근점이 열립니다':'접근점은 여전히 잠겨 있습니다';run.tone=success?'positive':'negative';
  run.subline=`방화벽 ${p.lo}–${p.hi} · ${guess==='inside'?'안쪽':'바깥쪽'} 선택 · 접근 노드 ${values.join(', ')}`;
  r.item('잠금 판정',success?'성공':'실패',156,{detail:p.secure?'보안문: D10 두 개 중 불리한 결과를 적용.':'경계와 같은 결과는 항상 실패합니다.',group:'접근점'});
  run.notes.push('이번 시도는 시간트랙 +1. 문 유형의 효과와 선행 판정은 종이 시트에서 적용하세요.');
  if(!success)run.pending=structuredClone(p);
  else if(r.check('door-extra','문 너머의 특별한 무언가',10,158,'문 너머')) {
    let b;for(let i=0;i<1000;i++){
      b=r.table('behind-door','문 너머');
      if(!(run.context.location==='planet'&&b.value===1))break;
      run.items.pop();run.trace.at(-1).discarded=true;
      if(i===999)throw new Error('지상에서 진공 결과를 제외하지 못했습니다.');
    }
    if(b.value===4)resources(r,run);
  }
  return run;
}
export function runHackReroll(previous,index,{rng=random}={}){
  if(!previous.hacking||!Number.isInteger(index)||index<0||index>=previous.hacking.values.length)throw new Error('재굴림할 해킹 주사위를 선택하세요.');
  const run=createRun('hacking',previous.context,previous.options,previous.campaignId,previous.id),r=runner(run,rng),values=[...previous.hacking.values];
  values[index]=r.raw('hacking-reroll',`${index+1}번째 해킹 주사위 재굴림`,6,102);run.hacking={values};
  run.headline=values.includes(1)?'시스템이 잠깁니다':'해킹에 성공합니다';run.subline=values.join(' / ');run.notes.push('다른 주사위는 이전 값을 유지했습니다. 이번 재굴림에 사용한 Talent 판정·Cypher를 수기 시트에 기록하세요.');return run;
}
