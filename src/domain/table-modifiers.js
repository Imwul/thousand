export const MODIFIED_TABLES = new Set(['injury','recovery-status','hit-humanoid','hit-quadruped','hit-serpentine']);
export const modifierNote = id => id==='injury'
  ? '예: Vicious +2. 자연 1은 보정과 관계없이 치명적 부상입니다(p.74).'
  : id==='recovery-status' ? '예: Overwhelm +3. 적 카드에 적힌 해당 상태의 반응을 적용하세요.'
  : '예: Targeted Strikes 또는 Brute·Ranged 역할의 명중 부위 보정. 현재 공격에 해당하는 보정만 입력하세요.';
export function validateModifier(id,value){
  if(!Number.isInteger(value)||value < -20||value > 20||(!MODIFIED_TABLES.has(id)&&value!==0))throw new Error('표 보정은 지원하는 전투 표에 −20부터 +20까지 입력하세요.');
  return value;
}
