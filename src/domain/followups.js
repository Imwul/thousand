// Only offer a branch once its prerequisite result exists. The player resolves sheet checks.
const has=(run,id,value)=>run.items?.some(item=>item.tableId===id&&item.roll===value);
export const FOLLOWUPS=[
  {id:'stela',label:'기둥에 다가간다',condition:'다가간 인물의 행운 +1 또는 −1 · 각각 50%',page:168,when:r=>has(r,'fixed-event',15)},
  {id:'metal-box',label:'금속 상자를 연다',condition:'유물 또는 폭발 · 각각 50%',page:168,when:r=>has(r,'fixed-event',16)},
  {id:'security-alarm',label:'Technology 실패 · 조우 생성',condition:'경보를 끄는 Technology 판정에 실패했을 때',page:164,when:r=>has(r,'security',1)},
  {id:'door-alarm',label:'경보 해제 실패 · 조우 생성',condition:'경보문의 경보를 끄는 Technology 판정에 실패했을 때',page:157,when:r=>has(r,'door',1)&&!r.lockAttempt},
  {id:'water-predators',label:'Perception 실패 · 정예 조우',condition:'대원 누구도 Perception 판정에 성공하지 못했을 때',page:217,when:r=>has(r,'biome-hazards-10',9)},
  {id:'dread-trauma',label:'Resolve 실패 · 트라우마 효과',condition:'공포에 지정된 대원이 Resolve 판정에 실패했을 때',page:161,when:r=>has(r,'dread',12)},
  {id:'injury-trauma',label:'트라우마 효과 굴리기',condition:'부상으로 트라우마를 받았을 때 적용할 효과',page:77,when:r=>has(r,'injury',19)},
  {id:'artifact-trauma',label:'트라우마 효과 굴리기',condition:'유물 활성화로 받은 트라우마의 효과',page:152,when:r=>has(r,'artifact-activation',11)},
  {id:'toxic-marsh',label:'독성 늪을 건넌다',condition:'공기 여과 장치 고장 확률 1/6',page:211,when:r=>has(r,'biome-hazards-7',3)}
];
export const followupChoices=run=>run?FOLLOWUPS.filter(choice=>choice.when(run)):[];

// Extract complete arithmetic expressions rather than rolling every die mentioned automatically.
export function effectDice(run){
  if(!run||run.procedureId==='dice')return [];
  const pattern=/(?<![\w])(?:\d+\s*[+−-]\s*)?\d*[dD](?:100|20|12|10|8|6|4)(?!\d)(?:\s*[+−-]\s*(?:\d*[dD](?:100|20|12|10|8|6|4)(?!\d)|\d+))*(?:\s*[×x*]\s*\d+)?/g;
  const seen=new Set(),out=[];
  for(const item of (run.items??[]).filter(item=>item.effectDice!==false&&item.title!=='역할 참조'))for(const match of `${item.text??''} ${item.detail??''}`.matchAll(pattern)){
    const expression=match[0].replace(/\s/g,'').replace(/−/g,'-').toLowerCase();
    if(seen.has(expression))continue;
    seen.add(expression);out.push({expression,label:expression.toUpperCase(),source:item.title});
  }
  return out;
}
