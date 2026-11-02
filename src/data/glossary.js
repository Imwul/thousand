// Editorial readings; original names remain available for rulebook lookup.
export const CREATURE_LABELS={
  Guardian:'수호자(Guardian)',Aberration:'변이체(Aberration)',Synthetic:'합성체(Synthetic)',
  'Local Fauna':'토착 생물(Local Fauna)',Abomination:'괴생명체(Abomination)',
  Spitter:'스피터(Spitter)',Clobber:'클로버(Clobber)',Taker:'테이커(Taker)',
  Psybane:'사이베인(Psybane)',Bomber:'봄버(Bomber)',Cecaelia:'세케일리아(Cecaelia)',
  Titan:'타이탄(Titan)',Anansi:'아난시(Anansi)',Arash:'아라시(Arash)',Brahmari:'브라마리(Brahmari)',
  Brute:'돌격형(Brute)',Lurker:'잠복형(Lurker)',Ranged:'원거리형(Ranged)',Swarm:'군집형(Swarm)',Psychic:'초능력형(Psychic)'
};
export const creatureLabel=name=>CREATURE_LABELS[name]??name;
const glossary={
  ...CREATURE_LABELS,'Ranged Weapon':'원거리 무기','Ranged Weapons':'원거리 무기',
  'Ranged Combat':'원거리 전투(Ranged Combat)','Close Combat':'근접 전투(Close Combat)',
  'Àrsaidh Technology':'Àrsaidh 기계공학(Àrsaidh Technology)',
  'Oxygen Pellet':'산소 펠릿','Oxygen Tank':'산소 탱크','Gear Slot':'장비 칸',
  'Negative Trait':'부정적 특성','Site Report':'탐사지 보고서','Time Track':'시간트랙',
  'Medical Aid':'응급처치(Medical Aid)','Emotional State':'감정 상태','Stress Reaction':'스트레스 반응',
  'Black Cypher':'블랙 사이퍼(Black Cypher)',Cypher:'사이퍼(Cypher)',
  Wounds:'상처',Wound:'상처',Stamina:'기력',Stress:'스트레스',Luck:'행운',
  Awareness:'경계',Armor:'장갑',Defense:'방어',Attack:'공격',Initiative:'주도권',
  Resolve:'정신 저항(Resolve)',Perception:'지각(Perception)',Technology:'기계공학(Technology)',
  Stealth:'은신(Stealth)',Science:'과학(Science)',Survival:'생존(Survival)',
  Talent:'재능',Skill:'기술',Attribute:'능력치',Conditions:'상태 이상',Condition:'상태 이상',
  Supplies:'보급품',Battery:'배터리',Ammo:'탄약',Light:'소형',
  Composed:'침착(Composed)',Cautious:'신중함(Cautious)',Demanding:'까다로움(Demanding)',
  Normal:'보통',Hard:'어려움(Hard)',Easy:'쉬움',Elite:'정예',
  Tough:'강인함(Tough)',Trauma:'트라우마',Taints:'오염',Taint:'오염',Dread:'공포 사건',
  'Knocked Down':'넘어짐(Knocked Down)',Poisoned:'중독(Poisoned)',Blinded:'실명(Blinded)',
  Bloodied:'피투성이(Bloodied)',Cornered:'궁지에 몰림(Cornered)',Overwhelmed:'압도됨(Overwhelmed)',
  advantage:'유리함(Advantage)',disadvantage:'불리함(Disadvantage)',Hacking:'해킹(Hacking)'
};
const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const termPattern=new RegExp('\\b('+Object.keys(glossary).sort((a,b)=>b.length-a.length).map(escapeRe).join('|')+')\\b','g');
function insideEnglishGloss(whole,offset,length){
  let depth=0,start=-1;
  for(let i=0;i<offset;i++){
    if(whole[i]==='('){depth++;start=i;}
    else if(whole[i]===')')depth=Math.max(0,depth-1);
  }
  if(depth<1||start<0)return false;
  let nested=0,end=-1;
  for(let i=start;i<whole.length;i++){
    if(whole[i]==='(')nested++;
    else if(whole[i]===')'&&--nested===0){end=i;break;}
  }
  if(end<offset+length)return false;
  const inside=whole.slice(start+1,end);
  return /[A-Za-zÀ-ÿ]/.test(inside)&&!/[가-힣]/.test(inside);
}
export function localizeTerms(text=''){
  return String(text).replace(termPattern,(term,_,offset,whole)=>{
    // Keep the original spelling of a name that is already shown beside its Korean reading.
    if(whole[offset-1]==='('&&whole[offset+term.length]===')')return term;
    if(insideEnglishGloss(whole,offset,term.length))return term;
    return glossary[term];
  });
}
export const PROPER_NAME_TABLES=new Set(['given-name','surname','ship-name','ship-adjective',
  'site-name-1','site-name-2','site-name-3','planet-name-1','planet-name-2','planet-name-3']);
const readings={
  Ael:'아엘',Ar:'아르',At:'아트',Af:'아프',Am:'암',Ain:'아인',Bo:'보',Baf:'바프',Bet:'베트',Bin:'빈',Buk:'부크',Bon:'본',Bru:'브루',Cal:'칼',Cor:'코르',Cen:'센',Col:'콜',De:'데',Dra:'드라',Din:'딘',Deo:'데오',Dak:'다크',Dot:'도트',Er:'에르',Eo:'에오',Eni:'에니',Eto:'에토',Eal:'에알',Eth:'에스',Emi:'에미',Eos:'에오스',Foh:'포',Fel:'펠',Fan:'판',Fri:'프리',Fik:'피크',Faw:'포',Flo:'플로',Gru:'그루',Gon:'곤',Gas:'가스',Gy:'기',Gli:'글리',Gea:'게아',Got:'고트',Hun:'훈',Hol:'홀',Hra:'흐라',Hib:'히브',Had:'하드',
  Hu:'후',Has:'하스',Hof:'호프',Hev:'헤브',Io:'이오',Im:'임',Ir:'이르',Iok:'이오크',Iv:'이브',Ix:'익스',Jo:'조',Je:'제',Jun:'준',Jas:'자스',Jho:'조',Jen:'젠',Jiv:'지브',Jox:'족스',Jer:'제르',Jis:'지스',Kro:'크로',Ke:'케',Kal:'칼',Koe:'코에',Klu:'클루',Kyn:'킨',Kva:'크바',Kol:'콜',Kes:'케스',Kut:'쿠트',Kso:'크소',Kae:'카에',Kib:'키브',Li:'리',Lon:'론',Ler:'레르',La:'라',Loy:'로이',Lun:'룬',Les:'레스',Lam:'람',Lef:'레프',Luz:'루즈',Lop:'로프',Mo:'모',Met:'메트',Maf:'마프',Mig:'미그',Mox:'목스',
  Mus:'무스',Myn:'민',Med:'메드',Mol:'몰',Mec:'메크',Nio:'니오',Nu:'누',Ner:'네르',Nas:'나스',Or:'오르',Otu:'오투',Owa:'오와',Ogi:'오기',Ofe:'오페',Ovy:'오비',Olo:'올로',Oma:'오마',Pro:'프로',Pem:'펨',Pas:'파스',Pu:'푸',Puc:'푸크',Pyf:'피프',Piz:'피즈',Qu:'쿠',Reo:'레오',Rin:'린',Ra:'라',Rol:'롤',Se:'세',Sov:'소브',Sag:'사그',Siz:'시즈',Suf:'수프',To:'토',Til:'틸',Tra:'트라',Tuv:'투브',Uo:'우오',Un:'운',Ven:'벤',Vo:'보',Vas:'바스',Xa:'자',Xon:'존',Yeo:'여',Yl:'일',Yt:'이트',Zas:'자스',Zo:'조'
};
export const syllableReading=s=>readings[s]??s;
export const creatureName=parts=>`${parts.map(syllableReading).join('')}(${parts.join('')})`;
