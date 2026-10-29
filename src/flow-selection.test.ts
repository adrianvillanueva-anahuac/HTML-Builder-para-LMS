import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,addFlowNode,addFlowEdge,addFlowLane} from './flow-model';
import {selectFlowItem,reconcileFlowSelection,flowSelectionItems,flowSelectionField,applyFlowSelectionPatch,removeFlowSelection,type FlowSelection} from './flow-selection';

test('Shift agrega y quita solo el mismo tipo; el último elemento deselecciona',()=>{
  const first=selectFlowItem(null,'node','one');
  const extended=selectFlowItem(first,'node','two',true);
  assert.deepEqual(extended,{kind:'node',ids:['one','two']});
  assert.deepEqual(first,{kind:'node',ids:['one']});
  assert.deepEqual(selectFlowItem(extended,'node','one',true),{kind:'node',ids:['two']});
  assert.equal(selectFlowItem(first,'node','one',true),null);
  assert.deepEqual(selectFlowItem(extended,'node','two'),{kind:'node',ids:['two']});
  assert.deepEqual(selectFlowItem(extended,'edge','link',true),{kind:'edge',ids:['link']});
  assert.deepEqual(selectFlowItem({kind:'node',ids:['one','one']},'node','two',true),{kind:'node',ids:['one','two']});
});

test('selección reconcilia identificadores obsoletos, elimina duplicados y mantiene orden',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'decision');
  const selection:FlowSelection={kind:'node',ids:[b.id,'missing',a.id,b.id]};
  assert.deepEqual(flowSelectionItems(model,selection),[b,a]);
  assert.deepEqual(reconcileFlowSelection(model,selection),{kind:'node',ids:[b.id,a.id]});
  assert.equal(reconcileFlowSelection(model,{kind:'edge',ids:[a.id]}),null);
  assert.deepEqual(flowSelectionItems(model,null),[]);
});

test('campos mixtos no proveen valores engañosos y cambios masivos preservan todo lo no tocado',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'decision'),other=addFlowNode(model,'text');
  Object.assign(a,{text:'A',fill:'#ff5900',stroke:'#646464',fontSize:18});
  Object.assign(b,{text:'B',fill:'#5d428c',stroke:'#cdd5dc',fontSize:18});
  const selection:FlowSelection={kind:'node',ids:[a.id,b.id]},untouched=JSON.stringify(other);
  assert.deepEqual(flowSelectionField(model,selection,'fill'),{value:undefined,mixed:true,count:2});
  assert.deepEqual(flowSelectionField(model,selection,'fontSize'),{value:18,mixed:false,count:2});
  assert.deepEqual(flowSelectionField(model,null,'fill'),{value:undefined,mixed:false,count:0});
  assert.equal(applyFlowSelectionPatch(model,selection,{fontSize:24,fill:undefined}),true);
  assert.equal(a.fontSize,24);assert.equal(b.fontSize,24);
  assert.equal(a.fill,'#ff5900');assert.equal(b.fill,'#5d428c');
  assert.equal(a.text,'A');assert.equal(b.text,'B');assert.equal(a.stroke,'#646464');assert.equal(b.stroke,'#cdd5dc');
  assert.equal(JSON.stringify(other),untouched);assert.equal(model.nodes[0],a);assert.equal(model.nodes[1],b);
  assert.equal(applyFlowSelectionPatch(model,selection,{fontSize:24}),false);
});

test('aplicar un campo a múltiples figuras normaliza límites sin pisar estados mixtos de otros campos',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process',800,500),b=addFlowNode(model,'decision',300,100);
  a.radius=40;b.radius=8;a.fill='#ff5900';b.fill='#5d428c';
  const selection:FlowSelection={kind:'node',ids:[a.id,b.id]};
  assert.equal(applyFlowSelectionPatch(model,selection,{width:4000,fontSize:9999,id:'replace',from:'replace',label:'wrongkind'}),true);
  assert.equal(a.width,model.width);assert.equal(b.width,model.width);assert.equal(a.x,0);assert.equal(b.x,0);
  assert.equal(a.fontSize,72);assert.equal(b.fontSize,72);assert.equal(a.fill,'#ff5900');assert.equal(b.fill,'#5d428c');
  assert.notEqual(a.id,'replace');assert.ok(!('label' in a));
  assert.equal(applyFlowSelectionPatch(model,selection,{id:'replace',height:undefined}),false);
  assert.equal(applyFlowSelectionPatch(model,null,{fontSize:20}),false);
});

test('editar conexiones en lote preserva rutas, colores y extremos individuales no tocados',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'process'),c=addFlowNode(model,'process');
  const first=addFlowEdge(model,a.id,b.id,{route:'curve',color:'#ff5900',label:'Sí'})!,second=addFlowEdge(model,b.id,c.id,{route:'straight',color:'#5d428c',label:'No'})!;
  const selection:FlowSelection={kind:'edge',ids:[first.id,second.id]};
  assert.equal(applyFlowSelectionPatch(model,selection,{width:6,dash:'dashed',from:c.id,to:a.id,fill:'#000000'}),true);
  assert.equal(first.width,6);assert.equal(second.width,6);assert.equal(first.dash,'dashed');assert.equal(second.dash,'dashed');
  assert.equal(first.route,'curve');assert.equal(second.route,'straight');assert.equal(first.color,'#ff5900');assert.equal(second.color,'#5d428c');
  assert.equal(first.label,'Sí');assert.equal(second.label,'No');assert.equal(first.from,a.id);assert.equal(second.to,c.id);assert.ok(!('fill' in first));
});

test('carriles se editan individualmente o en lote y conservan atributos mixtos',()=>{
  const model=createFlowModel(),a=addFlowLane(model),b=addFlowLane(model);a.title='Cliente';b.title='Ventas';a.fill='#ffffff';b.fill='#f3eef9';
  const selection:FlowSelection={kind:'lane',ids:[a.id,b.id]};
  assert.equal(applyFlowSelectionPatch(model,selection,{stroke:'#ff5900',text:'wrongkind'}),true);
  assert.equal(a.stroke,'#ff5900');assert.equal(b.stroke,'#ff5900');assert.equal(a.title,'Cliente');assert.equal(b.title,'Ventas');
  assert.equal(a.fill,'#ffffff');assert.equal(b.fill,'#f3eef9');assert.ok(!('text' in a));
});

test('eliminar nodos seleccionados borra solo esos nodos y sus conexiones incidentes',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'process'),c=addFlowNode(model,'process'),d=addFlowNode(model,'process');
  addFlowEdge(model,a.id,b.id);addFlowEdge(model,b.id,c.id);const remain=addFlowEdge(model,c.id,d.id)!;
  const lane=addFlowLane(model);
  assert.equal(removeFlowSelection(model,{kind:'node',ids:[a.id,b.id,'missing']}),true);
  assert.deepEqual(model.nodes.map(node=>node.id),[c.id,d.id]);assert.deepEqual(model.edges,[remain]);assert.deepEqual(model.lanes,[lane]);
});

test('eliminar líneas y carriles no borra nodos, otras líneas ni el contenido de carriles',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'process');
  const first=addFlowEdge(model,a.id,b.id)!,second=addFlowEdge(model,b.id,a.id)!,lane=addFlowLane(model);
  assert.equal(removeFlowSelection(model,{kind:'edge',ids:[first.id]}),true);assert.deepEqual(model.edges,[second]);assert.deepEqual(model.nodes,[a,b]);
  assert.equal(removeFlowSelection(model,{kind:'lane',ids:[lane.id]}),true);assert.equal(model.lanes.length,0);assert.deepEqual(model.nodes,[a,b]);assert.deepEqual(model.edges,[second]);
  assert.equal(removeFlowSelection(model,null),false);assert.equal(removeFlowSelection(model,{kind:'edge',ids:['missing']}),false);
});
