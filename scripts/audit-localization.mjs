import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tableList,tables} from '../src/data/tables.js';
import {KOREAN_ROWS} from '../src/data/localization.js';
import {PROPER_NAME_TABLES} from '../src/data/glossary.js';

const raw=JSON.parse(await readFile(new URL('../src/data/extra-tables.json',import.meta.url),'utf8'));
const originals=new Map(raw.map(t=>[t.id,t]));
const countTokens=text=>{
  const counts=new Map();
  for(const token of text.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)??[]){const value=token.replaceAll(',','');counts.set(value,(counts.get(value)??0)+1);}
  return counts;
};
const missing=[],untranslated=[];let translatedRows=0;
for(const [id,translations] of Object.entries(KOREAN_ROWS)){
  const t=tables[id];assert.equal(translations.length,t.rows.length,id);
  translations.forEach((text,i)=>{
    const source=originals.get(id)?.rows[i];
    if(source){
      assert.equal(source.min,t.rows[i].min,`${id}: source row order`);
      assert.equal(source.max,t.rows[i].max,`${id}: source row range`);
      assert.equal(source.text,t.rows[i].key,`${id}: canonical key`);
      const before=countTokens(source.text+' '+(source.detail??'')),after=countTokens(text);
      for(const [token,count] of before)if((after.get(token)??0)<count)missing.push({id,min:source.min,token,expected:count,actual:after.get(token)??0});
      const dice=(source.text+' '+(source.detail??'')).match(/\b\d*[dD]\d+\b/g)??[];
      for(const die of dice)assert.ok(text.toLowerCase().includes(die.toLowerCase()),`${id}/${source.min}: lost ${die}`);
    }
    translatedRows++;
  });
}
const properValues=new Set(['Àrsaidh','KSA','Karum Station','Karum Station Authority']);
for(const t of tableList)for(const r of t.rows){
  if(PROPER_NAME_TABLES.has(t.id)||properValues.has(r.text))continue;
  const formula=r.text.replace(/\b(?:STR|DEX|CON|WIL|INT|CHA)\b/g,'').replace(/[\d\s+\-−/.,]/g,'');
  if(/[A-Za-z]/.test(r.text)&&!/[가-힣]/.test(r.text)&&formula)untranslated.push({id:t.id,min:r.min,text:r.text});
  if(r.detail&&/[A-Za-z]/.test(r.detail)&&!/[가-힣]/.test(r.detail))untranslated.push({id:t.id,min:r.min,detail:r.detail});
}
const report={tables:tableList.length,localizedTables:Object.keys(KOREAN_ROWS).length,translatedRows,missingNumericTokens:missing,untranslatedProse:untranslated};
console.log(JSON.stringify(report,null,2));
assert.deepEqual(missing,[],'A numeric effect was lost in localization');
assert.deepEqual(untranslated,[],'Unexpected English-only result prose remains');
