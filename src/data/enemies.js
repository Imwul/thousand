import {creatureLabel} from './glossary.js';

// Core Rulebook pp.300–313. A dash in a stat block stays a dash.
export const KNOWN_THREATS = {
  spitter:{name:'Spitter',page:302,attributes:[12,12,10,10,8,0],combat:[3,null,null,4],size:'인간 정도',movement:3,attack:8,range:'10헥스',target:'전투 시작에 무작위로 한 명을 정해 죽을 때까지 공격한다. 대상이 죽으면 다음 표적으로 넘어간다.',recovery:['방어 +2','공격 +5','방어 −2'],effect:'항상 적과 최소 3헥스 거리를 유지하려 한다.'},
  clobber:{name:'Clobber',page:304,attributes:[18,10,16,12,4,0],combat:[3,null,6,null],size:'인간보다 큼',movement:2,attack:8,range:'근접',target:'처음에는 무작위 대상을 고른다. 이후 직전 라운드에 가장 큰 피해를 준 대원을 노린다.',recovery:['공격 +2','공격 +5','공격 −2'],effect:'장갑 6은 머리에는 적용되지 않는다.'},
  taker:{name:'Taker',page:306,attributes:[14,14,12,12,12,0],combat:[3,null,null,2],size:'인간 정도',movement:3,attack:5,range:'근접',target:'전투 시작에 무작위 대원을 골라 전투 격자 밖으로 끌고 나가려 한다. 격자를 벗어나면 둘 다 영영 사라진다.',recovery:['방어 +2','공격 +4','방어 −2'],effect:'붙잡기·점액의 피해와 탈출 조건은 해당 행동 결과를 적용한다.'},
  psybane:{name:'Psybane',page:308,attributes:[8,8,12,18,18,0],combat:[3,null,2,null],size:'인간 정도',movement:1,attack:5,range:'12헥스',target:'매 라운드 시작에 무작위로 대상을 새로 고른다.',recovery:['방어 +2','공격 +4','공격 −2'],effect:'인접한 모든 대원은 라운드마다 스트레스(Stress) +2.'},
  bomber:{name:'Bomber',page:310,attributes:[13,16,13,12,10,0],combat:[3,null,null,4],size:'인간보다 조금 작음',movement:3,attack:8,range:'10헥스',target:'가장 많은 대원을 맞힐 수 있는 곳을 노린다. 한 명만 맞힐 수 있으면 무작위로 고른다.',recovery:['방어 +2','공격 +5','방어 −2'],effect:'항상 적과 최소 3헥스 거리를 유지하려 한다.'},
  cecaelia:{name:'Cecaelia',page:312,attributes:[18,14,12,10,6,0],combat:[3,null,null,5],size:'인간 정도',movement:2,attack:5,range:'근접',target:'전투 시작에 무작위로 한 명을 골라 집중 공격한다.',recovery:['방어 +2','공격 +4','방어 −5'],effect:'붙잡기·조이기·삼키기의 피해와 탈출 조건은 해당 행동 결과를 적용한다.'}
};

export const ROLE_RULES = {
  Brute:{page:275,text:'근접 공격만 사용한다. 턴마다 두 번 이동할 수 있다. 명중 부위 굴림 +1. 능력치·피해·공격·경계의 고정 보정은 생성 수치에 반영되어 있다.'},
  Lurker:{page:276,text:'전투에서 이탈할 때 기회공격을 받지 않는다. 근접전을 선호한다. 자신을 직접 표적으로 삼지 않은 적에 대한 공격 +5는 조건이 맞을 때만 더한다.'},
  Ranged:{page:277,text:'원거리 공격을 선호한다. 명중 부위 굴림 +1. 원거리 공격 +2·근접 공격 −2는 공격 수치 옆에 표시한 조건부 보정을 적용한다.'},
  Swarm:{page:278,text:'근접 공격만 사용하며 턴마다 두 번 이동할 수 있다. 크기 굴림 19–20이면 모든 대원을 동시에 공격한다. 군집을 공격할 때는 명중 부위를 굴리지 않고 피해 보정을 +1로 한다. 공격 +5·피해 −D10은 생성 수치에 반영되어 있다.'},
  Psychic:{page:279,text:'원거리 공격과 초능력을 선호한다. 특수 능력은 초능력 표를 사용한다. 혼자라면 거리를 벌리고, 무리라면 함께 움직이며 지원한다. CON·WIL·피해의 고정 보정은 생성 수치에 반영되어 있다.'}
};

export function knownThreatItems(key){
  const g=KNOWN_THREATS[key];if(!g)throw new Error('추적 위협을 찾을 수 없습니다.');
  const item=(title,text)=>({title,text,page:g.page,group:'추적 위협 고정 능력치'});
  return [
    item('추적 위협',`${creatureLabel(g.name)} · 정예 · 변이체(Aberration)`),
    item('기본 능력치',['STR','DEX','CON','WIL','INT','CHA'].map((n,i)=>`${n} ${g.attributes[i]}`).join(' / ')),
    item('전투 수치',['상처','경계','장갑','방어'].map((n,i)=>`${n} ${g.combat[i]??'—'}`).join(' / ')),
    item('크기',g.size),
    item('이동·공격',`이동 ${g.movement}헥스 / 공격 +${g.attack} / 사거리 ${g.range} / 피해는 행동 결과 참조`),
    item('표적 우선순위',g.target),
    item('회복 상태',`피투성이(Bloodied): ${g.recovery[0]} / 궁지에 몰림(Cornered): ${g.recovery[1]} / 압도됨(Overwhelmed): ${g.recovery[2]}`),
    item('고유 효과',g.effect),
    {title:'매복·사기',text:'항상 매복하며 주도권(Initiative) +2. 경계 수치가 없으며 죽을 때까지 싸운다. 변이체 조우로 스트레스 +5.',page:[138,268,300],group:'추적 위협 고정 능력치'},
    {title:'처치 보상',text:'처치가 확인된 추적 위협마다 표창(Commendation) 1개를 받는다. 표창은 Karum Station에서 Vimanic 기술 장비로 교환할 수 있다.',page:[300,404],group:'추적 위협 고정 능력치'}
  ];
}
