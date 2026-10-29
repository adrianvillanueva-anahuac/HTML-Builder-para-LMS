import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,normalizeFlowModel,addFlowNode,addFlowEdge,addFlowLane,flowNodeTypes} from './flow-model';
import {flowNodeTextState,flowNodeTextBox} from './flow-node-text';
import {duplicateFlowSelection,applyFlowSelectionPatch,removeFlowSelection} from './flow-selection';
import {renderFlowSVG} from './flow-svg';
test('all figure labels have safe independent rich text and preserve it across a project roundtrip',()=>{
 const model=createFlowModel();
 for(const {type}of flowNodeTypes.filter(item=>item.type!=='image')){const node=addFlowNode(model,type);node.text='Hola';node.textAlign='right';node.textRuns=[{text:'Hola',bold:true,italic:true,underline:true,font:'Zilla Slab',color:'#ff5900',href:'https://example.com/'}];}
 const saved=normalizeFlowModel(JSON.parse(JSON.stringify(model)));assert.deepEqual(saved,model);
 const svg=renderFlowSVG(saved);assert.match(svg,/font-weight="700"/);assert.match(svg,/font-style="italic"/);assert.match(svg,/text-decoration="underline"/);assert.match(svg,/text-anchor="end"/);assert.match(svg,/rel="noopener noreferrer"/);assert.ok(!/foreignObject|contenteditable|fde-rich|fde-node-ports|data-flow-port|tabindex/.test(svg));
});
test('legacy plain labels keep their text and old colors; stale rich runs never replace a new label',()=>{
 const node=normalizeFlowModel({nodes:[{id:'n',text:'Anterior',textColor:'#ff5900'}]}).nodes[0];assert.equal(flowNodeTextState(node).runs[0].text,'Anterior');assert.equal(flowNodeTextState(node).align,'center');
 node.textRuns=[{text:'Antiguo',bold:true,italic:false,underline:false,font:'Roboto',color:'#5d428c',href:''}];node.text='Nuevo';assert.equal(flowNodeTextState(node).runs[0].text,'Nuevo');assert.equal(flowNodeTextState(node).runs[0].color,'');
});
test('figure text boxes remain inscribed in each silhouette',()=>{
 const model=createFlowModel();for(const {type}of flowNodeTypes){const node=addFlowNode(model,type),box=flowNodeTextBox(node);assert.ok(box.width>0&&box.height>0);assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=node.width&&box.y+box.height<=node.height);}
});
test('rich figure normalization escapes markup, rejects active links and bounds payloads',()=>{
 const model=normalizeFlowModel({nodes:[{id:'n',text:'<img onerror=evil>',textRuns:[{text:'<img onerror=evil>',href:'javascript:evil()',font:'evil',color:'url(evil)',bold:true}],textAlign:'evil'}]});assert.equal(model.nodes[0].textRuns![0].href,'');assert.equal(model.nodes[0].textRuns![0].font,'Roboto');assert.equal(model.nodes[0].textAlign,'center');assert.ok(!renderFlowSVG(model).includes('<img'));
});
test('rollover copies nodes lanes and connectors with unique IDs and independently editable state',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'circle',500,300),lane=addFlowLane(model),edge=addFlowEdge(model,a.id,b.id)!;
 applyFlowSelectionPatch(model,{kind:'node',ids:[a.id]},{text:'Hola',textAlign:'left',textRuns:[{text:'Hola',bold:true}]});
 const nodeCopy=duplicateFlowSelection(model,{kind:'node',ids:[a.id]})!,copy=model.nodes.find(node=>node.id===nodeCopy.ids[0])!;assert.equal(copy.text,'Hola');assert.notEqual(copy.textRuns,a.textRuns);copy.textRuns![0].text='Otro';assert.equal(a.textRuns![0].text,'Hola');
 const laneCopy=duplicateFlowSelection(model,{kind:'lane',ids:[lane.id]})!;assert.equal(model.lanes.length,2);assert.notEqual(laneCopy.ids[0],lane.id);
 const edgeCopy=duplicateFlowSelection(model,{kind:'edge',ids:[edge.id]})!;assert.equal(model.edges.length,2);assert.notEqual(edgeCopy.ids[0],edge.id);assert.equal(model.edges[1].from,a.id);
 removeFlowSelection(model,laneCopy);assert.equal(model.lanes.length,1);assert.equal(model.nodes.length,3);removeFlowSelection(model,edgeCopy);assert.equal(model.edges.length,1);
 const ids=[...model.nodes,...model.lanes,...model.edges].map(item=>item.id);assert.equal(new Set(ids).size,ids.length);
});
test('interactive figures expose hover ports without fixing connect mode; publications never include ports',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'circle');const svg=renderFlowSVG(model,{interactive:true});assert.equal((svg.match(/data-flow-port=/g)||[]).length,8);assert.ok(!svg.includes('fde-node-ports is-visible'));assert.ok(!renderFlowSVG(model).includes('data-flow-port'));
 const editing=renderFlowSVG(model,{interactive:true,textEditingId:a.id});assert.ok(!editing.includes(`data-flow-port="${a.id}"`));assert.ok(editing.includes(`data-flow-port="${b.id}"`));
});
