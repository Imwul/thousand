export const ODDS = [
  {id:'impossible',label:'거의 불가능',threshold:16},
  {id:'very-unlikely',label:'매우 희박',threshold:14},
  {id:'unlikely',label:'희박',threshold:12},
  {id:'even',label:'반반',threshold:10},
  {id:'likely',label:'높음',threshold:8},
  {id:'very-likely',label:'매우 높음',threshold:6},
  {id:'certain',label:'거의 확실',threshold:4}
];
export const PROCEDURES = [
  {id:'question',name:'질문하기',en:'Prediction',description:'예/아니오, 보충어와 복잡성을 한 번에.',icon:'question',pages:'228–230'},
  {id:'scene',name:'새 장면',en:'New scene',description:'예상대로 시작할까? 반전이 생기면 사건까지.',icon:'scene',pages:'226–233'},
  {id:'area',name:'새 구역 탐사',en:'Explore an area',description:'연결부와 탐사 결과에 필요한 하위 표까지.',icon:'area',pages:'144–175'},
  {id:'arrival',name:'목적지 도착',en:'Arrival',description:'도착 확인부터 탐사지의 용도·규모·위험까지.',icon:'arrival',pages:'125–143'},
  {id:'npc',name:'NPC 만나기',en:'NPC encounter',description:'첫 태도, 행동과 지금 상황에 대한 의욕.',icon:'npc',pages:'236–240'},
  {id:'travel',name:'항해 한 주',en:'Travel events',description:'주차에 맞는 사건과 도착 여부를 함께 확인.',icon:'travel',pages:'118–126'},
  {id:'surprise',name:'돌발사건',en:'Surprise event',description:'돌발사건과 행동·주제로 다음 단서를 얻기.',icon:'surprise',pages:'231–233'},
  {id:'inspiration',name:'행동과 주제',en:'Action & theme',description:'상황을 풀어 갈 두 단어.',icon:'inspiration',pages:'254–257'},
  {id:'door',name:'잠긴 문',en:'Locked access',description:'문과 방화벽을 보고, 안/밖을 직접 선택.',icon:'door',pages:'156–158'},
  {id:'resolution',name:'임의 행동 결과',en:'Action resolution',description:'능력치 판정 없이 성공의 정도만 확인.',icon:'resolution',pages:'258'},
  {id:'planet',name:'행성 생성',en:'Planet generation',icon:'arrival',pages:'183–189'},
  {id:'hex',name:'행성 헥스 탐사',en:'Planetside exploration',icon:'area',pages:'189–217'},
  {id:'creature',name:'생물 상세 생성',en:'Creature generation',icon:'npc',pages:'262–299'},
  {id:'npc-profile',name:'NPC 상세 생성',en:'NPC generation',icon:'npc',pages:'234–245, 358–361'},
  {id:'emotion',name:'NPC 감정',en:'NPC emotions',icon:'question',pages:'246–247'},
  {id:'information',name:'NPC에게 얻는 정보',en:'NPC information',icon:'inspiration',pages:'236–237'},
  {id:'conversation',name:'대화',en:'Conversation',icon:'scene',pages:'248–251'},
  {id:'combat-start',name:'전투 준비',en:'Combat setup',icon:'surprise',pages:'46–53'},
  {id:'behavior',name:'적의 이번 행동',en:'Combat behavior',icon:'resolution',pages:'59, 275–313'},
  {id:'injury',name:'부상',en:'Injuries',icon:'surprise',pages:'76–78'},
  {id:'stress',name:'스트레스 반응',en:'Stress reaction',icon:'question',pages:'94–95'},
  {id:'trauma',name:'트라우마',en:'Trauma',icon:'scene',pages:'99–101'},
  {id:'station',name:'정거장 활동',en:'Karum Station',icon:'scene',pages:'334–349'},
  {id:'ship-name',name:'우주선 이름',en:'Ship name',icon:'travel',pages:'112–113'},
  {id:'site-name',name:'탐사지 이름',en:'Site designation',icon:'arrival',pages:'131'},
  {id:'hacking',name:'해킹',en:'Hacking',icon:'door',pages:'102'},
  {id:'dice',name:'일반 주사위',en:'Dice',icon:'dice',pages:'34'},
  {id:'alternate',name:'우회 경로 찾기',en:'Alternate access',icon:'door',pages:'159'},
  {id:'activity',name:'시간트랙이 찼을 때',en:'Activity check',icon:'surprise',pages:'129, 138'},
  {id:'artifact-activate',name:'유물 활성화',en:'Artifact activation',icon:'inspiration',pages:'152'},
  {id:'scatter',name:'투척 산포',en:'Throw scatter',icon:'resolution',pages:'63'}
];
export const SLOT_COUNTS = [4,6,8,12];
export function defaultContext() {
  return {siteId:'unassigned',siteName:'',crew:1,presentCrew:1,location:'space',purpose:0,hazard:0,size:1,twist:1,resources:true,artifacts:true,knownThreats:true,slots:Array(4).fill(''),biome:1,terrain:4,singleBiome:false};
}
export function defaultOptions() {
  return {question:'',odds:'even',qualifier:true,complication:true,details:true,connector:true,known:false,history:true,week:1,destination:'unknown',knownWeeks:3,tier:'standard',species:'random',guardianModel:'titan',randomIntelligence:false,aquatic:false,moodDepth:3,stationActivity:'carousing',behavior:'brute',retarget:false,cautious:false,generateCover:true,checkEncounterReaction:true,hackingDifficulty:1,diceExpression:'1d20',sights:false};
}
export function newCampaign(name='첫 번째 탐사') {
  return {id:crypto.randomUUID(),name:name.trim()||'새 탐사',createdAt:new Date().toISOString(),context:defaultContext(),options:defaultOptions()};
}
export function normalizeContext(value={}) {
  const c={...defaultContext(),...value};
  if(![1,3,5].includes(c.crew)) throw new Error('탐사 출발 정원은 1·3·5명 중 하나여야 합니다.');
  if(!Number.isInteger(c.presentCrew)||c.presentCrew<1||c.presentCrew>5) throw new Error('현재 대원 수는 1–5명이어야 합니다.');
  if(![1,2,3,4].includes(c.size)||![1,2,3].includes(c.twist)) throw new Error('규모 또는 반전 범위가 잘못되었습니다.');
  if(!['space','planet'].includes(c.location)) throw new Error('장소 유형이 잘못되었습니다.');
  if(!Number.isInteger(c.purpose)||c.purpose<0||c.purpose>20||!Number.isInteger(c.hazard)||c.hazard<0||c.hazard>8) throw new Error('장소의 용도 또는 위험 범위가 잘못되었습니다.');
  if(typeof c.siteId!=='string'||c.siteId.length>100||typeof c.siteName!=='string'||c.siteName.length>200||typeof c.resources!=='boolean'||typeof c.artifacts!=='boolean') throw new Error('장소 정보가 잘못되었습니다.');
  if(!Number.isInteger(c.biome)||c.biome<1||c.biome>10||!Number.isInteger(c.terrain)||c.terrain<0||c.terrain>4||typeof c.singleBiome!=='boolean'||typeof c.knownThreats!=='boolean')throw new Error('행성 탐사 맥락이 잘못되었습니다.');
  if(!Array.isArray(c.slots)||c.slots.length!==SLOT_COUNTS[c.size-1]||c.slots.some(v=>typeof v!=='string'||v.length>300)) throw new Error('조우 슬롯이 장소 규모와 일치하지 않습니다.');
  return structuredClone(c);
}
export function normalizeOptions(value={}) {
  const o={...defaultOptions(),...value};
  if(typeof o.question!=='string'||o.question.length>2000||!ODDS.some(v=>v.id===o.odds)) throw new Error('질문 또는 가능성 값이 잘못되었습니다.');
  for(const key of ['qualifier','complication','details','connector','known','history','randomIntelligence','aquatic','retarget','cautious','generateCover','checkEncounterReaction','sights']) if(typeof o[key]!=='boolean') throw new Error('굴림 옵션이 잘못되었습니다.');
  if(!Number.isInteger(o.week)||o.week<1||o.week>52||!Number.isInteger(o.knownWeeks)||o.knownWeeks<1||o.knownWeeks>52||!['unknown','known'].includes(o.destination)) throw new Error('항해 설정이 잘못되었습니다.');
  if(!['easy','standard','elite','overwhelming'].includes(o.tier)||!['random','Guardian','Aberration','Synthetic','Local Fauna'].includes(o.species)||!['titan','anansi','arash','brahmari'].includes(o.guardianModel))throw new Error('생물 생성 옵션이 잘못되었습니다.');
  if(!Number.isInteger(o.moodDepth)||o.moodDepth<1||o.moodDepth>3||!Number.isInteger(o.hackingDifficulty)||o.hackingDifficulty<1||o.hackingDifficulty>6||typeof o.diceExpression!=='string'||o.diceExpression.length>100)throw new Error('굴림 깊이 또는 주사위 설정이 잘못되었습니다.');
  if(!['carousing','night','locals','news'].includes(o.stationActivity)||!['brute','lurker','ranged','swarm','psychic','spitter','clobber','taker','psybane','bomber','cecaelia'].includes(o.behavior))throw new Error('상황 선택이 잘못되었습니다.');
  return structuredClone(o);
}
export function endScene(context,controlled) {return {...context,twist:controlled?context.twist:Math.min(3,context.twist+1)};}
