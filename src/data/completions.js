export function completeTables({list,ranges,define,tables}){
  ranges('encounter-reaction','전투 전 조우 반응','Encounter Reaction','d10',43,[[1,8,'공격한다'],[9,10,'대원들을 무시하고 구역을 떠난다']]);
  list('scatter-direction','투척 실패 산포 방향','Explosive Scatter Direction',8,63,'북|북동|동|남동|남|남서|서|북서');
  ranges('alternate-access','우회 접근 경로','Alternate Access Point','d10',159,[[1,5,'조우'],[6,10,'자동 보안 장치']]);
  list('hacking-difficulty','해킹 시스템 난도','Hacking Difficulty',6,102,'난도 1|난도 2|난도 3|난도 4|난도 5|난도 6');
  ranges('difficulty','판정 난도','Difficulty Modifiers','d8',37,[[1,1,'어린애 장난 · +15'],[2,2,'수월함 · +10'],[3,3,'쉬움 · +5'],[4,5,'보통 · 0'],[6,6,'까다로움 · -5'],[7,7,'어려움 · -10'],[8,8,'거의 불가능 · -15']]);
  ranges('stance','전투 자세','Combat Stance','d6',56,[[1,2,'방어적','Initiative -2, Attack -4, Defense +4. 매 라운드 방어 기동에 Stamina 6 이상.'],[3,4,'중립적','능력치 변화 없음.'],[5,6,'공격적','Initiative +2, Attack +4, Defense -4. 매 라운드 공격 기동에 Stamina 6 이상.']]);
  ranges('recovery-status','적의 회복 상태','Enemy Recovery Status','d6',59,[[1,2,'Bloodied'],[3,4,'Cornered'],[5,6,'Overwhelmed']]);
  ranges('hit-humanoid','인간형 명중 부위','Hit Location · Humanoid','d10',60,[[1,1,'발 · 피해 -1'],[2,2,'다리 · 피해 -1'],[3,3,'허리 · 피해 +0'],[4,4,'손 · 피해 +0'],[5,5,'팔 · 피해 +0'],[6,8,'몸통 · 피해 +1'],[9,9,'등 · 피해 +2'],[10,10,'머리 · 피해 +3']]);
  ranges('hit-quadruped','네발·여섯발 명중 부위','Hit Location · Quadruped/Sextuped','d10',60,[[1,2,'뒷다리 · 피해 -1'],[3,6,'앞다리 · 피해 +0'],[7,9,'몸통 · 피해 +2'],[10,10,'머리 · 피해 +3']]);
  ranges('hit-serpentine','뱀형 명중 부위','Hit Location · Serpentine','d10',60,[[1,2,'하체 · 피해 -1'],[3,6,'중앙 · 피해 +0'],[7,9,'상체 · 피해 +2'],[10,10,'머리 · 피해 +3']]);
  list('poison','독의 강도','Poison Potency',4,88,[
    {text:'Poison I',detail:'Wound 1. CON 실패 시 D20라운드(또는 시간트랙 1회 초기화) 안에 해독하지 못하면 사망.'},
    {text:'Poison II',detail:'Wound 1. CON(+5) 실패 시 D20라운드(또는 시간트랙 1회 초기화) 안에 해독하지 못하면 사망.'},
    {text:'Poison III',detail:'CON 판정에 실패하면 Wound 1.'},
    {text:'Poison IV',detail:'CON 판정에 실패하면 Knocked Down. 이미 쓰러졌다면 효과 없음.'}
  ]);
  ranges('age','인물 연령대','Age','d6',240,[[1,2,'젊음'],[3,4,'중년'],[5,6,'노년']]);
  ranges('gender','인물의 성별 표현','Gender','d6',240,[[1,2,'여성적인 외형'],[3,4,'남성적인 외형'],[5,6,'중성적인 외형']]);
  list('information-type','NPC 정보의 성격','NPC Information · Type',20,237,'기회의 상실|위치|PC와의 연관|NPC와의 연관|배경지식|좋은 소식|나쁜 소식|관련된 변화|정체|상실|기회|정신·영적 변화|권력의 획득|권력의 상실|능력의 획득|중요한 통찰|획득|감정적 변화|금전적 변화|지위 변화');
  ranges('information-topic','NPC 정보의 대상','NPC Information · Topic','d20',237,[[1,1,'기업'],[2,2,'행성'],[3,3,'Karum Station'],[4,4,'Àrsaidh 탐사지'],[5,5,'유명한 Deep Diver'],[6,6,'Karum Station Authority'],[7,7,'Àrsaidh 기술'],[8,8,'적 요원'],[9,9,'배신자'],[10,10,'적의 계획'],[11,11,'현재 상황'],[12,12,'현재 상황에 밝은 인물'],[13,13,'후원자'],[14,14,'승무원'],[15,15,'알려지지 않은 세력'],[16,20,'동맹']]);
  list('npc-attributes','NPC 기본 능력치','Random NPC Attributes',6,358,'STR 12 / DEX 10 / CON 12 / WIL 8 / INT 8 / CHA 10|STR 10 / DEX 12 / CON 8 / WIL 10 / INT 10 / CHA 10|STR 8 / DEX 10 / CON 10 / WIL 12 / INT 12 / CHA 8|STR 10 / DEX 10 / CON 10 / WIL 10 / INT 10 / CHA 10|STR 10 / DEX 8 / CON 10 / WIL 10 / INT 10 / CHA 12|STR 9 / DEX 11 / CON 9 / WIL 12 / INT 10 / CHA 9');
  list('creature-drive','생물의 충동','Creature Drive',4,[270,271],[{text:'영역 지배',detail:'처음 만난 구역을 벗어나는 적을 추격하지 않는다.',page:270},{text:'포식',detail:'공격받지 않는 한 쓰러진 상대를 먹는 데 집중한다.',page:270},{text:'파괴',detail:'장비·건물·인물을 가리지 않고 파괴하려 한다.',page:271},{text:'기생',detail:'이 생물에게 상처를 입은 인물은 CON 판정에 실패하면 기생체에 감염된다(86쪽 참조).',page:271}]);
  ranges('intelligence','생물의 지능','Creature Intelligence','d10',271,[[1,7,'동물 수준 · 6−D4'],[8,9,'인간 수준 · 6+D8'],[10,10,'인간 이상 · 12+D8']]);
  ranges('creature-role','생물의 역할','Enemy Role','d10',274,[[1,3,'Brute'],[4,5,'Lurker'],[6,7,'Ranged'],[8,9,'Swarm'],[10,10,'Psychic']]);
  ranges('forelimbs','육상 생물의 앞다리','Fore Limbs · Terrestrial','d10',287,[[1,5,'뒷다리와 같음'],[6,6,'없음'],[7,7,'발톱'],[8,8,'맹금의 발톱'],[9,9,'촉수'],[10,10,'집게']]);
  list('hindlimbs','육상 생물의 뒷다리','Hind Limbs · Terrestrial',6,287,'없음|발톱|발굽|발|맹금의 발톱|촉수');
  list('mouth','생물의 입','Mouth',6,287,'없음|부리|입|촉수|주둥이|코끼리 코');
  ranges('eye-type','생물의 눈 유형','Eyes · Type','d10',287,[[1,2,'없음'],[3,4,'정면을 보는 눈'],[5,6,'옆을 보는 눈'],[7,8,'눈자루'],[9,10,'겹눈']]);
  ranges('eye-count','생물의 눈 수','Eyes · Number','d10',287,[[1,2,'1개'],[3,5,'2개'],[6,7,'4개'],[8,8,'6개'],[9,9,'8개'],[10,10,'10개']]);
  ranges('name-syllables','생물 이름의 음절 수','Number of Syllables','d10',288,[[1,2,'1음절'],[3,6,'2음절'],[7,10,'3음절']]);
  const biomes='황무지|이계|빙결|방사능|무성한 식생|작열|독성|도시 폐허|화산|수역'.split('|');
  list('landing-biome','최초 착륙 생물군계','Landing Biome',10,185,biomes);
  ranges('biome','인접 생물군계','Biome Type','d12',185,[...biomes.map((b,i)=>[i+1,i+1,b]),[11,12,'현재 생물군계와 같음']]);
  const terrain=['위험 지형','복잡 지형','생물 서식지','생물군계 의존','순탄한 길'];
  const terrainRules=['이동에 시간트랙 +1. 각 인물 DEX 실패 시 D20 피해.','통과에 시간트랙 +1.','Local Fauna와 자동 조우.','현재 생물군계별 효과를 적용한다.','장애물이 없고 전투 조우가 일어나지 않는다.'];
  const changes=[[1,0,4,1,2],[3,3,3,0,3],[2,2,0,2,1],[4,4,1,4,0]];
  for(let prev=0;prev<5;prev++)ranges(`terrain-${prev}`,`지형 변화 · 이전 ${terrain[prev]}`,'Terrain Difficulty','d20',192,[[1,10,terrain[prev],terrainRules[prev]],[11,16,terrain[changes[0][prev]],terrainRules[changes[0][prev]]],[17,18,terrain[changes[1][prev]],terrainRules[changes[1][prev]]],[19,19,terrain[changes[2][prev]],terrainRules[changes[2][prev]]],[20,20,terrain[changes[3][prev]],terrainRules[changes[3][prev]]]]);
  list('corporation','기업 소문의 기업','Corporate News · Corporation',20,[348,349],'EcoGen Labs · 제약|Morton Unlimited · 농업|MalCo-Horizon Systems · 무기|Calibrated Applications · 무기|Dawn Holdings · 금융|Frontiers Communications · 통신|RTD Multinational · 통신|McGregor-Chen Advanced · 생명공학|Drake Industries · 전 분야|Omega Logistics · 전 분야|Blue Comet Media · 미디어|Iron Fist Services · 보안|Atlantic Industrial Inc. · 식량·물|One World Network · 미디어|Underwood Technologies · 에너지|Ladder Inc. · 소프트웨어|Carthen Consolidated · 사이버네틱스|Crown Biological · 의료|Terracore Defense · 보안|Evolve Group · 무기');
  list('corporate-news','기업의 소문·뉴스','Corporate News · Rumor',20,[348,349],'정치 스캔들|경쟁사에 인수될 예정|대규모 해고|아동 노동 혐의|경쟁사 인수|부패|언론 탄압|대규모 채용|주가 폭락|CEO 해고|노동자 파업|대규모 확장 준비|재판 중|CEO 피살|강제 노동 사용|새 제품·서비스 발표 예정|다른 기업과 전쟁 중|테러리스트의 표적|UN과 대립|민간인 사망과 연관됨');
  define('cover','전투 엄폐 배치','Random Cover','d20',[47,48,49,50,51],Array.from({length:20},(_,i)=>({min:i+1,max:i+1,text:`엄폐 배치 ${i+1}`,detail:'흰색: 완전 엄폐 / 빗금: 부분 엄폐 / 어두운 칸: 엄폐 없음.',image:`/maps/cover-${i+1}.png`,page:47+Math.floor(i/4)})));
  ranges('toxic-globe','독성 지대의 금속 구체','Toxic Biome · Metal Globe','d20',211,[[1,10,'구체 표면에 인접 헥스의 내용이 드러남'],[11,19,'에너지 폭발 · 임의 인물에게 2D20 피해'],[20,20,'금속 건틀릿 발견','착용자의 몸에 맞춰지며 20피트 거리의 비치볼보다 작거나 같은 금속 물체를 움직일 수 있다.']]);
  ranges('carousing-jewelry','유흥 후 발견한 장신구','Carousing · Jewelry','d6',335,[[1,2,'반지'],[3,4,'목걸이'],[5,6,'귀걸이']]);
  list('mood','NPC의 전반적 감정','How Are They Feeling',8,246,'알기 어려움|놀람|혐오|좋지 않음|슬픔|두려움|행복|분노');
  const moods={
    2:[['깜짝 놀람','Startled','충격 / Shocked','낙담 / Dismayed'],['혼란','Confused','환멸 / Disillusioned','어리둥절 / Perplexed'],['경이','Amazed','경외 / Awed','깜짝 놀람 / Astonished'],['흥분','Excited','열망 / Eager','활력 / Energetic']],
    3:[['못마땅함','Disapproving','비판적 / Judgemental','당혹 / Embarrassed'],['실망','Disappointed','경악 / Appalled','역겨움 / Revolted'],['끔찍함','Awful','메스꺼움 / Nauseated','혐오 / Detesting'],['거부감','Repelled','공포 / Horrified','주저함 / Hesitant']],
    4:[['피로','Tired','졸림 / Sleepy','집중 불가 / Unfocused'],['스트레스','Stressed','압도됨 / Overwhelmed','통제 상실 / Out of Control'],['분주함','Busy','압박 / Pressured','조급함 / Rushed'],['지루함','Bored','무관심 / Indifferent','무감동 / Apathetic']],
    5:[['외로움','Lonely','고립 / Isolated','버림받음 / Abandoned'],['취약함','Vulnerable','피해 의식 / Victimized','연약함 / Fragile'],['절망','Despairing','비탄 / Grief-Stricken','무력 / Powerless'],['죄책감','Guilty','수치 / Ashamed','후회 / Remorseful'],['우울','Depressed','공허 / Empty','열등감 / Inferior'],['상처받음','Hurt','당혹 / Embarrassed','실망 / Disappointed']],
    6:[['겁먹음','Scared','속수무책 / Helpless','공포 / Frightened'],['불안','Anxious','압도됨 / Overwhelmed','걱정 / Worried'],['불안정함','Insecure','부적절함 / Inadequate','열등감 / Inferior'],['약함','Weak','무가치함 / Worthless','하찮음 / Insignificant'],['거절당함','Rejected','배제 / Excluded','박해 / Persecuted'],['위협받음','Threatened','긴장 / Nervous','노출됨 / Exposed']],
    7:[['장난기','Playful','흥분 / Aroused','짓궂음 / Cheeky'],['만족','Content','해방감 / Free','기쁨 / Joyful'],['관심','Interested','호기심 / Curious','탐구심 / Inquisitive'],['자부심','Proud','성공 / Successful','자신감 / Confident'],['인정받음','Accepted','존중 / Respected','소중함 / Valued'],['평온','Peaceful','창의 / Creative','애정 / Loving'],['신뢰','Trusting','섬세함 / Sensitive','친밀 / Intimate'],['낙관','Optimistic','희망 / Hopeful','영감 / Inspired']],
    8:[['실망감','Let Down','배신감 / Betrayed','분개 / Resentful'],['굴욕','Humiliated','무시당함 / Disrespected','조롱당함 / Ridiculed'],['쓰라림','Bitter','분개 / Indignant','침해당함 / Violated'],['격분','Mad','격노 / Furious','질투 / Jealous'],['공격성','Aggressive','도발당함 / Provoked','적의 / Hostile'],['좌절','Frustrated','격노 / Infuriated','짜증 / Annoyed'],['거리감','Distant','위축 / Withdrawn','무감각 / Numb'],['비판적','Critical','회의 / Skeptical','일축 / Dismissive']]
  };
  for(const [key,rows] of Object.entries(moods)){
    const page=Number(key)<5?246:247;
    list(`mood-${key}`,`${tables.mood.rows[key-1].text} · 세부 감정`,'NPC Emotion',rows.length,page,rows.map(r=>`${r[0]} / ${r[1]}`));
    rows.forEach((r,i)=>{
      const id=`mood-${key}-${i+1}`;
      ranges(id,`${r[0]} · 감정의 뿌리`,r[1],'d4',page,[[1,2,r[2]],[3,4,r[3]]]);
      if(key==='8'&&i===1){tables[id].rollable=false;tables[id].sourceNote='원문 p.247은 Disrespected와 Ridiculed의 범위를 모두 1–2로 표기합니다. 자동 확률을 추정하지 않고 직접 선택하도록 남겼습니다.';tables[id].rows[1].min=1;tables[id].rows[1].max=2;}
    });
  }
  if(tables.daylight){tables.daylight.rows.find(r=>r.min===16).detail='원문 p.189 자체에 −00 hours로 인쇄되어 있어 값을 추정하지 않았습니다. 플레이어가 직접 해석하세요.';}
}
