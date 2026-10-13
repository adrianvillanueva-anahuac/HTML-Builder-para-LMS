import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exposedCorners,sharedStrokeFactors,setAllCellColors,createModularCell,activateAllCells,clearAllCells} from './modular-model';

test('activar todos completa solo los espacios vacíos y conserva contenido existente',()=>{
  const m=createModular(2,3);m.defaultColor='#ff5900';m.defaultRadius=20;
  const existing={...createModularCell(m),html:'<b>Conservar</b>',color:'#5d428c',student:true};
  m.cells['0:0']=existing;
  activateAllCells(m);
  assert.equal(Object.keys(m.cells).length,6);
  assert.equal(m.cells['0:0'],existing);
  assert.equal(m.cells['1:2'].color,'#ff5900');
  assert.equal(m.cells['1:2'].radius,20);
  activateAllCells(m);
  assert.equal(Object.keys(m.cells).length,6);
  assert.equal(m.cells['0:0'].html,'<b>Conservar</b>');
});

test('quitar todos limpia dependencias sin cambiar retícula ni estilos generales',()=>{
  const m=createModular(2,2);m.rows=[140,180];m.columns=[1,2];m.gap=0;m.margin=10;
  m.stroke={width:2,color:'#ff5900'};m.defaultColor='#5d428c';
  activateAllCells(m);
  m.connections=[{from:'0:0',to:'0:1',direction:'both',fill:'#fff',stroke:'#000',dotted:false}];
  m.centers={'0:0':{shape:'circle',color:'#fff',size:80,front:true,text:'Centro'}};
  const before=JSON.parse(JSON.stringify(m));
  clearAllCells(m);
  assert.deepEqual(m,{...before,cells:{},connections:[],centers:{}});
  activateAllCells(m);
  assert.equal(Object.keys(m.cells).length,4);
  assert.equal(m.cells['0:0'].color,'#5d428c');
});

test('bordes compartidos suman un solo grosor y los bordes libres lo conservan',()=>{
  const m=createModular(2,2);
  for(const key of ['0:0','0:1','1:0','1:1'])m.cells[key]=createModularCell(m);
  assert.deepEqual(sharedStrokeFactors(m,'0:0'),[1,0,0,1]);
  assert.equal(sharedStrokeFactors(m,'0:0')[1]+sharedStrokeFactors(m,'0:1')[3],1);
  assert.equal(sharedStrokeFactors(m,'0:0')[2]+sharedStrokeFactors(m,'1:0')[0],1);
  removeCell(m,'0:1');
  assert.equal(sharedStrokeFactors(m,'0:0')[1],1);
});

test('relleno general conserva texto y estilos, y se hereda al crear rectángulos',()=>{
  const m=createModular(1,3);
  m.cells['0:0']={...createModularCell(m),html:'<b>Texto</b>',verticalAlign:'end'};
  m.cells['0:1']=createModularCell(m);
  setAllCellColors(m,'#ff5900');
  assert.equal(m.cells['0:0'].html,'<b>Texto</b>');
  assert.equal(m.cells['0:0'].verticalAlign,'end');
  assert.equal(m.cells['0:1'].color,'#ff5900');
  assert.equal(m.cells['0:2'],undefined);
  assert.equal(createModularCell(m).color,'#ff5900');
  assert.equal(createModularCell(m).verticalAlign,'center');
  assert.equal(JSON.parse(JSON.stringify(m)).defaultColor,'#ff5900');
});

test('separación cero conserva solo las esquinas exteriores de celdas ocupadas',()=>{
  const m=createModular(3,3);
  const cell={html:'',color:'#fff',radius:12,padding:0};
  m.cells['1:1']={...cell};
  assert.deepEqual(exposedCorners(m,'1:1'),[true,true,true,true]);
  m.cells['1:2']={...cell};
  assert.deepEqual(exposedCorners(m,'1:1'),[true,false,false,true]);
  m.cells['2:1']={...cell};
  assert.deepEqual(exposedCorners(m,'1:1'),[true,false,false,false]);
  m.cells['0:1']={...cell};m.cells['1:0']={...cell};
  assert.deepEqual(exposedCorners(m,'1:1'),[false,false,false,false]);
  removeCell(m,'1:0');removeCell(m,'0:1');
  assert.deepEqual(exposedCorners(m,'1:1'),[true,false,false,false]);
});
import {createModular,neighbors,removeCell,removeLastTrack,resizeColumns,modularPalette,modularTextColor,centerGroups} from './modular-model';

test('figuras centrales requieren cuatro vecinos y admiten cruces adyacentes',()=>{
  const m=createModular(2,3);
  for(const key of ['0:0','0:1','0:2','1:0','1:1'])m.cells[key]={html:'',color:'#fff',radius:0,padding:0};
  assert.deepEqual(centerGroups(m),['0:0']);
  m.cells['1:2']={html:'',color:'#fff',radius:0,padding:0};
  assert.deepEqual(centerGroups(m),['0:0','0:1']);
  m.centers={'0:0':{shape:'diamond',color:'#ff5900',size:100,front:false,text:'Centro'}};
  assert.deepEqual(JSON.parse(JSON.stringify(m)).centers,m.centers);
  removeCell(m,'1:0');assert.deepEqual(m.centers,{});
  assert.deepEqual(centerGroups(m),['0:1']);
  removeLastTrack(m,'row');assert.deepEqual(centerGroups(m),[]);
});

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
