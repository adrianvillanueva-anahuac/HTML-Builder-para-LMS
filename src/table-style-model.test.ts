import test from 'node:test';
import assert from 'node:assert/strict';
import {tableStyles,tableStyle,tableRadius,tableCellPositions} from './table-style-model';
test('conserva cuatro estilos y añade tres variantes distintas',()=>{
  assert.equal(tableStyles.length,7);assert.equal(new Set(tableStyles.map(s=>s.id)).size,7);
  for(const id of ['standard','striped','borderless','anahuac','purple','soft','first-column'])assert.equal(tableStyle(id).id,id);
  assert.equal(tableStyle('unknown').id,'standard');
});
test('radio serializable y acotado entre cero y cuarenta',()=>{
  for(const [value,expected] of [[undefined,0],['24',24],[-5,0],[70,40],['bad',0],[12.7,13]] as const)assert.equal(tableRadius(value),expected);
});
test('localiza las esquinas de celdas combinadas',()=>{
  const cell=(colSpan=1,rowSpan=1)=>({colSpan,rowSpan});
  const result=tableCellPositions([[cell(2),cell()],[cell(1,2),cell(),cell()],[cell(2)]]);
  assert.equal(result.columns,3);assert.equal(result.rows,3);
  assert.deepEqual(result.positions[2],{row:1,col:0,rowEnd:3,colEnd:1});
  assert.deepEqual(result.positions.at(-1),{row:2,col:1,rowEnd:3,colEnd:3});
});
test('rowspan cero cubre hasta la última fila',()=>{
  assert.deepEqual(tableCellPositions([[{colSpan:1,rowSpan:0}],[{colSpan:1,rowSpan:1}]]).positions[0],{row:0,col:0,rowEnd:2,colEnd:1});
});
