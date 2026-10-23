import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAppearanceRows,backgroundLabel,footerLabel} from './workspace-appearance';

test('appearance columns support all, none, invert and both alternating patterns',()=>{
  const ids=['one','two','three','four','five'];
  assert.deepEqual([...selectAppearanceRows(ids,new Set(),'all')],ids);
  assert.deepEqual([...selectAppearanceRows(ids,new Set(ids),'none')],[]);
  assert.deepEqual([...selectAppearanceRows(ids,new Set(['two','four']),'invert')],['one','three','five']);
  assert.deepEqual([...selectAppearanceRows(ids,new Set(),'odd')],['one','three','five']);
  assert.deepEqual([...selectAppearanceRows(ids,new Set(),'even')],['two','four']);
  assert.deepEqual([...selectAppearanceRows([],new Set(['absent']),'invert')],[]);
});
test('selection leaves the independent source sets untouched and ignores stale IDs',()=>{
  const bg=new Set(['one','stale']),footer=new Set(['two']);
  const next=selectAppearanceRows(['one','two','three'],bg,'invert');
  assert.deepEqual([...next],['two','three']);assert.deepEqual([...bg],['one','stale']);assert.deepEqual([...footer],['two']);
});
test('appearance choices have readable descriptions',()=>{
  assert.equal(backgroundLabel({bg:'malla_diagonal',padding:'15px',layers:''}),'malla diagonal');
  assert.equal(backgroundLabel({bg:'color_solido',bgColor:'#5d428c',padding:'15px',layers:''}),'Morado Anáhuac');
  assert.equal(footerLabel({type:'solido',blockColor:'morado',logoColor:'naranja',logoId:6}),'Sólido · morado · logo 6');
});
