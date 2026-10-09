import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createModular,neighbors,removeCell,removeLastTrack,resizeColumns,modularPalette,modularTextColor} from './modular-model';

test('quitar filas y columnas elimina sus conexiones y conserva una retícula mínima',()=>{
  const m=createModular(2,2);
  for(const key of ['0:0','0:1','1:0'])m.cells[key]={html:key,color:'#fff',radius:6,padding:12};
  m.connections=[{from:'0:0',to:'0:1',direction:'both',fill:'#fff',stroke:'#fff',dotted:false}];
  removeLastTrack(m,'column');assert.equal(m.columns.length,1);assert.equal(m.connections.length,0);assert.equal(m.cells['0:1'],undefined);
  removeLastTrack(m,'row');assert.deepEqual(Object.keys(m.cells),['0:0']);
  removeLastTrack(m,'row');removeLastTrack(m,'column');assert.equal(m.rows.length,1);assert.equal(m.columns.length,1);
});
test('paleta institucional con contraste predeterminado editable',()=>{
  for(const c of ['#ff5900','#5d428c','#646464'])assert.equal(modularTextColor(c),'#ffffff');
  for(const c of ['#ffffff','#cdd5dc'])assert.equal(modularTextColor(c),'#ff5900');
  for(const c of modularPalette.slice(5))assert.equal(modularTextColor(c.value),'#333333');
});
test('retícula entre 1×1 y 10×10',()=>{
  assert.equal(createModular(0,30).rows.length,1);assert.equal(createModular(0,30).columns.length,10);
  assert.equal(createModular(10,10).rows.length*createModular(10,10).columns.length,100);
});
test('conexiones solo entre vecinos ocupados y sin diagonales ni duplicados',()=>{
  const m=createModular(2,2);for(const k of ['0:0','0:1','1:1'])m.cells[k]={html:'',color:'#fff',radius:0,padding:0};
  assert.deepEqual(neighbors(m),[['0:0','0:1'],['0:1','1:1']]);
  m.connections=[{from:'0:0',to:'0:1',direction:'both',fill:'#fff',stroke:'#000',dotted:true}];
  removeCell(m,'0:1');assert.equal(m.connections.length,0);assert.equal(neighbors(m).length,0);
});
test('redimensionar columnas conserva ancho total y limita mínimos',()=>{
  assert.deepEqual(resizeColumns([1,1,1],0,100,600),[1.5,.5,1]);
  const widths=resizeColumns([1,1],0,9999,200);
  assert.equal(widths.reduce((a,b)=>a+b,0),2);assert.ok(widths[1]>=.39);
});
test('serialización conserva estilos, texto y conexión sin dirección',()=>{
  const m=createModular(1,2);m.margin=20;m.gap=50;m.cells['0:0']={html:'<b>Texto</b>',color:'#ff5900',radius:20,padding:18,verticalAlign:'center',student:true};
  m.connections.push({from:'0:0',to:'0:1',direction:'none',fill:'#fff',stroke:'#000',dotted:false});
  assert.deepEqual(JSON.parse(JSON.stringify(m)),m);
});
