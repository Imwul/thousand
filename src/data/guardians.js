import {creatureLabel} from './glossary.js';

// Transcribed and visually checked against the supplied PDF, pp.293/295/297/299.
// Attribute order: STR, DEX, CON, WIL, INT, CHA. Combat: Wounds, Awareness, Armor, Defense.
const charge='충전(Charge): 공격을 받을 때마다 다음 공격의 피해가 +1 누적된다. 피해를 준 뒤 누적치를 초기화한다.';
const immune='모든 상태 이상에 면역이다.';
const aim='조준(Aim): 자신의 턴을 건너뛰고 다음 공격 기술에 +10을 더한다.';
const explosive='폭발탄(Explosive): D20 피해를 주는 폭발탄을 발사한다.';
const row=(attributes,combat,attack,damage,abilities=[])=>({attributes,combat,attack,damage,abilities});
export const GUARDIANS={
  titan:{name:'Titan',role:'Brute',page:293,description:'몸체를 변형해 좁은 공간에서도 상대를 추격하는 다목적 수호자.',tiers:{
    easy:row([10,2,8,6,4,0],[1,5,null,null],'+0','D12+5'),
    standard:row([12,10,10,10,8,0],[1,10,2,null],'+4','D12+5',[charge]),
    elite:row([14,13,13,12,8,0],[2,15,5,null],'+6','2D10+5',[charge,immune]),
    overwhelming:row([16,14,15,14,8,0],[3,20,5,5],'+10','4D10',[charge,immune,'라운드마다 2회 공격을 개시할 수 있다.'])
  }},
  anansi:{name:'Anansi',role:'Lurker',page:295,description:'다리가 열 개 달린 거미형 수호자. 대원들이 다른 위협과 맞설 때를 노려 기습한다.',tiers:{
    easy:row([4,8,8,6,6,0],[1,5,null,null],'+3 / +8*','D8+5'),
    standard:row([10,12,9,10,10,0],[1,10,null,2],'+5 / +10*','D8+5',['독침(Venom): 독침을 발사해 중독 IV(Poisoned IV) 상태를 적용한다.']),
    elite:row([10,16,10,12,10,0],[2,15,null,5],'+8 / +13*','2D8+5',['독침(Venom): 독침을 발사해 중독 III(Poisoned III) 상태를 적용한다.',immune]),
    overwhelming:row([14,16,14,14,12,0],[2,20,null,5],'+10 / +15*','2D10',['독침(Venom): 독침을 발사해 중독 I(Poisoned I) 상태를 적용한다.',immune,'라운드마다 3회 공격을 개시할 수 있다.'])
  }},
  arash:{name:'Arash',role:'Ranged',page:297,description:'원거리 사격을 선호하는 수호자. KSA는 근접전으로 몰아붙일 것을 권한다.',tiers:{
    easy:row([6,8,8,6,5,0],[1,5,null,null],'+3','D8+5'),
    standard:row([11,11,10,10,8,0],[1,10,1,1],'+5','D8+5',[aim]),
    elite:row([12,15,12,12,8,0],[2,15,2,2],'+8','2D12',[aim,explosive]),
    overwhelming:row([12,14,15,14,12,0],[2,20,5,5],'+10','3D10',[aim,explosive,'라운드마다 2회 공격을 개시할 수 있다.'])
  }},
  brahmari:{name:'Brahmari',role:'Swarm',page:299,description:'작고 검은 벌 같은 기계들이 한 몸처럼 움직이는 군집형 수호자.',tiers:{
    easy:row([6,8,4,4,3,0],[1,5,null,null],'+3','D12',['라운드마다 2회 공격을 개시할 수 있다.']),
    standard:row([11,11,10,10,8,0],[1,10,null,1],'+5','D8+5',['방사선(Radiation): 이 군집 근처에서 보내는 라운드마다 D20 rads에 노출된다.','라운드마다 2회 공격을 개시할 수 있다.']),
    elite:row([12,15,12,12,8,0],[1,15,null,8],'+8','2D12',['방사선(Radiation): 이 군집 근처에서 보내는 라운드마다 2D20 rads에 노출된다.','라운드마다 2회 공격을 개시할 수 있다.']),
    overwhelming:row([12,14,15,14,12,0],[2,20,null,5],'+10','D10+10',['방사선(Radiation): 이 군집 근처에서 보내는 라운드마다 3D20 rads에 노출된다.','라운드마다 2회 공격을 개시할 수 있다.'])
  }}
};
const tierNames={easy:'쉬움',standard:'보통',elite:'정예',overwhelming:'압도적'};
export function guardianItems(model='titan',tier='standard'){
  const g=GUARDIANS[model],s=g.tiers[tier],group='수호자 고정 능력치',page=g.page;
  const item=(title,text,extra={})=>({title,text,page,group,...extra});
  return [
    item('수호자 모델',`${creatureLabel(g.name)} · ${tierNames[tier]}`,{detail:g.description}),
    item('기본 능력치',['STR','DEX','CON','WIL','INT','CHA'].map((name,i)=>`${name} ${s.attributes[i]}`).join(' / ')),
    item('전투 수치',['상처','경계','장갑','방어'].map((name,i)=>`${name} ${s.combat[i]??'—'}`).join(' / ')),
    item('공격과 피해',`공격 ${s.attack} / 피해 ${s.damage}`,{detail:model==='anansi'?'* 자신을 직접 공격 대상으로 삼지 않은 상대에게는 높은 공격 수치를 사용한다.':''}),
    ...s.abilities.map(text=>item('특수 능력',text))
  ];
}
