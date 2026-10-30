export function random() {
  const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]/4294967296;
}
export function die(sides,rng=random) {
  if(!Number.isInteger(sides)||sides<2||sides>100) throw new Error('지원하지 않는 주사위입니다.');
  const v=rng(); if(!Number.isFinite(v)||v<0||v>=1) throw new Error('난수는 0 이상 1 미만이어야 합니다.');
  return Math.floor(v*sides)+1;
}
export function diceDomain(notation) {
  if(notation==='d66') return Array.from({length:36},(_,i)=>(Math.floor(i/6)+1)*10+i%6+1);
  if(notation==='d8×d8') return Array.from({length:64},(_,i)=>(Math.floor(i/8)+1)*10+i%8+1);
  if(!/^d(4|6|8|10|12|20|100)$/.test(notation)) throw new Error('주사위 표기를 확인하세요.');
  return Array.from({length:Number(notation.slice(1))},(_,i)=>i+1);
}
export function rollDice(notation,rng=random) {
  diceDomain(notation);
  if(notation==='d66'||notation==='d8×d8') {
    const s=notation==='d66'?6:8, values=[die(s,rng),die(s,rng)];
    return {notation,values,value:values[0]*10+values[1]};
  }
  const value=die(Number(notation.slice(1)),rng);return {notation,values:[value],value};
}
export function lookup(table,value) {
  if(!diceDomain(table.dice).includes(value)) throw new Error('주사위 범위 밖의 값입니다.');
  const rows=table.rows.filter(r=>r.min<=value&&r.max>=value);
  if(rows.length!==1) throw new Error(`${table.id}: 원문 범위에 빠짐 또는 중복이 있습니다.`);
  return rows[0];
}
