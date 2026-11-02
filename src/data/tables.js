import {sourceTables} from './source-tables.js';
import {compoundTables} from './compound-tables.js';
import {completeTables} from './completions.js';
import {applyKorean} from './localization.js';
// Korean summaries and original-language tables from the user's 2024 rulebook.
export const RULES_VERSION = 'atdw-core-2024-logbook-ko-4';
export const tables = {};
function define(id, title, english, dice, page, rows) {
  tables[id] = { id, title, english, dice, page, rows: rows.map((r, i) => ({ id: `${id}.${i + 1}`, ...r })) };
}
function list(id, title, english, sides, page, values, originals = '') {
  const strings = typeof values === 'string' ? values.split('|') : values;
  const ens = originals ? originals.split('|') : [];
  if (strings.length !== sides) throw new Error(`${id}: ${strings.length} rows, expected ${sides}`);
  define(id, title, english, `d${sides}`, page, strings.map((v, i) => ({ min: i + 1, max: i + 1, ...(typeof v === 'string' ? { text: v } : v), en: ens[i] ?? '' })));
}
function ranges(id, title, english, dice, page, entries) {
  define(id, title, english, dice, page, entries.map(([min, max, text, detail = '']) => ({ min, max, text, detail })));
}

list('action', '행동', 'Action', 100, 256,
  '적대하다|침해하다|습격하다|붙이다|돕다|돌보다|거짓말하다|발전시키다|돌아오다|문의하다|찬탈하다|부여하다|반대하다|싸우다|늘리다|낭비하다|알리다|줄이다|미루다|제안하다|억압하다|탐험하다|확보하다|버리다|묻다|드러내다|방어하다|집중하다|붙잡다|돌파하다|복구하다|변형하다|거역하다|막다|방치하다|학대하다|열다|운반하다|끌어들이다|처벌하다|안내하다|강화하다|모으다|내주지 않다|부수다|지배하다|회피하다|조사하다|감명을 주다|주의를 돌리다|사냥하다|지지하다|움직이다|전달하다|거부하다|피하다|시작하다|발견하다|배신하다|항복하다|나누다|위험을 감수하다|포획하다|도전하다|풀어주다|호위하다|유혹하다|지키다|살피다|깨뜨리다|위치를 찾다|섬기다|통제하다|끝내다|견디다|경고하다|취하다|철수하다|논쟁하다|야기하다|여행하다|맹세하다|건설하다|빗나가게 하다|수색하다|배우다|보존하다|빠져나가다|파괴하다|창조하다|달성하다|소통하다|해치다|만족시키다|경계하다|흉내 내다|용인하다|신뢰하다|속이다|도와주다',
  'Antagonize|Violate|Assault|Attach|Assist|Care|Lie|Develop|Return|Inquire|Usurp|Bestow|Oppose|Fight|Increase|Waste|Inform|Decrease|Postpone|Propose|Suppress|Explore|Secure|Abandon|Ask|Reveal|Defend|Focus|Hold|Breach|Restore|Transform|Defy|Block|Neglect|Abuse|Open|Carry|Attract|Punish|Guide|Fortify|Gather|Withhold|Break|Dominate|Evade|Investigate|Impress|Distract|Hunt|Uphold|Move|Deliver|Reject|Avoid|Begin|Uncover|Betray|Surrender|Share|Risk|Capture|Challenge|Release|Escort|Seduce|Guard|Inspect|Break|Locate|Serve|Control|Finish|Endure|Alert|Take|Withdraw|Debate|Cause|Travel|Swear|Build|Deflect|Search|Learn|Preserve|Evade|Destroy|Create|Attain|Communicate|Harm|Gratify|Guard|Imitate|Tolerate|Trust|Deceive|Help');
list('theme', '주제', 'Theme', 100, 257,
  '분쟁|죽음|에너지|외부|친구|적|감정|계획|소유물|조언|소문|지식|권력|싸움|메시지|환경|반대|신뢰|동물|재물|승리|우정|바람|자유|상처|시련|위험|무기|분노|평화|정보|장소|역사|땅|대가|비밀|순수함|공동체|세력|피|거래|이점|건강|생각|의무|시간|희망|유대|두려움|자원|장비|행동|믿음|동맹|의견|빚|안전|경외|불운|행운|능력|전투|도구|자연|문제|상실|피난처|인도|기회|방향|기만|기억|부담|재난|꿈|생명|길|질병|생물|보상|탐사|고통|명성|마법|여행|관심|이익|감옥|음모|생존|역경|수수께끼|부|지도자|요원|장애물|정신 건강|기대|욕망|사업',
  'Dispute|Death|Energy|Outside|Friend|Enemy|Emotions|Plans|Possessions|Advice|Rumor|Knowledge|Power|Fight|Message|Environment|Opposition|Trust|Animal|Riches|Victory|Friendship|Wishes|Liberty|Wound|Trial|Danger|Weapon|Anger|Peace|Information|Location|History|Land|Price|Secret|Innocence|Community|Faction|Blood|Trade|Advantage|Health|Idea|Duty|Time|Hope|Bond|Fear|Resource|Gear|Action|Belief|Ally|Opinion|Debt|Safety|Reverence|Misfortune|Fortune|Ability|Battle|Tool|Nature|Problem|Loss|Shelter|Guidance|Opportunity|Direction|Deception|Memory|Burden|Disaster|Dream|Life|Path|Disease|Creature|Prize|Expedition|Pain|Fame|Magic|Travel|Attention|Benefit|Prison|Conspiracy|Survival|Adversity|Mystery|Wealth|Leader|Agent|Obstacle|Sanity|Expectations|Desire|Enterprise');
ranges('qualifier', '보충어', 'Qualifier', 'd6', 229, [[1,1,'하지만…'],[2,5,'보충어 없음'],[6,6,'그리고…']]);
list('complication','복잡성','Complication',6,229,[
  {text:'예상치 못한 사건',detail:'아주 좋은 순간 또는 나쁜 순간에 다른 사건이 끼어든다.'},
  {text:'겉모습과 다른 진실',detail:'사실이라고 생각했던 일의 이면이 드러난다.'},
  {text:'인물의 등장 또는 정체 공개',detail:'새 인물이 나타나거나 이미 알던 인물의 본성이 밝혀진다.'},
  {text:'물리적 환경의 변화',detail:'날씨, 지형, 구조물 또는 보안 체계가 변한다.'},
  {text:'유용한 물건의 득실',detail:'열쇠나 장비, 정보 같은 유용한 대상을 얻거나 잃는다.'},
  {text:'사회적 관계의 변화',detail:'관계·소속·평판을 새로 이해하게 되는 일이 생긴다.'}
]);
export const surpriseRows = [
  ['조우','적대적 조우','중립적 조우','중립적 조우','우호적 조우'],
  ['신체','육체적 분투','질병 또는 저주','함정','노동'],
  ['환경','자연 현상','날씨','부자연스러운 현상','결핍'],
  ['지식','금지된 지식','숨겨진 지식','연구','역사'],
  ['플레이어 캐릭터','장비','관계','건강','감정'],
  ['NPC','행동의 변화','오해','실종','도움 요청'],
  ['장소','습격','모임','감춰진 장소','파괴된 장소'],
  ['세력·승무원','내부 갈등','외부의 공격','투쟁','실종']
];
define('surprise','돌발사건','Surprise / Unknown Events','d8×d8',232,surpriseRows.flatMap((r,i)=>r.slice(1).map((text,j)=>({min:(i+1)*10+j*2+1,max:(i+1)*10+j*2+2,text:`${r[0]} · ${text}`}))));
ranges('resolution','임의 행동 결과','Random Action Resolution','d20',258,[[1,1,'치명적 실패'],[2,4,'완전한 실패'],[5,7,'실패'],[8,10,'아슬아슬한 실패'],[11,13,'최소한의 성공'],[14,16,'성공'],[17,19,'대성공'],[20,20,'결정적 성공']]);
ranges('arrival','목적지 도착','Arrival','d100',125,[
  [1,2,'적색거성 내부로 진입','우주선과 승무원이 파괴된다. 탐사지 상세를 생성하지 않는다.'],
  [3,15,'남겨진 잔해와 먼지','현재 좌표에는 탐사할 장소가 남아 있지 않다.'],
  [16,35,'거대한 표류선','탐사선이 자동으로 도킹한다.'],[36,60,'행성 표면','탐사선이 행성에 착륙한다.'],[61,80,'궤도 정거장 또는 전초기지','행성이나 위성 주위를 도는 시설에 도착한다.'],[81,100,'소행성 내부 기지','소행성 또는 작은 천체 내부의 Àrsaidh 시설에 도킹한다.']
]);
list('purpose','시설의 원래 용도','Site Original Purpose',20,133,'감옥|정제소|생물 연구·격리|사원|데이터 보관|군사 시설|예술·감상 공간|통신 시설|거주 시설|교육 시설|우주항|감시 초소|금고|의료 연구·치료|피난처|동력 시설|행정 시설|유흥 시설|무덤|산업 생산');
list('site-story','장소의 과거','Site Story',10,136,'생물에게 점령됨|불안정해짐|오염의 근원|경이로운 기술과 연관됨|합성체에게 점령됨|강력한 물건을 보관했거나 보관 중|큰 수수께끼의 답이 있거나 있었음|끔찍한 비극이 일어난 곳|무시무시한 힘과 연관됨|우주적 사건으로 크게 손상됨');
list('site-descriptor','장소의 첫인상','Overall Site Descriptor',12,137,'습하고 차갑다|건조하고 따뜻하다|낯선 이끼 같은 물질이 덮였다|크고 널찍하다|비좁고 답답하다|식물이 무성하다|기묘한 소음이 끊이지 않는다|인공 중력이 없다|일부가 아직 가동된다|연기나 안개가 자욱하다|약탈되거나 부분 파괴된 흔적|Àrsaidh 양식과 뚜렷이 다른 건축');
list('planet-descriptor','지상 시설의 주변','Planetary Site Descriptor',10,137,'거의 알아볼 수 없는 고대 유적 근처|붕괴하기 쉬운 지반|흐르는 용암 근처|수역 근처|밀림 같은 환경|황량한 곳|산 내부|활동 중인 동물의 서식지|일부가 땅에 묻힘|침수됨');
list('hazard','주된 위험','Site Hazard',8,139,[
  {text:'정신적 교란',detail:'이 장소에서 Resolve 판정은 Demanding(-5).'},
  {text:'독성 대기',detail:'B등급 이상의 방호복이 없으면 매 라운드 D20 피해.'},
  {text:'붕괴',detail:'시간트랙 초기화마다 임의 인물이 DEX 판정. 실패하면 낙하 잔해로 3D10 피해.'},
  {text:'괴물에게 점령됨',detail:'모든 조우가 Aberration이며 즉시 전투가 시작된다.'},
  {text:'봉쇄',detail:'모든 구역의 접근점이 잠겨 있다. 열려면 기계공학(Technology) 판정이 필요하다.'},
  {text:'극한 온도',detail:'진공복 없이는 이 장소를 탐사할 수 없다.'},
  {text:'공간·시간 왜곡',detail:'시간트랙을 진행시킬 때마다 50% 확률로 전진하는 대신 한 칸 후퇴한다.'},
  {text:'수직 구조',detail:'구역 사이 이동에 D20피트 등반이 필요하다.'}
]);
list('size','장소의 규모','Site Size',4,142,'소형|중형|대형|초대형');
list('activity','장소 활동도','Site Activity',6,138,'죽은 듯 고요함 · 최대 1회 매복|고요함 · 최대 2회 매복|다소 고요함 · 최대 3회 매복|활발함 · 최대 4회 매복|분주함 · 최대 5회 매복|극도로 활발함 · 최대 6회 매복');
list('known-threat','추적 위협','Known Threat',6,138,'Spitter|Clobber|Taker|Psybane|Bomber|Cecaelia');
ranges('connector','구역 연결부','Area Connector','d20',144,[[1,10,'일반 복도','20% 확률의 매복 확인.'],[11,11,'아래로 가는 계단'],[12,12,'위로 가는 계단'],[13,16,'넓고 웅장한 복도','20% 확률의 매복 확인.'],[17,17,'다리'],[18,20,'구역끼리 직접 연결']]);
ranges('exploration','구역 탐사','Site Exploration','d10',144,[[1,2,'조우'],[3,3,'자원'],[4,4,'외계 문화 유물'],[5,5,'위험의 발현'],[6,6,'잠긴 접근점'],[7,7,'공포 사건'],[8,8,'자동 보안 장치'],[9,9,'고정 사건'],[10,10,'무작위 상황']]);
list('manifestation','위험의 발현','Hazard Manifestation',20,155,'인물 한 명의 자원을 소모시킨다|감각을 공격한다|장비 하나를 파괴한다|생물학적 위험을 만든다|환영으로 인물을 괴롭힌다|큰 소음을 낸다|인물을 기절시킨다|대원들 뒤의 길을 막는다|정신을 심하게 공격한다|가치 있는 무언가를 감춘다|새 구역으로 통하는 길을 연다|이점이나 강점을 빼앗는다|육체적·정신적 회복에 영향을 준다|시간트랙에 영향을 준다|생물의 원치 않는 관심을 끈다|며칠 뒤 드러날 영향을 남긴다|관계에 영향을 준다|대원 전체를 다른 구역으로 강제 이동시킨다|함정을 만든다|이익을 제공한다');
list('artifact','유물 외형','Xenoanthropological Artifact',20,[150,151],[
  '짧은 Àrsaidh 문자가 새겨진 금반지 · Light','거울처럼 매끈한 은빛 구체 · Light','간격을 두고 홈이 파인 금속 막대 · Light','기하학 무늬가 새겨진 나무 같은 상자 · 1 GS','표면 위에 떠 있는 따뜻한 오목 금속 원반 · Light','작은 은색 틀에 든 깨지지 않는 유리 같은 판 · 1 GS','별자리로 장식한 빈 꽃병 같은 물체 · 1 GS','한 면에서 유리가 튀어나온 금속 피라미드 · Light','끝에 유연한 부속물이 붙은 단단한 관 · Light','문장이 새겨진 아주 단단한 동전 같은 조각들 · Light','세밀한 행성 모형 같은 질감의 구체 · 1 GS','스캐너가 해석하지 못하는 손바닥 크기 돌 정육면체 · Light','끈적한 유리 같은 육각 막대 · 1 GS','손잡이와 파란 구체가 달린 금속 막대 · 1 GS','찢어지지 않는 천 같은 재료 · Light','튕기면 맑은 푸른빛을 내는 작은 구체 · Light','상자에서 꺼내면 불붙는 분홍 반죽이 든 금속 상자 · Light','복잡한 문양이 뒤덮인 짧은 금속 칼날 · 1 GS','세 부분이 회전하는 작은 정십이면체 · Light','안쪽에서 빛이 흔들리는 주먹 크기 붉은 보석 · Light'
]);
list('artifact-value','귀환 후 유물 감정','Artifact Value',6,153,'가치 없음|사소함 · 10 DC|흥미로움 · 25 DC|가치 있음 · 50 DC|귀중함 · 75 DC|매우 귀중함 · 100 DC');
list('door','접근점 유형','Door Type',10,157,[
  {text:'경보문',detail:'Perception으로 경보 발견, Technology로 해제. 자물쇠나 경보 해제에 실패하면 조우.'},
  {text:'공포의 문',detail:'접촉하려면 Resolve 판정에 성공해야 한다.'},
  {text:'평정의 문',detail:'문턱을 넘으면 모든 인물이 침착(Composed) 상태가 된다.'},
  {text:'보안문',detail:'LKPK 사용 시 접근 노드 D10을 두 개 굴려 불리한 결과를 사용한다.'},
  {text:'화염문',detail:'문턱을 넘으면 화염이 분출한다. Perception으로 탐지하고 Technology로 해제.'},
  {text:'정신의 문',detail:'문턱을 넘으면 모든 인물이 D20 스트레스를 받고, 문에서 기어 벗어날 때까지 경련한다.'},
  {text:'전기장문',detail:'통과 시 임의 인물의 Battery 하나가 폭발하며 D10 피해.'},
  {text:'살점문',detail:'살점 사이를 비집고 통과하면 모두 D4 Stress.'},
  {text:'일방통행문',detail:'들어간 방향으로는 돌아올 수 없는 역장.'},
  {text:'일반 금속문',detail:'튼튼한 금속으로 된 평범한 문.'}
]);
list('behind-door','문 너머','What Is Behind the Door',4,158,'우주의 진공 · 지상에서는 제외|부식성 가스 · A등급 방호복 없으면 매 라운드 D20 피해|Elite 괴물의 둥지|자원');
list('dread','공포 사건','Dread',20,[160,161,162],[
  {text:'어둠에 잠식되다',detail:'Taints 표를 굴린다.'},
  {text:'모퉁이 너머의 소리',detail:'모든 인물에게 D4 Stress.'},
  {text:'없어진 장비',detail:'각 인물은 Luck 1을 쓰거나 무작위 장비 1개를 잃는다.'},
  {text:'포위되었다는 공포',detail:'도망치는 인물마다 D10 Stress.'},
  {text:'정신이 마비되다',detail:'임의 인물은 이 장소에서 무작위 Talent 하나의 효과를 쓸 수도 받을 수도 없다.'},
  {text:'그림자를 향한 사격',detail:'모든 인물이 Ammo 1을 소모한다.'},
  {text:'멈추지 않는 과호흡',detail:'임의 인물이 Oxygen Pellet 1을 소모한다.'},
  {text:'인간의 보잘것없음',detail:'모든 인물에게 Stress +15.'},
  {text:'놈들이 사방에 있다',detail:'대원들이 매복 공격을 받는다.'},
  {text:'상처 너머로 밀려오는 고통',detail:'각 인물이 현재 Wound 1개당 Stress 10을 받는다.'},
  {text:'각성한 방어 프로토콜',detail:'조우하는 모든 Guardian의 최대 Wounds +1.'},
  {text:'더는 버틸 수 없다',detail:'임의 인물은 Resolve 판정. 실패하면 Trauma 표.'},
  {text:'움직임을 따라갈 수 없다',detail:'조우하는 모든 Aberration의 Initiative +1.'},
  {text:'저주받은 장소',detail:'이 장소에서 Resolve 판정의 자연 6마다 Dread를 굴린다.'},
  {text:'시야를 가리는 그림자',detail:'모두 XP 50과 D20 Stress를 받는다.'},
  {text:'불길한 징조',detail:'모두 Luck +1과 D20 Stress를 받는다.'},
  {text:'죽어 가는 세계들의 비명',detail:'현재 탐사지에서 활성화된 공포 효과 1개당 각 인물에게 D10 스트레스.'},
  {text:'강해지는 적들',detail:'모든 Abomination과 Guardian이 Tough를 얻는다.'},
  {text:'위치가 발각되다',detail:'다음 전투 조우는 자동으로 매복 공격이 된다.'},
  {text:'자신을 갉아먹는 의심',detail:'모든 인물의 모든 Skill 판정에 -1.'}
]);
list('taint','오염','Taints',10,[162,163],[
  {text:'오염된 활력',detail:'최대 Wounds -1. 장소마다 한 번 모든 Wounds와 Conditions를 회복할 수 있다.'},
  {text:'괴사하는 피부',detail:'피해를 받을 때마다 추가 D4 피해. 영구 Armor(2).'},
  {text:'허기',detail:'CON -2. Armor Penetration(5).'},
  {text:'신들의 꼭두각시',detail:'WIL -2. 각 탐사지 탐사 시작마다 행운 +1.'},
  {text:'뒤엉킨 기억',detail:'한 Skill에서 5점을 잃고 다른 Skill들에 재분배한다.'},
  {text:'어둠의 정수',detail:'최대 Wounds -1. 공격마다 추가 D10 피해.'},
  {text:'일그러진 현실',detail:'얻는 XP가 절반이지만 Stress 효과에 면역.'},
  {text:'감염된 팔',detail:'한손 무기만 사용할 수 있다. 최대 Wounds +1.'},
  {text:'중독',detail:'각 탐사지 탐사를 중독 I(Poisoned I) 상태로 시작. 전투 외 CON 판정에 advantage.'},
  {text:'실명',detail:'Blinded 상태가 되지만 방사선과 독에 면역.'}
]);
list('security','자동 보안 장치','Automatic Security Measure',10,164,[
  {text:'경보',detail:'Technology 판정으로 끄지 못하면 조우.'},
  {text:'가연성 가스',detail:'작동 중인 대기 센서(Atmospheric Sensor)로 탐지할 수 있다. 탐지하지 못하면 잠시 뒤 가스가 타오르며 이 구역 안의 모든 인물에게 D20 피해를 준다.'},
  {text:'전기장',detail:'구역 안의 모든 인물에게 D10+10 피해를 준다. 전기장은 1라운드 동안 지속되며, 누구든 구역에 들어올 때마다 다시 발동한다.'},
  {text:'중력 역전',detail:'DEX 판정 실패 시 천장으로 추락해 Wound 1. 이 구역에서는 영구적이며 20% 확률로 장소 전체에도 적용.'},
  {text:'봉쇄',detail:'현재 구역을 포함해 아직 발견하지 못한 구역의 접근점이 잠긴다.'},
  {text:'나노머신',detail:'임의 인물을 둘러싸 매 라운드 Wound 1. 불 등으로 처리하기 전까지 대상을 바꿔 가며 공격.'},
  {text:'음파 공격',detail:'탐사가 끝날 때까지 모두 Perception -2.'},
  {text:'정지장',detail:'무작위 대원 두 명이 구조될 때까지 무기한 정지장에 갇힌다. 과학(Science) 판정으로 구조 방법을 알아낼 수 있다.'},
  {text:'순간이동',detail:'각 인물이 무작위 장소로 이동한다. 순간이동 표 참조.'},
  {text:'자동 포탑',detail:'Ranged Weapon 12, 피해 D20. 매 라운드 임의 인물을 사격한다.'}
]);
ranges('teleport','순간이동 목적지','Random Teleportation','d10',164,[[1,3,'미탐사 구역'],[4,6,'탐사지 입구'],[7,9,'잠긴 방 내부'],[10,10,'장소 밖 · 행성 표면 또는 진공']]);
list('fixed-event','고정 사건','Fixed Event',20,[166,167,168,169],[
  {text:'벽에서 기어나오는 환영',detail:'임의 인물에게 D10 Stress. WIL 실패 시 무작정 발포하며 다른 대원은 DEX로 피한다.'},
  {text:'금속까지 부식시키는 증식물',detail:'각 인물은 DEX 판정. 실패하면 무작위 장비 1개를 잃는다.'},
  {text:'뼈로 만든 왕좌',detail:'Perception에 성공하면 그 안에 인간의 두개골도 섞여 있음을 발견한다.'},
  {text:'붕괴한 바닥',detail:'발아래로 깊고 검은 구멍이 드러나 있다.'},
  {text:'여기에 왜 왔지?',detail:'임의 인물의 머릿속에 목소리가 들리며 Stress +5.'},
  {text:'누군가 따라온다는 확신',detail:'임의 대원 두 명이 강한 기척을 느낀다. 사실 여부는 아직 모른다.'},
  {text:'빠져나가는 누군가의 실루엣',detail:'쫓아가도 아무도 없다.'},
  {text:'따뜻한 진흙 방의 알',detail:'벽에서 점액이 흐른다. 구석의 큰 알들 속에서 무언가 움직인다.'},
  {text:'전자 장비의 침묵',detail:'이 구역 안에서는 전자 기기와 광원이 모두 작동하지 않는다.'},
  {text:'보이지 않는 무언가의 이빨',detail:'임의 대원의 손에 실제 물린 자국이 남는다. 위험성은 불명.'},
  {text:'포자를 터뜨리는 균류',detail:'피부가 노출된 인물은 Poison II의 영향을 받는다.'},
  {text:'얼어붙은 바닥',detail:'통과에 시간트랙 +1.'},
  {text:'괴물의 벌집',detail:'각 인물 Stealth 실패 시 Hard Swarm과 조우. 벌집 밖으로는 추격하지 않는다.'},
  {text:'몸 밖에서 본 자신',detail:'혼자라면 감각 과부하로 시간트랙 +1. 여럿이면 왼쪽 플레이어와 시트를 바꾸며 트랙 초기화까지 지속.'},
  {text:'거대한 기념 기둥',detail:'접근하면 50% 확률로 Luck 1을 얻거나 잃는다.'},
  {text:'투명한 뚜껑의 금속 상자',detail:'열면 50% 확률로 유물, 또는 D20 피해의 폭발. 열기 전에는 굴리지 않는다.'},
  {text:'천장으로 이어지는 사다리',detail:'천장의 해치는 이 탐사지 바깥으로 직접 통한다.'},
  {text:'강해지는 낮은 진동음',detail:'1분보다 오래 머물면 CON 판정. 실패 시 D10+5 피해와 귀 출혈.'},
  {text:'잃어버린 기억 같은 평온',detail:'시간트랙 +1칸을 들여 D20 스트레스를 회복한다. 떠나려면 WIL 판정에 성공해야 한다. 10분마다 한 번만 시도할 수 있으며 시도마다 시간트랙 +1칸.'},
  {text:'작은 태양처럼 빛나는 동력원',detail:'보호장비가 없으면 D100×3 rads에 노출.'}
]);
list('occurrence','무작위 상황 유형','Type of Occurrence',4,171,'위험|발견|사건|상황');
list('danger','무작위 위험','Danger',6,171,'보안 장치|전투 조우|폭발|환경적 위험|방사선|정신적 교란');
list('discovery','발견','Discovery',20,170,'붕괴하거나 노출된 구획|뼈 또는 유해|유물|죽은 생물|잠긴 접근점|합금 큐브|독특한 예술품|이상한 대기 측정값|데이터 크리스털|예상 밖의 식물·균류|잡동사니·잔해|이질적인 건축 양식|청각·시각 환영|전투 흔적|기이한 중력·자기장·양자 현상|발자국·자국|이곳과 어울리지 않는 물건|탐사지 출구|구덩이·수직 통로|Àrsaidh 우주선');
list('random-event','무작위 사건','Event',10,171,'설명할 수 없는 현상|깨어나는 고대의 위험|기묘한 소리|시설의 원래 용도와 관련된 사건|구역마다 진행되는 감압|인간에게 완벽한 대기·압력·중력|통제되지 않는 화재|눈을 뜨기 힘들 만큼 밝은 빛|인물 한 명에게 장소의 과거를 보여 주는 환영|대원들을 두 시간트랙 전 상태로 되돌리는 시간장 · 잃었던 자원을 되찾고 상처가 치료되거나 다시 열리는 등 당시 상태를 복원한다');
list('travel-type','항해 사건 유형','Random Travel Event Type',4,119,'사회적 사건|선체·장비 고장|우주 이상 현상|정신·신체 문제');
ranges('travel-social','사회적 항해 사건','Social Travel Event','d10',119,[[1,5,'두 대원의 대화','대화 주제와 각자의 반응을 정한다.'],[6,6,'두 대원 사이의 사건','유대가 있었다면 깨진다. 대화 주제나 행동·주제로 구체화.'],[7,7,'마음을 닫는 대원','임의 대원은 다음 주 동안 모든 행동에 -2.'],[8,8,'새로 생긴 유대','두 대원이 서로와 관련된 행동에 +1.'],[9,9,'작은 축하','모든 대원 Stress -5.'],[10,10,'비상 훈련','모든 대원의 다음 Skill 판정에 +1.']]);
list('travel-malfunction','항해 중 고장','Ship Malfunction',10,120,[
  '객실 감압. 각 대원 Hard Technology로 수리 시도. 모두 실패하면 진공복 착용 또는 CON으로 실신 방지. 진공복 없이 1시간이면 사망.',
  '중력 보정 고장으로 화물이 쏟아진다. Normal STR로 정리해야 한다.',
  '센서가 워프 공간 이탈을 보고한다. 센서의 오류인가, 실제인가?',
  '화물 폭발과 화학 화재로 D6 Supplies 손실.',
  '전원 고장. Technology 수리 시도마다 대원별 Oxygen Pellet 1개를 소모한다.',
  '공기 재활용 장치 문제로 Oxygen Tank D4개 손실.',
  '배터리에서 방사선 누출. 모두 D100 rads 노출.',
  '주방 고장으로 D4 Supplies 손실.',
  '화장실 고장. 모두 D10 Stress.',
  '생명유지 온도 조절기가 고장 나 매분 1°F씩 하강.'
]);
list('travel-anomaly','항해 중 우주 이상','Space Anomaly',10,121,[
  '미지의 방사선으로 워프 이탈. 일주일간 진행 불가, 매일 Stress +5.',
  '소행성 충돌의 충격. 배는 무사하지만 대원마다 Wound 1.',
  '시간 왜곡. 귀환하면 수개월이 지나 실종 처리되어 있다.',
  '선체 밖 두드림·목소리·그림자. D10일간 매일 Stress +5.',
  '가스 성운 속 워프 이탈. 선체가 부식되는 소리, 모두 D10 Stress.',
  '측량 장비가 전자기 교란으로 손상. Hard Technology로 수리.',
  '외부 힘으로 워프 이탈 후 잘못된 도약이 발생한다.',
  'D6시간의 재보정 중 거대한 우주선이 탐사선을 스캔하고 떠난다.',
  '워프 중 심한 진동. DEX 실패 시 Wound 1.',
  '워프 이탈 후 있을 수 없는 Karum Station과 Àrsaidh 함선들이 보인다. 잠시 뒤 항해를 재개한다.'
]);
list('travel-issue','항해 중 정신·신체 문제','Mental or Physical Issue',10,122,[
  '떨어진 공구에 임의 대원이 Wound 1.',
  '우주선이 임의 대원과 접속을 시도한다. D6일 동안 목적지 환영과 낯선 목소리로 매일 D10 Stress.',
  '우주선과 대원의 접속 시도로 잘못된 도약이 발생한다.',
  '매일 다른 대원에게 사랑하는 사람의 환영이 나타난다.',
  '임의 대원에게 고열·호흡곤란. D10일 동안 매일 Medical Aid, 실패마다 기간 +1일. 미완치 상태로 도착 시 이번 탐사 모든 굴림 -5.',
  '임의 대원의 갑작스러운 불안 발작. Stress Reaction 표 참조.',
  '누군가 술을 숨겼다는 확신. 사실은 망상으로 보인다.',
  '임의 대원이 Resolve에 실패하면 일주일치 식량을 한 번에 먹으려 한다.',
  '예지몽. 다음 전투에서 상대를 기습할 수 있다.',
  '임의 대원이 하루 동안 반응을 잃었다가 회복. Stress와 Trauma를 모두 잃는다.'
]);
list('attitude','NPC 첫 태도','NPC Starting Attitude',6,236,'적대적|적대적|중립적|중립적|우호적|우호적');
ranges('npc-hostile','적대적 행동','Hostile NPC','d10',238,[[1,2,'경고 없이 공격한다'],[3,4,'위협하거나 괴롭힌다'],[5,6,'무언가를 요구한다'],[7,8,'접근을 막는다'],[9,10,'속이려 한다']]);
ranges('npc-neutral','중립적 행동','Neutral NPC','d10',238,[[1,2,'관심이 없다'],[3,4,'일을 제안하거나 작업에 도움을 청한다'],[5,6,'물건이나 정보를 거래하려 한다'],[7,8,'부탁이나 일거리가 있다'],[9,10,'속이려 한다']]);
ranges('npc-friendly','우호적 행동','Friendly NPC','d10',238,[[1,2,'이야기하거나 소문을 전한다'],[3,4,'직접 도움을 제공한다'],[5,6,'거래를 제안한다'],[7,8,'선물을 준다'],[9,10,'단서나 실마리를 전한다']]);
ranges('motivation','현재 상황에 대한 의욕','NPC Motivation','d10',240,[[1,2,'의욕이 없거나 저항한다'],[3,5,'관심 없지만 흐름을 따른다'],[6,8,'관심을 보이며 협력한다'],[9,10,'매우 적극적이며 전념한다']]);
list('reaction','대화 반응','Character Reaction',12,249,'무시함 (-)|흥미로움 (+)|지루함 (-)|감사함 (+)|화남 (-)|혼란스러움|산만함 (-)|못마땅함 (-)|들뜸 (+)|놀라움 (+)|슬픔|긴장');
const topics='최근 가족사|혈통과 가족|지구의 미래|현재 또는 최근 탐사|죽음|Karum Station의 음식|장비|자신의 두려움|소중한 경험|소문|지구의 과거|Àrsaidh|자신의 실패|도움이 되는 인맥|KSA|자신의 희망|유명인|KSA의 유명한 방탕 행각|자신의 특별한 기술|음모론|유명한 장소|지구에서의 삶|자신의 동기|자신의 결점|적대자|오락|이전 탐사|건강|현실의 본질|종교|친구|관계|서로에 관하여|부|비밀|최근 사건'.split('|');
define('conversation','대화 주제','Conversation Topic','d66',[250,251],topics.map((text,i)=>({min:(Math.floor(i/6)+1)*10+i%6+1,max:(Math.floor(i/6)+1)*10+i%6+1,text})));
ranges('encounter-difficulty','조우 난도','Encounter Difficulty','d20',146,[[1,5,'쉬움'],[6,13,'보통'],[14,18,'정예'],[19,20,'압도적']]);
ranges('creature-space','우주 시설의 생물 유형','Creature Type · Off-Planet','d6',268,[[1,2,'Guardian'],[3,4,'Aberration'],[5,6,'Synthetic']]);
ranges('creature-planet','지상 시설의 생물 유형','Creature Type · Planet Surface','d6',268,[[1,1,'Guardian'],[2,3,'Aberration'],[4,6,'Local Fauna']]);
ranges('creature-size','생물 크기','Size & Damage Modifier','d20',269,[[1,3,'설치류~집고양이','근접 피해 -2'],[4,8,'대형 개~살쾡이','근접 피해 -1'],[9,16,'인간 정도','근접 피해 변화 없음'],[17,18,'큰 고릴라 정도','근접 피해 +1'],[19,20,'소~악어 정도','근접 피해 +2']]);
// Same creature TYPE throughout a single encounter, even with mixed tiers (p.263).
const compositions = {
  '1.easy': [[1,20,'쉬움 1']],
  '1.standard': [[1,12,'보통 1'],[13,20,'쉬움 2']],
  '1.elite': [[1,10,'정예 1'],[11,15,'보통 2'],[16,18,'보통 1 + 쉬움 2'],[19,20,'쉬움 3']],
  '1.overwhelming': [[1,8,'압도적 1'],[9,10,'정예 2'],[11,12,'정예 1 + 보통 2'],[13,14,'정예 1 + 쉬움 3'],[15,16,'보통 3'],[17,18,'보통 2 + 쉬움 3'],[19,20,'쉬움 4']],
  '3.easy': [[1,12,'쉬움 3'],[13,20,'쉬움 1 + 보통 1']],
  '3.standard': [[1,10,'보통 3'],[11,13,'쉬움 2 + 보통 2'],[14,16,'쉬움 4 + 보통 1'],[17,18,'쉬움 6'],[19,20,'정예 1 + 쉬움 2']],
  '3.elite': [[1,8,'정예 3'],[9,10,'정예 2 + 보통 2'],[11,12,'정예 1 + 보통 4'],[13,14,'정예 2 + 쉬움 4'],[15,16,'정예 1 + 쉬움 8'],[17,18,'보통 6'],[19,20,'쉬움 10']],
  '3.overwhelming': [[1,6,'압도적 3'],[7,8,'압도적 2 + 정예 2'],[9,10,'압도적 1 + 정예 4'],[11,12,'압도적 2 + 보통 8'],[13,14,'압도적 1 + 보통 12'],[15,16,'압도적 2 + 쉬움 16'],[17,18,'압도적 1 + 쉬움 20'],[19,20,'쉬움 24']],
  '5.easy': [[1,10,'쉬움 5'],[11,15,'보통 2 + 쉬움 1'],[16,18,'보통 1 + 쉬움 3'],[19,20,'정예 1 + 쉬움 1']],
  '5.standard': [[1,2,'보통 5'],[3,4,'보통 4 + 쉬움 2'],[5,6,'보통 3 + 쉬움 4'],[7,8,'보통 2 + 쉬움 6'],[9,10,'보통 1 + 쉬움 8'],[11,12,'정예 2 + 보통 1'],[13,14,'정예 1 + 보통 3'],[15,16,'정예 2 + 쉬움 2'],[17,18,'정예 1 + 쉬움 6'],[19,20,'쉬움 10']],
  '5.elite': [[1,6,'정예 5'],[7,7,'정예 4 + 쉬움 4'],[8,8,'정예 3 + 쉬움 8'],[9,9,'정예 2 + 쉬움 12'],[10,10,'정예 1 + 쉬움 16'],[11,11,'정예 4 + 보통 2'],[12,12,'정예 3 + 보통 4'],[13,13,'정예 2 + 보통 6'],[14,14,'정예 1 + 보통 8'],[15,15,'쉬움 20'],[16,16,'보통 10'],[17,17,'압도적 1 + 정예 1'],[18,18,'압도적 1 + 보통 2'],[19,19,'압도적 1 + 쉬움 4'],[20,20,'보통 5 + 쉬움 10']],
  '5.overwhelming': [[1,7,'압도적 5'],[8,8,'압도적 4 + 정예 2'],[9,9,'압도적 3 + 정예 4'],[10,10,'압도적 2 + 정예 6'],[11,11,'압도적 1 + 정예 8'],[12,12,'압도적 4 + 보통 4'],[13,13,'압도적 3 + 보통 8'],[14,14,'압도적 2 + 보통 12'],[15,15,'압도적 1 + 보통 16'],[16,16,'정예 10'],[17,17,'보통 20'],[18,18,'쉬움 40'],[19,19,'정예 8 + 보통 4'],[20,20,'보통 10 + 쉬움 20']]
};
for (const [key, rows] of Object.entries(compositions)) ranges(`encounter-${key}`,`${key.split('.')[0]}인 출발 · 조우 구성`, `Crew Encounter · ${key}`, 'd20', Number(key[0])===1?264:Number(key[0])===3?265:key.endsWith('easy')||key.endsWith('standard')?266:267,rows);

list('situation-verb','상황 동사','Situation Verbs',100,172,'버리다|고발하다|악화시키다|돕다|경고하다|매복하다|변경하다|놀라게 하다|추방하다|손짓하다|현혹하다|폭파하다|괴롭히다|부수다|방송하다|포획하다|운반하다|도전하다|매혹하다|추격하다|질식시키다|주장하다|오르다|붕괴하다|충돌하다|숨기다|대면하다|혼란시키다|오염시키다|타락시키다|손상시키다|감히 하다|쇠퇴하다|거절하다|바치다|훼손하다|패배시키다|방어하다|해체하다|전달하다|파괴하다|발견하다|토론하다|흩뜨리다|방해하다|우회시키다|빠져나가다|위태롭게 하다|끝내다|강제하다|관여하다|설계하다|깨우치다|덫에 빠뜨리다|들어가다|교환하다|대피하다|회피하다|조사하다|교환하다|폭발하다|위조하다|떨어지다|따르다|강요하다|예언하다|갈라지다|해방하다|겁주다|좌절시키다|모으다|주다|언뜻 보다|붙잡다|지키다|서두르다|다치게 하다|격화시키다|들끓다|알리다|선동하다|변이하다|가리다|차단하다|수행하다|금지하다|제공하다|뒤쫓다|수리하다|연구하다|보상하다|뒤지다|분리하다|장악하다|말하다|유혹하다|변형하다|사라지다|경고하다|목격하다');
const nounData = {
  1:'처벌|범죄|수감자|판옵티콘|병동|감옥|권위|죄책감|무죄|학대|정의|격리|박탈|벽|자유|억제|죽음|시간|고독|보안',
  2:'플랜트|제련소|용기|공장|정제 장치|관로|기계|위험|크리스털|반응로|도가니|분쇄기|발연황산|합금|용광로|가스|단조|창조|파괴|폐기물',
  4:'성소|숭배|영성|신|기도|희생|고대|점술가|믿음|의식|교단|종교|수행|신성함|예식|봉헌|순례|비석|성상|분열',
  5:'데이터 지점|단말|서버|도서관|유지보수|데이터베이스|시설|보안|하드웨어|소프트웨어|정보|인터페이스|접근|연결|노드|가상|저장|회로|폐기|처리',
  6:'방어|공격|무기|전쟁|주둔군|병력|기술|임무|침공|충돌|보안|적|권위|전략|군사|장비|경비|압제|막사|복무',
  7:'예술|감각|추상|주관|환상|설계|조화|개념|쾌락|휴식|미학|창작|성찰|경험|조각|가치|세련됨|여가|다양성|오락',
  8:'탑|콘솔|표지|체계|접근|연결|배열|표시장치|통신|네트워크|채널|콘텐츠|상징|소리|신호|기술|수신기|시설|인터페이스|위성',
  9:'주거|건물|피난처|보호|구역|산업|설비|생계|공동체|개인|기관|인구|숙소|저장|주인|건설|서식지|기숙사|거주자|돔',
  10:'수업|과학|신비주의자|정신|교육|프로그램|지식|교사|공부|발전|강사|영감|학문|힘|진보|아이디어|연구소|데이터|유산|권위',
  11:'우주선|이상 현상|위험|연료|보급품|기술|발사대|정비|정거장|바지선|무기|비행|중력|조종사|천문대|표면|항법|위성|통제|우주항행',
  12:'포탑|성채|천문대|분석|기술|발견|감시|전망대|위험|경보|경계|정보|정찰|시야|임무|인원|자동화|평가|보안|통제',
  13:'보안|수호자|위험|정보|자원|방|은신처|저장|문|벽|경보|용기|접근점|장벽|장치|버튼|방패|보루|수호|수용',
  14:'외상|부상|환자|기술|데이터|연구|의무실|병리|감염|영안실|치료|전문가|질병|약|치료|발견|이론|실험|탐구자|유전학',
  15:'안전|바리케이드|수호자|성역|거처|은신처|식민지|위협|자원|야영지|정착민|둥지|방주|숙소|유해|병동|주인|위안|생계|수의',
  16:'에너지|연료|동력|코일|저장|배터리|엔진|발전기|전기|장|정거장|전력망|통제|개발|전선|관|도체|공장|연구|장비',
  17:'행정부|통제|행정|기록 보관소|데이터|도표|대중|권위|척도|법|조직|감독|기관|시설|감독관|영역|의회|국가|행성|구역',
  18:'오락|기쁨|기술|장치|인터페이스|기계|음악|표시장치|디지털|기분 전환|만족|상호작용|증폭기|창조|현실|파장|채널|의식|데이터|축제',
  19:'영묘|매장|기념물|비석|기념비|수호자|장식|석조|공동묘지|무덤|동굴|성소|제단|폐허|유물|죽음|안식|평화|지하묘|숲',
  20:'제조|제품|기술|기계|동력|공장|광산|야금|화학|생물학|기반시설|저장|개발|자동화|군사|건축|공급|설비|건설|공학'
};
for (const [purpose,values] of Object.entries(nounData)) list(`noun-${purpose}`,`${tables.purpose.rows[Number(purpose)-1].text} · 상황 명사`,'Situation Nouns',20,[173,174,175],values);
ranges('misjump','잘못된 도약','Consequences of a Misjump','d6',123,[[1,2,'충격음 후 재부팅','그 외에는 아무 일도 없다.'],[3,4,'시간 차이'],[5,6,'이동 시간 차이']]);
ranges('time-dilation','시간 차이 단위','Time Dilation Misjump','d6',123,[[1,2,'시간'],[3,4,'주'],[5,6,'개월']]);
ranges('transit-dilation','항해 시간 변동','Transit Dilation Misjump','d6',123,[[1,2,'즉시 도착'],[3,4,'D4주 단축'],[5,6,'D4주 연장']]);
list('misjump-secondary','도약의 부차 효과','Secondary Misjump Effects',6,123,'무작위 개인 Battery D6개 방전|식수가 사라짐 · 남은 Supplies 절반|모든 대원 Stress +5|과거의 무작위 세부사항을 기억하지 못함|선내 데이터가 모두 사라짐|모든 대원이 Negative Trait 하나를 얻음');
for(const table of [...sourceTables,...compoundTables]){
  if(tables[table.id])throw new Error(`Duplicate table ID: ${table.id}`);
  tables[table.id]=table;
}
completeTables({list,ranges,define,tables});
applyKorean(tables);
// The ability index and its effect descriptions occupy different printed pages.
for(const row of tables['enemy-ability'].rows)row.page=row.min<=7?281:row.min<=13?282:283;
for(const row of tables['psychic-ability'].rows)row.page=row.min<=4?284:285;
for(const t of Object.values(tables)){
  const p=[t.page].flat()[0];
  t.category=p<32?'character':p<92?'combat':p<107?'condition':p<124?'travel':p<182?'site':p<218?'planet':p<234?'gm':p<252?'npc':p<260?'gm':p<318?'creature': 'station';
  if(t.id==='artifact-value')t.category='site';
}
export const tableList = Object.values(tables);
export const CATEGORIES={all:'모든 표',gm:'솔로 GM',site:'탐사지',planet:'행성 탐사',npc:'인물',creature:'생물',combat:'전투',condition:'상태·정신',travel:'항해',station:'정거장',character:'캐릭터 생성'};
